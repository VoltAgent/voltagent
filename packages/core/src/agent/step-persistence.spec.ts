import type { Logger } from "@voltagent/internal";
import type { StepResult, ToolSet } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Agent } from "./agent";
import { ConversationBuffer } from "./conversation-buffer";
import { MemoryPersistQueue, type MemoryPersistQueueMemoryManager } from "./memory-persist-queue";
import type { AgentConversationPersistenceOptions } from "./types";

type QueueMock = {
  scheduleSave: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
};

type StepEventInput = Pick<StepResult<ToolSet>, "content" | "response">;

const createOperationContext = () =>
  ({
    operationId: "op-step-persist",
    systemContext: new Map<string | symbol, unknown>(),
    logger: createLogger(),
    abortController: new AbortController(),
    userId: "user-1",
    conversationId: "conv-1",
  }) as any;

const createLogger = () => {
  const logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } satisfies Logger;

  logger.child.mockImplementation(() => logger);
  return logger;
};

const toStepResult = (event: StepEventInput): StepResult<ToolSet> => event as StepResult<ToolSet>;

const createStepEvent = (content: StepEventInput["content"]) =>
  toStepResult({
    content,
    response: {
      messages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "checkpoint" }],
        },
      ],
    },
  });

const createHarness = (overrides: AgentConversationPersistenceOptions) => {
  const agent = new Agent({
    name: "step-persistence-agent",
    instructions: "Test",
    model: "openai/gpt-4o-mini",
  });

  const queue: QueueMock = {
    scheduleSave: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };

  const buffer = {
    addModelMessages: vi.fn(),
  };

  const oc = createOperationContext();

  const persistence = {
    mode: "step" as const,
    debounceMs: 200,
    flushOnToolResult: true,
    ...overrides,
  };

  vi.spyOn(agent as any, "getConversationBuffer").mockReturnValue(buffer);
  vi.spyOn(agent as any, "getMemoryPersistQueue").mockReturnValue(queue);
  vi.spyOn(agent as any, "getConversationPersistenceOptionsForContext").mockReturnValue(
    persistence,
  );
  const recordStepResultsSpy = vi
    .spyOn(agent as any, "recordStepResults")
    .mockResolvedValue(undefined);

  const handler = (
    agent as unknown as {
      createStepHandler: (
        operationContext: unknown,
        options?: unknown,
      ) => (event: StepResult<ToolSet>) => Promise<void>;
    }
  ).createStepHandler(oc, undefined);

  return {
    queue,
    oc,
    handler,
    recordStepResultsSpy,
  };
};

