import * as ai from "ai";
import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import { applySummarization } from "./apply-summarization";
import type { OperationContext } from "./types";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

const createMessage = (role: UIMessage["role"], text: string, id: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

const createTraceContext = () => ({
  createChildSpan: vi.fn(() => ({})),
  withSpan: vi.fn(async (_span: unknown, fn: () => Promise<unknown> | unknown) => fn()),
  endChildSpan: vi.fn(),
});

const createOperationContext = (operationId: string): OperationContext => {
  const traceContext = createTraceContext();
  return {
    operationId,
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    traceContext: traceContext as unknown as OperationContext["traceContext"],
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as OperationContext["logger"],
    abortController: new AbortController(),
    startTime: new Date(),
  } as OperationContext;
};

const createAgentStub = () => ({
  getMemory: () => false,
});

const resolveModel = async (_value: unknown, _context: OperationContext): Promise<any> => ({});

describe("applySummarization", () => {
  it("returns messages when summarization is disabled", async () => {
    const messages = [createMessage("user", "hello", "msg-1")];
    const oc = createOperationContext("op-disabled");

    const result = await applySummarization({
      messages,
      operationContext: oc,
      summarization: { enabled: false },
      model: {} as any,
      resolveModel,
      agent: createAgentStub(),
    });

    expect(result).toEqual(messages);
    expect(vi.mocked(ai.generateText)).not.toHaveBeenCalled();
  });

  it("summarizes older messages and keeps the tail", async () => {
    vi.mocked(ai.generateText).mockResolvedValue({
      text: "Summary text",
    } as any);

    const messages = [
      createMessage("user", "Hello", "msg-1"),
      createMessage("assistant", "Hi there", "msg-2"),
      createMessage("user", "Need help", "msg-3"),
    ];
    const oc = createOperationContext("op-summary");

    const result = await applySummarization({
      messages,
      operationContext: oc,
      summarization: {
        enabled: true,
        triggerTokens: 0,
        keepMessages: 1,
        maxOutputTokens: 200,
      },
      model: {} as any,
      resolveModel,
      agent: createAgentStub(),
    });

    expect(vi.mocked(ai.generateText)).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    const summaryText = (result[0].parts[0] as any).text as string;
    expect(summaryText).toContain("<agent_summary>");
    expect(summaryText).toContain("Summary text");
    expect(result[1]).toEqual(messages[messages.length - 1]);
  });
});
