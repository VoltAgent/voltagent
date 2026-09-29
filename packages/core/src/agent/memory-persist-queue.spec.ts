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

  it("retries messages from a failed operation when the next operation flushes", async () => {
    const oldMessage = createMessage("previous turn");
    const newMessage = createMessage("next turn");
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error("storage unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const oldBuffer = new ConversationBuffer();
    oldBuffer.ingestUIMessages([oldMessage], false);
    const oldContext = createOperationContext();

    await expect(
      new MemoryPersistQueue(memoryManager).flush(oldBuffer, oldContext as any),
    ).rejects.toThrow("storage unavailable");

    const newBuffer = new ConversationBuffer();
    newBuffer.ingestUIMessages([newMessage], false);
    const newContext = createOperationContext();
    await new MemoryPersistQueue(memoryManager).flush(newBuffer, newContext as any);

    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      oldMessage.id,
      oldMessage.id,
      newMessage.id,
    ]);
    expect(memoryManager.saveMessage.mock.calls[1][0]).toBe(oldContext);
    expect(oldBuffer.getPendingMessages()).toHaveLength(0);
    expect(newBuffer.getPendingMessages()).toHaveLength(0);
  });

  it("handles a failed debounced save and retries it on a later operation", async () => {
    const oldMessage = createMessage("previous turn");
    const newMessage = createMessage("next turn");
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error("storage unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const oldBuffer = new ConversationBuffer();
    oldBuffer.ingestUIMessages([oldMessage], false);
    const oldContext = createOperationContext();
    new MemoryPersistQueue(memoryManager, { debounceMs: 100 }).scheduleSave(
      oldBuffer,
      oldContext as any,
    );

    await vi.advanceTimersByTimeAsync(100);
    expect(oldBuffer.getPendingMessages()).toHaveLength(1);

    const newBuffer = new ConversationBuffer();
    newBuffer.ingestUIMessages([newMessage], false);
    await new MemoryPersistQueue(memoryManager).flush(newBuffer, createOperationContext() as any);

    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      oldMessage.id,
      oldMessage.id,
      newMessage.id,
    ]);
    expect(oldBuffer.getPendingMessages()).toHaveLength(0);
  });

  it("keeps both operation buffers when a later schedule resets the debounce timer", async () => {
    const messages = [createMessage("previous turn"), createMessage("next turn")];
    const memoryManager = { saveMessage: vi.fn().mockResolvedValue(undefined) } as any;
    const buffers = messages.map((message) => {
      const buffer = new ConversationBuffer();
      buffer.ingestUIMessages([message], false);
      return buffer;
    });

    new MemoryPersistQueue(memoryManager, { debounceMs: 100 }).scheduleSave(
      buffers[0],
      createOperationContext() as any,
    );
    await vi.advanceTimersByTimeAsync(50);
    new MemoryPersistQueue(memoryManager, { debounceMs: 100 }).scheduleSave(
      buffers[1],
      createOperationContext() as any,
    );
    await vi.advanceTimersByTimeAsync(100);

    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual(
      messages.map((message) => message.id),
    );
    expect(buffers.every((buffer) => buffer.getPendingMessages().length === 0)).toBe(true);
  });

  it("attempts every retained buffer before rethrowing the first failure", async () => {
    const firstMessage = createMessage("previous turn");
    const secondMessage = createMessage("next turn");
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error("first buffer unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const firstBuffer = new ConversationBuffer();
    firstBuffer.ingestUIMessages([firstMessage], false);
    const secondBuffer = new ConversationBuffer();
    secondBuffer.ingestUIMessages([secondMessage], false);
    const queue = new MemoryPersistQueue(memoryManager, { debounceMs: 100 });
    const firstContext = { ...createOperationContext(), isActive: false };
    const secondContext = { ...createOperationContext(), isActive: false };

    queue.scheduleSave(firstBuffer, firstContext as any);
    queue.scheduleSave(secondBuffer, secondContext as any);

    await expect(queue.flush(secondBuffer, secondContext as any)).rejects.toThrow(
      "first buffer unavailable",
    );
    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      firstMessage.id,
      secondMessage.id,
    ]);
    expect(firstBuffer.getPendingMessages()).toHaveLength(1);
    expect(secondBuffer.getPendingMessages()).toHaveLength(0);
  });

  it("bounds retained failed buffers so old retries do not grow without limit", async () => {
    const oldMessage = createMessage("old turn");
    const newMessage = createMessage("new turn");
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error("old buffer unavailable"))
        .mockRejectedValueOnce(new Error("old buffer unavailable"))
        .mockRejectedValueOnce(new Error("new buffer unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const oldBuffer = new ConversationBuffer();
    oldBuffer.ingestUIMessages([oldMessage], false);
    const newBuffer = new ConversationBuffer();
    newBuffer.ingestUIMessages([newMessage], false);
    const oldContext = { ...createOperationContext(), isActive: false };
    const newContext = { ...createOperationContext(), isActive: false };
    const queue = new MemoryPersistQueue(memoryManager, {
      maxRetryBuffers: 1,
      retryRetentionMs: 60_000,
    });

    await expect(queue.flush(oldBuffer, oldContext as any)).rejects.toThrow(
      "old buffer unavailable",
    );
    await expect(queue.flush(newBuffer, newContext as any)).rejects.toThrow(
      "old buffer unavailable",
    );
    await queue.flush(newBuffer, newContext as any);

    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      oldMessage.id,
      oldMessage.id,
      newMessage.id,
      newMessage.id,
    ]);
    expect(oldBuffer.getPendingMessages()).toHaveLength(1);
    expect(newBuffer.getPendingMessages()).toHaveLength(0);
  });

  it("drops an inactive failed buffer after its retry retention window", async () => {
    const message = createMessage("expired turn");
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error("storage unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const buffer = new ConversationBuffer();
    buffer.ingestUIMessages([message], false);
    const context = { ...createOperationContext(), isActive: false };
    const queue = new MemoryPersistQueue(memoryManager, {
      retryRetentionMs: 1_000,
    });

    await expect(queue.flush(buffer, context as any)).rejects.toThrow("storage unavailable");
    await vi.advanceTimersByTimeAsync(1_001);

    expect(memoryManager.saveMessage).toHaveBeenCalledTimes(1);
    expect(buffer.getPendingMessages()).toHaveLength(1);
    const entriesByManager = (MemoryPersistQueue as any).entriesByManager as WeakMap<
      object,
      Map<string, unknown>
    >;
    expect(entriesByManager.get(memoryManager)?.size ?? 0).toBe(0);
  });

  it("keeps retries separate for user and conversation IDs containing colons", async () => {
    const firstMessage = createMessage("first conversation");
    const secondMessage = createMessage("second conversation");
    const memoryManager = {
      saveMessage: vi
        .fn()
        .mockRejectedValueOnce(new Error("storage unavailable"))
        .mockResolvedValue(undefined),
    } as any;
    const firstBuffer = new ConversationBuffer();
    firstBuffer.ingestUIMessages([firstMessage], false);
    const firstContext = { ...createOperationContext(), userId: "a:b", conversationId: "c" };
    const secondBuffer = new ConversationBuffer();
    secondBuffer.ingestUIMessages([secondMessage], false);
    const secondContext = { ...createOperationContext(), userId: "a", conversationId: "b:c" };

    await expect(
      new MemoryPersistQueue(memoryManager).flush(firstBuffer, firstContext as any),
    ).rejects.toThrow("storage unavailable");
    await new MemoryPersistQueue(memoryManager).flush(secondBuffer, secondContext as any);

    expect(memoryManager.saveMessage.mock.calls.map((call: any[]) => call[1].id)).toEqual([
      firstMessage.id,
      secondMessage.id,
    ]);
    expect(firstBuffer.getPendingMessages()).toHaveLength(1);
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
