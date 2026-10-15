import { safeStringify } from "@voltagent/internal";
import { APICallError } from "ai";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";

export type ModelCall = Parameters<MockLanguageModelV4["doStream"]>[0];
type StreamPart = Awaited<
  ReturnType<MockLanguageModelV4["doStream"]>
>["stream"] extends ReadableStream<infer Part>
  ? Part
  : never;
export type Reply = {
  text?: string;
  reasoning?: string;
  calls?: Array<{ name: string; input: unknown }>;
  delay?: number;
};
export const usage = {
  inputTokens: { total: 24, noCache: 16, cacheRead: 8, cacheWrite: 0 },
  outputTokens: { total: 32, text: 28, reasoning: 4 },
};

export function userText({ prompt }: ModelCall): string {
  const last = prompt.findLast((message) => message.role === "user");
  return last?.role === "user"
    ? last.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ")
    : "";
}

/** Only results from the current user turn, so reruns and conversation history are independent. */
export function results({ prompt }: ModelCall) {
  const start = prompt.findLastIndex((message) => message.role === "user");
  return prompt
    .slice(start + 1)
    .flatMap((message) =>
      message.role === "tool" || message.role === "assistant"
        ? message.content.filter((part) => part.type === "tool-result")
        : [],
    );
}

export const providerFailure = (retryable = false) =>
  new APICallError({
    message: "Demo provider unavailable (intentional)",
    url: "https://demo.invalid/model",
    requestBodyValues: {},
    statusCode: 503,
    isRetryable: retryable,
  });

/** Real AI SDK protocol, deterministic model responses. No provider credentials or network. */
export function demoModel(id: string, respond: (call: ModelCall) => Reply | Promise<Reply>) {
  return new MockLanguageModelV4({
    modelId: id,
    doGenerate: async (call) => {
      const reply = await respond(call);
      return {
        content: reply.calls?.length
          ? reply.calls.map((tool) => ({
              type: "tool-call" as const,
              toolCallId: crypto.randomUUID(),
              toolName: tool.name,
              input: safeStringify(tool.input),
            }))
          : [{ type: "text" as const, text: reply.text ?? "Demo complete." }],
        finishReason: {
          unified: reply.calls?.length ? ("tool-calls" as const) : ("stop" as const),
          raw: "demo",
        },
        usage,
        warnings: [],
      };
    },
    doStream: async (call) => {
      const reply = await respond(call);
      const chunks: StreamPart[] = [{ type: "stream-start", warnings: [] }];
      if (reply.reasoning)
        chunks.push(
          { type: "reasoning-start", id: "reasoning" },
          { type: "reasoning-delta", id: "reasoning", delta: reply.reasoning },
          { type: "reasoning-end", id: "reasoning" },
        );
      if (reply.calls?.length) {
        for (const tool of reply.calls)
          chunks.push({
            type: "tool-call",
            toolCallId: crypto.randomUUID(),
            toolName: tool.name,
            input: safeStringify(tool.input),
          });
      } else {
        chunks.push({ type: "text-start", id: "answer" });
        for (const delta of (reply.text ?? "Demo complete.").match(
          /.{1,48}(?:\s|$)|[\s\S]{1,48}/g,
        ) ?? [])
          chunks.push({ type: "text-delta", id: "answer", delta });
        chunks.push({ type: "text-end", id: "answer" });
      }
      chunks.push({
        type: "finish",
        finishReason: { unified: reply.calls?.length ? "tool-calls" : "stop", raw: "demo" },
        usage,
      });
      return {
        stream: simulateReadableStream<StreamPart>({ chunks, chunkDelayInMs: reply.delay ?? 25 }),
      };
    },
  });
}

export function sequenceModel(
  id: string,
  rounds: Reply["calls"][],
  answer = "Tools completed. Inspect their input, output and timing.",
) {
  return demoModel(id, (call) => {
    const done = results(call).length;
    let consumed = 0;
    for (const calls of rounds) {
      consumed += calls?.length ?? 0;
      if (done < consumed) return { calls };
    }
    const recorded = results(call).map((part) => ({ tool: part.toolName, output: part.output }));
    const preview = safeStringify(recorded);
    return {
      text:
        preview.length > 800
          ? `${answer}\n\n${recorded.length} tool result(s) recorded. Open the tool card to inspect the complete output.`
          : `${answer}\n\nRecorded tool results:\n\n\`\`\`json\n${safeStringify(recorded, { indentation: 2 })}\n\`\`\``,
    };
  });
}

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
