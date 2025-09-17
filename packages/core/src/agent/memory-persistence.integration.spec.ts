import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationBuffer } from "./conversation-buffer";
import { MemoryPersistQueue } from "./memory-persist-queue";
import type { OperationContext } from "./types";

type LoggerLike = {
  debug: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
};

const createLogger = (): LoggerLike => {
  const logger: Partial<LoggerLike> = {
    debug: vi.fn(),
    error: vi.fn(),
  };
  logger.child = vi.fn().mockReturnValue(logger);
  return logger as LoggerLike;
};

const createOperationContext = (logger: LoggerLike): OperationContext =>
  ({
    operationId: "op-test",
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    logger,
    userId: "user-1",
    conversationId: "conv-1",
    abortController: new AbortController(),
    startTime: new Date(),
    traceContext: {
      withSpan: async <T>(_span: unknown, fn: () => Promise<T>) => fn(),
      createChildSpan: () => ({}),
      endChildSpan: () => {},
      getRootSpan: () => ({ setAttribute: () => {} }),
      setOutput: () => {},
      setInstructions: () => {},
      setUsage: () => {},
      end: () => {},
    } as any,
  }) as OperationContext;

describe("Conversation persistence integration", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("persists OpenAI-style tool call/result sequence as a single assistant message", async () => {
    const logger = createLogger();
    const memoryManager = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
    };

    const buffer = new ConversationBuffer(undefined, logger as any);
    const queue = new MemoryPersistQueue(memoryManager as any, {
      debounceMs: 0,
      logger: logger as any,
    });
    const oc = createOperationContext(logger);

    const assistantToolCall: ModelMessage = {
      id: "assistant-call",
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "getWeather",
          input: { location: "Berlin" },
          providerExecuted: false,
        },
      ],
    };

    const toolResult: ModelMessage = {
      id: "assistant-call",
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call-1",
          toolName: "getWeather",
          output: { temperature: "21°C" },
        },
      ],
    };

    const assistantFollowUp: ModelMessage = {
      id: "assistant-call",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "It is currently 21°C in Berlin.",
        },
      ],
    };

    buffer.addModelMessages([assistantToolCall], "response");
    buffer.addModelMessages([toolResult], "response");
    buffer.addModelMessages([assistantFollowUp], "response");

    await queue.flush(buffer, oc);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
    const savedMessage = memoryManager.saveMessage.mock.calls[0][1] as UIMessage;

    expect(savedMessage.role).toBe("assistant");
    expect(savedMessage.parts.map((part: any) => part.type)).toEqual([
      "tool-getWeather",
      "step-start",
      "text",
    ]);

    const toolPart = savedMessage.parts[0] as any;
    expect(toolPart).toMatchObject({
      toolCallId: "call-1",
      state: "output-available",
      output: { temperature: "21°C" },
      providerExecuted: false,
    });

    await queue.flush(buffer, oc);
    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
  });

  it("tracks provider-executed tool flows from Anthropic-style responses", async () => {
    const logger = createLogger();
    const memoryManager = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
    };

    const buffer = new ConversationBuffer(undefined, logger as any);
    const queue = new MemoryPersistQueue(memoryManager as any, {
      debounceMs: 0,
      logger: logger as any,
    });
    const oc = createOperationContext(logger);

    const anthropicToolCall: ModelMessage = {
      id: "anthropic-turn",
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "anthropic-call",
          toolName: "search",
          input: { query: "latest climate news" },
          providerExecuted: true,
        },
      ],
    };

    const anthropicToolResult: ModelMessage = {
      id: "anthropic-turn",
      role: "assistant",
      content: [
        {
          type: "tool-result",
          toolCallId: "anthropic-call",
          toolName: "search",
          output: { results: ["Result A", "Result B"] },
        },
      ],
    };

    const anthropicText: ModelMessage = {
      id: "anthropic-turn",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Here are the latest climate updates I found.",
        },
      ],
    };

    buffer.addModelMessages([anthropicToolCall], "response");
    buffer.addModelMessages([anthropicToolResult], "response");
    buffer.addModelMessages([anthropicText], "response");

    await queue.flush(buffer, oc);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
    const savedMessage = memoryManager.saveMessage.mock.calls[0][1] as UIMessage;

    expect(savedMessage.role).toBe("assistant");
    expect(savedMessage.parts.map((part: any) => part.type)).toEqual([
      "tool-search",
      "step-start",
      "text",
    ]);

    const toolPart = savedMessage.parts[0] as any;
    expect(toolPart).toMatchObject({
      toolCallId: "anthropic-call",
      state: "output-available",
      providerExecuted: true,
      output: { results: ["Result A", "Result B"] },
    });
  });
});
