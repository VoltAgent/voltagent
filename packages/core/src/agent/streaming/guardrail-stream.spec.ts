import type { LanguageModelUsage } from "ai";
import { MockLanguageModelV2, simulateReadableStream } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Agent } from "../agent";
import { normalizeOutputGuardrailList } from "../guardrail";
import type { VoltAgentTextStreamPart } from "../subagent/types";
import { createTestAgent } from "../test-utils";
import type { OutputGuardrail } from "../types";
import type { AgentEvalOperationType, OperationContext } from "../types";
import { createAsyncIterableReadable, createGuardrailPipeline } from "./guardrail-stream";

const createMockSpan = () => ({
  addEvent: vi.fn(),
  setStatus: vi.fn(),
  setAttribute: vi.fn(),
  end: vi.fn(),
  recordException: vi.fn(),
});

const createOperationContext = (): OperationContext => {
  const traceContext = {
    createChildSpan: vi.fn(() => createMockSpan()),
    withSpan: vi.fn(async (_span: any, fn: () => Promise<any> | any) => fn()),
    setOutput: vi.fn(),
    end: vi.fn(),
    getRootSpan: vi.fn(() => createMockSpan()),
  };

  return {
    operationId: "op-ctx",
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    traceContext: traceContext as unknown as OperationContext["traceContext"],
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    abortController: new AbortController(),
    startTime: new Date(),
  } as OperationContext;
};

