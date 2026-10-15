import { MockLanguageModelV4 } from "ai/test";
import { expect, it } from "vitest";
import { NodeVoltAgentObservability, WebSocketEventEmitter } from "../observability";
import type { ObservabilityWebSocketEvent } from "../observability/types";
import { Agent } from "./agent";

type StreamPart = Awaited<
  ReturnType<MockLanguageModelV4["doStream"]>
>["stream"] extends ReadableStream<infer Part>
  ? Part
  : never;

it("ends model loop and provider attempt spans when a provider ignores stream cancellation", async () => {
  const observability = new NodeVoltAgentObservability();
  const events: ObservabilityWebSocketEvent[] = [];
  const unsubscribe = WebSocketEventEmitter.getInstance().onWebSocketEvent((event) =>
    events.push(event),
  );
  const abort = new AbortController();
  let provider: ReadableStreamDefaultController<StreamPart> | undefined;
  const agent = new Agent({
    name: "abort-span-regression",
    memory: false,
    observability,
    model: new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream<StreamPart>({
          start(controller) {
            provider = controller;
            controller.enqueue({ type: "stream-start", warnings: [] });
            controller.enqueue({ type: "text-start", id: "text" });
            controller.enqueue({ type: "text-delta", id: "text", delta: "Partial reply" });
            // Remain open to simulate a provider that ignores AbortSignal.
          },
        }),
      }),
    }),
  });
  try {
    const result = await agent.streamText("Start", { abortSignal: abort.signal });
    const reader = result.textStream.getReader();
    expect((await reader.read()).value).toBe("Partial reply");
    abort.abort();
    reader.releaseLock();
    const spans = events
      .filter((event) => event.type === "span:end")
      .map((event) => event.span)
      .filter((span) => span.attributes["llm.operation"] === "streamText");
    expect(spans).toHaveLength(2);
    expect(
      spans.every((span) => span.endTime && span.attributes["llm.state"] === "cancelled"),
    ).toBe(true);
  } finally {
    provider?.close();
    unsubscribe();
    await observability.shutdown();
  }
});
