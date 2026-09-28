import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UIMessage } from "ai";

import { ConversationBuffer } from "./conversation-buffer";
import {
  AGENT_METADATA_CONTEXT_KEY,
  MemoryPersistQueue,
  SUBAGENT_TOOL_CALL_METADATA_KEY,
} from "./memory-persist-queue";

const createOperationContext = () => ({
  userId: "user-1",
  conversationId: "conv-1",
  parentAgentId: undefined as string | undefined,
  systemContext: new Map<string | symbol, unknown>(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
});

const createMessage = (text: string): UIMessage => ({
  id: randomUUID(),
  role: "assistant",
  parts: [{ type: "text", text }],
});

const createToolMessage = (toolCallId: string): UIMessage => ({
  id: randomUUID(),
  role: "assistant",
  parts: [
    {
      type: "tool-test",
      toolCallId,
      state: "output-available",
      input: {},
      output: {},
      providerExecuted: true,
    } as any,
  ],
});

describe("MemoryPersistQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces saves and executes once per schedule window", async () => {
    const memoryManager = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages([createMessage("first")], false);

    const oc = createOperationContext();
    const queue = new MemoryPersistQueue(memoryManager, {
      debounceMs: 100,
      logger: oc.logger,
    });

    queue.scheduleSave(buffer, oc as any);
    queue.scheduleSave(buffer, oc as any);

    expect(memoryManager.saveMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
  });

  it("flush persists immediately and clears pending messages", async () => {
    const memoryManager = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages([createMessage("hello")], false);

    const oc = createOperationContext();
    const queue = new MemoryPersistQueue(memoryManager, {
      debounceMs: 100,
      logger: oc.logger,
    });

    queue.scheduleSave(buffer, oc as any);
    await queue.flush(buffer, oc as any);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps failed and unattempted messages pending for the next flush", async () => {
    const messages = [createMessage("first"), createMessage("second"), createMessage("third")];
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockResolvedValue(undefined)
        .mockRejectedValueOnce(new Error("storage unavailable")),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages(messages, false);
    const oc = createOperationContext();
    const queue = new MemoryPersistQueue(memoryManager, { logger: oc.logger });

    await expect(queue.flush(buffer, oc as any)).rejects.toThrow("storage unavailable");
    expect(memoryManager.saveMessage).toHaveBeenCalledWith(
      oc,
      expect.objectContaining({ id: messages[0].id }),
      oc.userId,
      oc.conversationId,
      { throwOnError: true },
    );
    expect(buffer.getPendingMessages().map(({ message }) => message.id)).toEqual(
      messages.map((message) => message.id),
    );

    await queue.flush(buffer, oc as any);
    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      messages[0].id,
      ...messages.map((message) => message.id),
    ]);
    expect(buffer.getPendingMessages()).toHaveLength(0);
  });

  it("retries only messages that were not saved before a later failure", async () => {
    const messages = [createMessage("first"), createMessage("second"), createMessage("third")];
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("storage unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages(messages, false);
    const oc = createOperationContext();
    const queue = new MemoryPersistQueue(memoryManager, { logger: oc.logger });

    await expect(queue.flush(buffer, oc as any)).rejects.toThrow("storage unavailable");
    expect(buffer.getPendingMessages().map(({ message }) => message.id)).toEqual([
      messages[1].id,
      messages[2].id,
    ]);

    await queue.flush(buffer, oc as any);
    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      messages[0].id,
      messages[1].id,
      messages[1].id,
      messages[2].id,
    ]);
  });

  it("keeps a message pending when it changes during an in-flight save", async () => {
    let finishSave!: () => void;
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              finishSave = resolve;
            }),
        )
        .mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages([createMessage("first")], false);
    const oc = createOperationContext();
    const queue = new MemoryPersistQueue(memoryManager, { logger: oc.logger });

    const firstFlush = queue.flush(buffer, oc as any);
    await Promise.resolve();
    await Promise.resolve();
    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
    buffer.addMetadataToLastAssistantMessage({ updated: true });
    finishSave();
    await firstFlush;

    expect(buffer.getPendingMessages()).toHaveLength(1);
    await queue.flush(buffer, oc as any);
    expect(memoryManager.saveMessage.mock.calls[1][1].metadata).toMatchObject({ updated: true });
    expect(buffer.getPendingMessages()).toHaveLength(0);
  });

  it("adds subagent metadata before persisting when parentAgentId is present", async () => {
    const memoryManager = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages([createMessage("subagent output")], false);

    const oc = createOperationContext();
    oc.parentAgentId = "supervisor-1";
    oc.systemContext.set(AGENT_METADATA_CONTEXT_KEY, {
      agentId: "agent-123",
      agentName: "Researcher",
    });

    const queue = new MemoryPersistQueue(memoryManager, {
      debounceMs: 0,
      logger: oc.logger,
    });

    await queue.flush(buffer, oc as any);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
    const savedMessage = memoryManager.saveMessage.mock.calls[0][1];
    expect(savedMessage.metadata).toMatchObject({
      subAgentId: "agent-123",
      subAgentName: "Researcher",
    });
  });

  it("annotates messages using forwarded tool metadata when supervisor saves history", async () => {
    const memoryManager = {
      saveMessage: vi.fn().mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    const toolCallId = "call-123";
    buffer.ingestUIMessages([createToolMessage(toolCallId)], false);

    const oc = createOperationContext();
    const toolMap = new Map<string, { agentId: string; agentName: string }>();
    toolMap.set(toolCallId, { agentId: "formatter-1", agentName: "Formatter" });
    oc.systemContext.set(SUBAGENT_TOOL_CALL_METADATA_KEY, toolMap);

    const queue = new MemoryPersistQueue(memoryManager, {
      debounceMs: 0,
      logger: oc.logger,
    });

    await queue.flush(buffer, oc as any);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
    const savedMessage = memoryManager.saveMessage.mock.calls[0][1];
    expect(savedMessage.metadata).toMatchObject({
      subAgentId: "formatter-1",
      subAgentName: "Formatter",
    });
  });
});