describe("Step-level persistence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules debounced persistence for non-tool steps in step mode", async () => {
    const { handler, queue, oc, recordStepResultsSpy } = createHarness({ mode: "step" });

    await handler(createStepEvent([{ type: "text", text: "hello" }]));

    expect(queue.scheduleSave).toHaveBeenCalledTimes(1);
    expect(queue.scheduleSave).toHaveBeenCalledWith(expect.anything(), oc);
    expect(queue.flush).not.toHaveBeenCalled();
    expect(recordStepResultsSpy).toHaveBeenCalledWith(undefined, oc, {
      awaitPersistence: false,
    });
  });

  it("flushes immediately when a tool result arrives in step mode", async () => {
    const { handler, queue, oc, recordStepResultsSpy } = createHarness({ mode: "step" });

    await handler(
      createStepEvent([
        {
          type: "tool-result",
          toolName: "search",
          toolCallId: "call-1",
          output: { ok: true },
        },
      ]),
    );

    expect(queue.flush).toHaveBeenCalledTimes(1);
    expect(queue.flush).toHaveBeenCalledWith(expect.anything(), oc);
    expect(queue.scheduleSave).not.toHaveBeenCalled();
    expect(recordStepResultsSpy).toHaveBeenCalledWith(undefined, oc, {
      awaitPersistence: true,
    });
  });

  it("keeps finish mode behavior without incremental checkpoints", async () => {
    const { handler, queue, recordStepResultsSpy } = createHarness({ mode: "finish" });

    await handler(createStepEvent([{ type: "text", text: "hello" }]));

    expect(queue.scheduleSave).not.toHaveBeenCalled();
    expect(queue.flush).not.toHaveBeenCalled();
    expect(recordStepResultsSpy).not.toHaveBeenCalled();
  });

  it("reuses assistant message id across step checkpoints after intermediate flushes", async () => {
    const agent = new Agent({
      name: "step-persistence-agent",
      instructions: "Test",
      model: "openai/gpt-4o-mini",
    });

    const oc = createOperationContext();
    const buffer = new ConversationBuffer();
    const saveMessage = vi.fn().mockResolvedValue(undefined);
    const memoryManager: MemoryPersistQueueMemoryManager = {
      saveMessage,
    };
    const queue = new MemoryPersistQueue(memoryManager, {
      debounceMs: 0,
      logger: oc.logger,
    });

    vi.spyOn(agent as any, "getConversationBuffer").mockReturnValue(buffer);
    vi.spyOn(agent as any, "getMemoryPersistQueue").mockReturnValue(queue);
    vi.spyOn(agent as any, "getConversationPersistenceOptionsForContext").mockReturnValue({
      mode: "step",
      debounceMs: 0,
      flushOnToolResult: true,
    });
    vi.spyOn(agent as any, "recordStepResults").mockResolvedValue(undefined);

    const handler = (
      agent as unknown as {
        createStepHandler: (
          operationContext: unknown,
          options?: unknown,
        ) => (event: StepResult<ToolSet>) => Promise<void>;
      }
    ).createStepHandler(oc, undefined);

    await handler(
      toStepResult({
        content: [
          {
            type: "tool-call",
            toolName: "calc",
            toolCallId: "call-1",
            input: { a: 2, b: 2 },
          },
        ],
        response: {
          messages: [
            {
              id: "m1",
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolName: "calc",
                  toolCallId: "call-1",
                  input: { a: 2, b: 2 },
                },
              ],
            },
          ],
        },
      }),
    );

    await handler(
      toStepResult({
        content: [
          {
            type: "tool-result",
            toolName: "calc",
            toolCallId: "call-1",
            output: { result: 4 },
          },
        ],
        response: {
          messages: [
            {
              id: "m2",
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolName: "calc",
                  toolCallId: "call-1",
                  input: { a: 2, b: 2 },
                },
                {
                  type: "tool-result",
                  toolName: "calc",
                  toolCallId: "call-1",
                  output: { result: 4 },
                },
              ],
            },
          ],
        },
      }),
    );

    await handler(
      toStepResult({
        content: [
          {
            type: "tool-result",
            toolName: "calc",
            toolCallId: "call-1",
            output: { result: 4 },
          },
          {
            type: "text",
            text: "The result is 4.",
          },
        ],
        response: {
          messages: [
            {
              id: "m3",
              role: "assistant",
              content: [
                {
                  type: "tool-call",
                  toolName: "calc",
                  toolCallId: "call-1",
                  input: { a: 2, b: 2 },
                },
                {
                  type: "tool-result",
                  toolName: "calc",
                  toolCallId: "call-1",
                  output: { result: 4 },
                },
                {
                  type: "text",
                  text: "The result is 4.",
                },
              ],
            },
          ],
        },
      }),
    );

    const persistedAssistantIds = saveMessage.mock.calls
      .map((call) => call[1])
      .filter((message) => message?.role === "assistant")
      .map((message) => message.id);

    expect(persistedAssistantIds.length).toBeGreaterThan(1);
    const stringAssistantIds = persistedAssistantIds.filter(
      (messageId): messageId is string =>
        typeof messageId === "string" && messageId.trim().length > 0,
    );
    expect(stringAssistantIds).toHaveLength(persistedAssistantIds.length);
    expect(new Set(stringAssistantIds).size).toBe(1);
  });
});
