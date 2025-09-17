import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UIMessage } from "ai";

import { ConversationBuffer } from "./conversation-buffer";
import { MemoryPersistQueue } from "./memory-persist-queue";

const createOperationContext = () => ({
  userId: "user-1",
  conversationId: "conv-1",
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
});