describe("Output guardrail streaming integration", () => {
  let operationContext: OperationContext;
  const agent = createTestAgent();

  beforeEach(() => {
    operationContext = createOperationContext();
  });

  const buildPipeline = (
    parts: VoltAgentTextStreamPart[],
    guardrail: OutputGuardrail<string> | OutputGuardrail<string>[],
  ) => {
    async function* baseFullStream() {
      for (const part of parts) {
        yield part;
      }
    }

    const textChunks = parts
      .filter((part) => part.type === "text-delta")
      .map((part) => (part as any).delta ?? (part as any).text ?? "");

    const baseTextStream = createAsyncIterableReadable<string>(async (controller) => {
      for (const chunk of textChunks) {
        controller.enqueue(String(chunk));
      }
      controller.close();
    });

    const guardrails = normalizeOutputGuardrailList(
      Array.isArray(guardrail) ? guardrail : [guardrail],
    );

    return createGuardrailPipeline(baseFullStream(), baseTextStream, {
      guardrails,
      agent,
      operationContext,
      operation: "streamText" as AgentEvalOperationType,
    });
  };

  it("streams sanitized text deltas incrementally", async () => {
    const parts: VoltAgentTextStreamPart[] = [
      { type: "text-start", id: "text-1" } as VoltAgentTextStreamPart,
      { type: "text-delta", id: "text-1", delta: "Hesap numarası 1234567890 " } as any,
      { type: "text-delta", id: "text-1", delta: "gizli tutulmalıdır." } as any,
      { type: "text-end", id: "text-1" } as VoltAgentTextStreamPart,
      { type: "finish", finishReason: "stop" } as any,
    ];

    const pipeline = buildPipeline(parts, {
      id: "redact-digits",
      name: "Redact Digits",
      handler: async ({ output }) => {
        if (typeof output !== "string") {
          return { pass: true } as const;
        }
        return {
          pass: true,
          action: "modify",
          modifiedOutput: output.replace(/\d+/g, "[redacted]"),
        } as const;
      },
      streamHandler: ({ part }) => {
        if (part.type !== "text-delta") {
          return part;
        }
        const text = part.text ?? (part as { delta?: string }).delta ?? "";
        const redacted = text.replace(/\d+/g, "[redacted]");
        if (redacted === text) {
          return part;
        }
        return {
          ...part,
          text: redacted,
          delta: redacted,
        };
      },
    });

    const reader = pipeline.textStream.getReader();
    let streamed = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      streamed += value ?? "";
    }
    reader.releaseLock();

    await pipeline.finalizePromise;
    const finalText = pipeline.runner?.getSanitizedText() ?? "";

    expect(streamed).toContain("[redacted]");
    expect(finalText).toContain("[redacted]");
  });

  it("replays sanitized data through the regenerated UI stream", async () => {
    const parts: VoltAgentTextStreamPart[] = [
      { type: "start" } as VoltAgentTextStreamPart,
      { type: "text-start", id: "text-42" } as VoltAgentTextStreamPart,
      { type: "text-delta", id: "text-42", delta: "Kredi kartı 5555444433332222 " } as any,
      { type: "text-delta", id: "text-42", delta: "iptal edildi." } as any,
      { type: "text-end", id: "text-42" } as VoltAgentTextStreamPart,
      {
        type: "finish",
        finishReason: "stop",
        totalUsage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      } as any,
    ];

    const pipeline = buildPipeline(parts, {
      id: "redact-card",
      name: "Redact Card",
      handler: async ({ output }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: (output as string).replace(/\d+/g, "[redacted]"),
      }),
      streamHandler: ({ part }) => {
        if (part.type !== "text-delta") {
          return part;
        }
        const delta = (part.text ?? (part as { delta?: string }).delta ?? "").replace(
          /\d+/g,
          "[redacted]",
        );
        return {
          ...part,
          text: delta,
          delta,
        };
      },
    });

    const uiStream = pipeline.createUIStream();
    const collected: Array<{ type: string; delta?: string }> = [];

    for await (const chunk of uiStream) {
      collected.push(chunk as { type: string; delta?: string });
    }

    await pipeline.finalizePromise;

    const text = collected
      .filter((chunk) => chunk.type === "text-delta")
      .map((chunk) => chunk.delta ?? "")
      .join("");

    expect(text).toContain("[redacted]");
    expect(collected.some((chunk) => chunk.type === "finish")).toBe(true);
  });

  it("processes multiple guardrails alongside tool events without losing finish", async () => {
    const usage: LanguageModelUsage = { inputTokens: 2, outputTokens: 4, totalTokens: 6 };
    const parts: VoltAgentTextStreamPart[] = [
      { type: "start" } as VoltAgentTextStreamPart,
      {
        type: "tool-input-start",
        id: "tool-1",
        toolName: "lookup",
      } as VoltAgentTextStreamPart,
      {
        type: "tool-input-delta",
        id: "tool-1",
        delta: "lookup account",
      } as VoltAgentTextStreamPart,
      { type: "tool-input-end", id: "tool-1" } as VoltAgentTextStreamPart,
      {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "lookup",
        input: { query: "account status" },
      } as VoltAgentTextStreamPart,
      {
        type: "tool-result",
        toolCallId: "tool-1",
        output: { type: "tool-result", content: "ok" },
      } as VoltAgentTextStreamPart,
      { type: "text-start", id: "text-7" } as VoltAgentTextStreamPart,
      { type: "text-delta", id: "text-7", delta: "Card number 4242424242424242 " } as any,
      { type: "text-delta", id: "text-7", delta: "is invalid." } as any,
      { type: "text-end", id: "text-7" } as VoltAgentTextStreamPart,
      {
        type: "finish",
        finishReason: "stop",
        totalUsage: usage,
        usage,
      } as any,
    ];

    const pipeline = buildPipeline(parts, [
      {
        id: "redact-card",
        name: "Redact Card",
        handler: async ({ output }) => ({
          pass: true,
          action: "modify",
          modifiedOutput: (output as string).replace(/\d+/g, "[redacted]"),
        }),
        streamHandler: ({ part }) => {
          if (part.type !== "text-delta") {
            return part;
          }
          const text = part.text ?? (part as { delta?: string }).delta ?? "";
          const redacted = text.replace(/\d+/g, "[redacted]");
          return {
            ...part,
            text: redacted,
            delta: redacted,
          };
        },
      },
      {
        id: "emphasize",
        name: "Emphasize Invalid",
        handler: async ({ output }) => ({
          pass: true,
          action: "modify",
          modifiedOutput: `${output as string} [checked]`,
        }),
        streamHandler: ({ part, state }) => {
          if (part.type !== "text-delta") {
            return part;
          }
          state.count = (state.count ?? 0) + 1;
          const text = part.text ?? (part as { delta?: string }).delta ?? "";
          const emphasized = text.replace(/invalid/gi, "INVALID");
          return {
            ...part,
            text: emphasized,
            delta: emphasized,
          };
        },
      },
    ]);

    const emitted: VoltAgentTextStreamPart[] = [];
    for await (const chunk of pipeline.fullStream) {
      emitted.push(chunk as VoltAgentTextStreamPart);
    }

    await pipeline.finalizePromise;

    expect(emitted.filter((chunk) => chunk.type === "tool-result")).toHaveLength(1);
    expect(emitted.some((chunk) => chunk.type === "finish")).toBe(true);

    const sanitizedText = pipeline.runner?.getSanitizedText() ?? "";
    expect(sanitizedText).toContain("Card number [redacted] is INVALID.");
    expect(sanitizedText.trim().endsWith("[checked]")).toBe(true);
  });

  it("closes UI stream with guardrails applied", async () => {
    const usage: LanguageModelUsage = { inputTokens: 1, outputTokens: 2, totalTokens: 3 };

    const agent = new Agent({
      name: "guardrail-ui",
      model: new MockLanguageModelV2({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-start", id: "text-1" },
              { type: "text-delta", id: "text-1", delta: "Hesap numarası 1234 " },
              { type: "text-delta", id: "text-1", delta: "kapatıldı." },
              { type: "text-end", id: "text-1" },
              { type: "finish", finishReason: "stop", totalUsage: usage, usage } as any,
            ],
          }),
        }),
      }),
      outputGuardrails: [
        {
          id: "redact-digits",
          name: "Redact Digits",
          handler: async ({ output }) => ({
            pass: true,
            action: "modify",
            modifiedOutput: (output as string).replace(/\d+/g, "[redacted]"),
          }),
          streamHandler: ({ part }) => {
            if (part.type !== "text-delta") {
              return part;
            }
            const delta = (part.text ?? (part as { delta?: string }).delta ?? "").replace(
              /\d+/g,
              "[redacted]",
            );
            return {
              ...part,
              delta,
            };
          },
        },
      ],
    });

    const result = await agent.streamText("hello");
    const sanitizedChunks: string[] = [];
    for await (const chunk of result.textStream) {
      sanitizedChunks.push(chunk);
    }
    const sanitizedText = sanitizedChunks.join("");
    expect(sanitizedText).toContain("[redacted]");
    const uiStream = result.toUIMessageStream();
    const chunks: Array<{ type: string }> = [];

    for await (const chunk of uiStream) {
      chunks.push(chunk as any);
    }

    expect(chunks.some((chunk) => chunk.type === "finish")).toBe(true);
  });

  it("baseline agent without guardrails resolves text stream", async () => {
    const agent = new Agent({
      name: "baseline",
      model: new MockLanguageModelV2({
        doStream: async () => ({
          stream: simulateReadableStream({
            chunks: [
              { type: "text-start", id: "text-1" },
              { type: "text-delta", id: "text-1", delta: "hello" },
              { type: "text-end", id: "text-1" },
              {
                type: "finish",
                finishReason: "stop",
                usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
                totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
              } as any,
            ],
          }),
        }),
      }),
    });

    const result = await agent.streamText("hi");
    const collected: string[] = [];
    for await (const chunk of result.textStream) {
      collected.push(chunk);
    }
    expect(collected.join("")).toBe("hello");
  });
});
