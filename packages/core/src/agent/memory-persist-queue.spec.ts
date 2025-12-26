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
