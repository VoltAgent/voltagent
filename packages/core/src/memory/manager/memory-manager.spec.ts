import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OperationContext } from "../../agent/types";
import { getGlobalLogger } from "../../logger";
import { Memory } from "../../memory";
import { InMemoryStorageAdapter } from "../../memory/adapters/storage/in-memory";
import { createTestUIMessage } from "../../memory/test-utils";
import { MemoryManager } from "./memory-manager";

// Helper function to create mock OperationContext
function createMockOperationContext(): OperationContext {
  const mockSpan = {
    end: vi.fn(),
    setStatus: vi.fn(),
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    recordException: vi.fn(),
  };

  return {
    operationId: "test-operation-id",
    logger: getGlobalLogger().child({ test: true }),
    historyEntry: { id: "hist-1" },
    messages: [],
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    traceContext: {
      createChildSpan: vi.fn().mockReturnValue(mockSpan),
      endChildSpan: vi.fn(),
      withSpan: vi.fn().mockImplementation(async (_span, fn) => await fn()),
      getRootSpan: vi.fn().mockReturnValue(mockSpan),
      endRootSpan: vi.fn(),
      updateGenerationOptions: vi.fn(),
    } as any,
    abortController: new AbortController(),
    startTime: new Date(),
  } as OperationContext;
}

describe("MemoryManager", () => {
  let manager: MemoryManager;
  let memory: Memory;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create Memory instance
    memory = new Memory({
      storage: new InMemoryStorageAdapter(),
    });

    // Create MemoryManager instance
    manager = new MemoryManager("agent-1", memory, {}, getGlobalLogger().child({ test: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create with Memory", () => {
      expect(manager.getMemory()).toBe(memory);
    });

    it("should create default instances when not provided", () => {
      const defaultManager = new MemoryManager("agent-2");
      expect(defaultManager.getMemory()).toBeDefined();
    });

    it("should handle disabled memory", () => {
      const disabledManager = new MemoryManager("agent-3", false);
      expect(disabledManager.getMemory()).toBeUndefined();
      expect(disabledManager.hasConversationMemory()).toBe(false);
    });
  });

  describe("saveMessage", () => {
    it("should save a message to Memory V2", async () => {
      const context = createMockOperationContext();

      const message = createTestUIMessage({
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      });

      await manager.saveMessage(context, message, "user-1", "conv-1");

      // Verify message was saved
      const messages = await memory.getMessages("user-1", "conv-1");
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-1");
    });

    it("should generate a title when creating a conversation", async () => {
      const context = createMockOperationContext();
      context.input = "Plan a weekend trip to Rome.";

      const titleGenerator = vi.fn().mockResolvedValue("Rome Weekend Plan");
      const managerWithTitle = new MemoryManager(
        "agent-1",
        memory,
        {},
        getGlobalLogger().child({ test: true }),
        titleGenerator,
      );

      const message = createTestUIMessage({
        id: "msg-1",
        role: "assistant",
        parts: [{ type: "text", text: "Sure, let's plan it." }],
      });

      await managerWithTitle.saveMessage(context, message, "user-1", "conv-title");

      const conversation = await memory.getConversation("conv-title");
      expect(conversation?.title).toBe("Rome Weekend Plan");
      expect(titleGenerator).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully", async () => {
      // Create manager with mocked memory that throws error
      const errorMemory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      vi.spyOn(errorMemory, "addMessage").mockRejectedValue(new Error("Save failed"));

      const errorManager = new MemoryManager(
        "agent-1",
        errorMemory,
        {},
        getGlobalLogger().child({ test: true }),
      );

      const context = createMockOperationContext();

      const message = createTestUIMessage();

      // Should not throw even if save fails
      await expect(
        errorManager.saveMessage(context, message, "user-1", "conv-1"),
      ).resolves.not.toThrow();
    });
  });

  describe("getMessages", () => {
    it("should retrieve messages from Memory V2", async () => {
      const context = createMockOperationContext();

      // First save some messages
      const message1 = createTestUIMessage({ id: "msg-1" });
      const message2 = createTestUIMessage({ id: "msg-2" });

      await manager.saveMessage(context, message1, "user-1", "conv-1");
      await manager.saveMessage(context, message2, "user-1", "conv-1");

      // Then retrieve them
      const messages = await manager.getMessages(context, "user-1", "conv-1");
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe("msg-1");
      expect(messages[1].id).toBe("msg-2");
    });

    it("should return empty array when memory is disabled", async () => {
      const disabledManager = new MemoryManager("agent-3", false);

      const context = createMockOperationContext();

      const messages = await disabledManager.getMessages(context, "user-1", "conv-1");
      expect(messages).toEqual([]);
    });
  });

  describe("searchMessages", () => {
    it("should search messages semantically", async () => {
      const context = createMockOperationContext();

      // Save some messages
      const message1 = createTestUIMessage({
        id: "msg-1",
        parts: [{ type: "text", text: "Hello world" }],
      });
      const message2 = createTestUIMessage({
        id: "msg-2",
        parts: [{ type: "text", text: "Goodbye world" }],
      });

      await manager.saveMessage(context, message1, "user-1", "conv-1");
      await manager.saveMessage(context, message2, "user-1", "conv-1");

      // Search (without vector search, it returns all messages)
      const results = await manager.searchMessages(context, "hello", "user-1", "conv-1");

      expect(results).toHaveLength(2);
    });
  });

  describe("clearMessages", () => {
    it("should clear messages from conversation", async () => {
      const context = createMockOperationContext();

      // Save a message
      const message = createTestUIMessage();
      await manager.saveMessage(context, message, "user-1", "conv-1");

      // Clear messages
      await manager.clearMessages(context, "user-1", "conv-1");

      // Verify messages are cleared
      const messages = await manager.getMessages(context, "user-1", "conv-1");
      expect(messages).toHaveLength(0);
    });
  });

  describe("shutdown", () => {
    it("should shutdown gracefully", async () => {
      await expect(manager.shutdown()).resolves.not.toThrow();
    });
  });
});
