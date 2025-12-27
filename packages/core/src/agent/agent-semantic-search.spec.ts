/**
 * Unit tests for Agent semantic search functionality
 */

import type { UIMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Memory } from "../memory";
import type { EmbeddingAdapter } from "../memory/adapters/embedding/types";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { InMemoryVectorAdapter } from "../memory/adapters/vector/in-memory";
import { MemoryManager } from "../memory/manager/memory-manager";
import { Agent } from "./agent";

// Mock AI SDK functions
vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  generateObject: vi.fn(),
  streamObject: vi.fn(),
  convertToModelMessages: vi.fn((messages) => messages),
  stepCountIs: vi.fn(() => vi.fn(() => false)),
}));

// Mock embedding adapter
class MockEmbeddingAdapter implements EmbeddingAdapter {
  async embed(_: string): Promise<number[]> {
    // Return a simple vector for testing
    return [0.1, 0.2, 0.3];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => [0.1, 0.2, 0.3]);
  }

  getDimensions(): number {
    return 3;
  }

  getModelName(): string {
    return "mock-embedding";
  }
}

describe("Agent Semantic Search", () => {
  let mockModel: MockLanguageModelV3;
  let _agent: Agent;
  let memoryWithVector: Memory;
  let memoryWithoutVector: Memory;

  beforeEach(() => {
    // Create mock model
    mockModel = new MockLanguageModelV3({
      modelId: "test-model",
      doGenerate: {
        content: [{ type: "text", text: "Test response" }],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
          outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
        },
      },
    });

    // Create Memory with vector support
    memoryWithVector = new Memory({
      storage: new InMemoryStorageAdapter(),
      embedding: new MockEmbeddingAdapter(),
      vector: new InMemoryVectorAdapter(),
      enableCache: true,
    });

    // Create Memory without vector support
    memoryWithoutVector = new Memory({
      storage: new InMemoryStorageAdapter(),
    });

    vi.clearAllMocks();
  });

  describe("hasSemanticSearchSupport", () => {
    it("should return true when MemoryManager has vector support", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      // Access private method through reflection for testing
      const hasSupport = (agent as any).hasSemanticSearchSupport();
      expect(hasSupport).toBe(true);
    });

    it("should return false when Memory V2 has no vector adapter", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithoutVector,
      });

      const hasSupport = (agent as any).hasSemanticSearchSupport();
      expect(hasSupport).toBe(false);
    });

    it("should return false when no memory is configured", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: false,
      });

      const hasSupport = (agent as any).hasSemanticSearchSupport();
      expect(hasSupport).toBe(false);
    });
  });

  describe("extractUserQuery", () => {
    let agent: Agent;

    beforeEach(() => {
      agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });
    });

    it("should return string input directly", () => {
      const input = "What's my favorite fruit?";
      const query = (agent as any).extractUserQuery(input);
      expect(query).toBe(input);
    });

    it("should extract text from last user message in array", () => {
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "assistant",
          parts: [{ type: "text", text: "Hello!" }],
        },
        {
          id: "2",
          role: "user",
          parts: [{ type: "text", text: "Tell me about dogs" }],
        },
        {
          id: "3",
          role: "assistant",
          parts: [{ type: "text", text: "Dogs are..." }],
        },
        {
          id: "4",
          role: "user",
          parts: [{ type: "text", text: "What about cats?" }],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBe("What about cats?");
    });

    it("should return undefined when no user messages exist", () => {
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "assistant",
          parts: [{ type: "text", text: "Hello!" }],
        },
        {
          id: "2",
          role: "system",
          parts: [{ type: "text", text: "System message" }],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBeUndefined();
    });

    it("should handle multiple text parts in message", () => {
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [
            { type: "text", text: "Part 1" },
            { type: "text", text: " Part 2" },
            { type: "text", text: " Part 3" },
          ],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBe("Part 1 Part 2 Part 3");
    });

    it("should ignore non-text parts", () => {
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [
            { type: "text", text: "Text part" },
            { type: "image", data: "image-data" } as any,
            { type: "text", text: " Another text" },
          ],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBe("Text part Another text");
    });

    it("should return undefined for empty parts", () => {
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBeUndefined();
    });
  });

  describe("Semantic Memory Default Behavior", () => {
    it("should enable semantic search by default when vector support exists", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      // The semantic search should be enabled by default (no need to pass semanticMemory option)
      const hasSupport = (agent as any).hasSemanticSearchSupport();
      expect(hasSupport).toBe(true);
    });

    it("should fallback to regular messages when no vector support", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithoutVector,
      });

      const hasSupport = (agent as any).hasSemanticSearchSupport();
      expect(hasSupport).toBe(false);
    });
  });

  describe("Semantic Memory Integration", () => {
    it("should use semantic search when vector support exists and not disabled", async () => {
      // Create a spy for MemoryManager.getMessages
      const getMessagesSpy = vi.fn().mockResolvedValue([]);

      // Create agent with mocked memory manager
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      // Replace the memory manager's getMessages method
      const memoryManager = (agent as any).memoryManager;
      if (memoryManager) {
        memoryManager.getMessages = getMessagesSpy;
      }

      // Call generateText (this will internally call prepareMessages)
      try {
        await agent.generateText("Test query", {
          userId: "test-user",
          conversationId: "test-conv",
        });
      } catch (_e) {
        // We expect this to fail since we're mocking, but we want to check the spy
      }

      // Verify getMessages was called with semantic search parameters
      expect(getMessagesSpy).toHaveBeenCalled();
      const callArgs = getMessagesSpy.mock.calls[0];
      expect(callArgs).toBeDefined();
      // Check that semantic search options were passed
      expect(callArgs[4]).toMatchObject({
        useSemanticSearch: true,
        currentQuery: "Test query",
      });
    });

    it("should not use semantic search when explicitly disabled", async () => {
      const getMessagesSpy = vi.fn().mockResolvedValue([]);
      const prepareConversationContextSpy = vi.fn().mockResolvedValue({
        messages: [],
        conversationId: "test-conv",
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      const memoryManager = (agent as any).memoryManager;
      if (memoryManager) {
        memoryManager.getMessages = getMessagesSpy;
        memoryManager.prepareConversationContext = prepareConversationContextSpy;
      }

      try {
        await agent.generateText("Test query", {
          userId: "test-user",
          conversationId: "test-conv",
          semanticMemory: {
            enabled: false,
          },
        });
      } catch (_e) {
        // Expected to fail
      }

      // When semantic search is disabled, prepareConversationContext should be called instead
      expect(prepareConversationContextSpy).toHaveBeenCalled();
      // getMessages should NOT be called with semantic options
      expect(getMessagesSpy).not.toHaveBeenCalled();
    });

    it("should pass custom semantic options to memory manager", async () => {
      const getMessagesSpy = vi.fn().mockResolvedValue([]);

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      const memoryManager = (agent as any).memoryManager;
      if (memoryManager) {
        memoryManager.getMessages = getMessagesSpy;
      }

      const customOptions = {
        semanticMemory: {
          enabled: true,
          semanticLimit: 10,
          semanticThreshold: 0.7,
          mergeStrategy: "append" as const,
        },
      };

      try {
        await agent.generateText("Test query", {
          userId: "test-user",
          conversationId: "test-conv",
          ...customOptions,
        });
      } catch (_e) {
        // Expected
      }

      expect(getMessagesSpy).toHaveBeenCalled();
      const callArgs = getMessagesSpy.mock.calls[0];
      expect(callArgs[4]).toMatchObject({
        useSemanticSearch: true,
        currentQuery: "Test query",
        semanticLimit: 10,
        semanticThreshold: 0.7,
        mergeStrategy: "append",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty message array", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const messages: UIMessage[] = [];
      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBeUndefined();
    });

    it("should handle messages with only tool/system roles", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const messages: UIMessage[] = [
        {
          id: "1",
          role: "system",
          parts: [{ type: "text", text: "System" }],
        },
        {
          id: "2",
          role: "tool" as any,
          parts: [{ type: "text", text: "Tool output" }],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBeUndefined();
    });

    it("should handle malformed message parts gracefully", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [
            { type: "text", text: "" }, // Empty text
            { type: "text", text: null as any }, // Null text
            { type: "text", text: "Valid text" },
          ],
        },
      ];

      const query = (agent as any).extractUserQuery(messages);
      expect(query).toBe("Valid text"); // Should handle nulls/empties gracefully
    });
  });

  describe("Integration with MemoryManagerV2", () => {
    it("should detect MemoryManager instance correctly", () => {
      // Create agent with MemoryManager that has vector support
      const memoryManager = new MemoryManager("test-agent", memoryWithVector, {});

      // Mock the memoryManager to be MemoryManager
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      // Replace the memory manager
      (agent as any).memoryManager = memoryManager;

      const hasSupport = (agent as any).hasSemanticSearchSupport();
      expect(hasSupport).toBe(true);
    });
  });

  describe("End-to-End Semantic Search Flow", () => {
    it("should merge semantic and recent messages correctly", async () => {
      // Create mock messages - some recent, some that will be found via semantic search
      const recentMessages = [
        { role: "user", parts: [{ type: "text", text: "Recent message 1" }] },
        { role: "assistant", parts: [{ type: "text", text: "Recent response 1" }] },
      ];

      const semanticMessages = [
        { role: "user", parts: [{ type: "text", text: "Old relevant message" }] },
        { role: "assistant", parts: [{ type: "text", text: "Old relevant response" }] },
      ];

      // Mock MemoryManager to return specific messages
      const getMessagesSpy = vi
        .fn()
        .mockImplementation((_context, _userId, _convId, _limit, semanticOptions) => {
          if (semanticOptions?.useSemanticSearch) {
            // Return both semantic and recent messages (simulating merge)
            return [...semanticMessages, ...recentMessages];
          }
          return recentMessages;
        });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      const memoryManager = (agent as any).memoryManager;
      if (memoryManager) {
        memoryManager.getMessages = getMessagesSpy;
      }

      // Mock the AI SDK generateText to capture the messages passed
      const generateTextMock = vi.fn().mockResolvedValue({
        text: "Response",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });

      vi.mocked((await import("ai")).generateText).mockImplementation(generateTextMock);

      await agent.generateText("Find my old relevant info", {
        userId: "test-user",
        conversationId: "test-conv",
      });

      // Verify semantic search was used
      expect(getMessagesSpy).toHaveBeenCalledWith(
        expect.anything(),
        "test-user",
        "test-conv",
        undefined,
        expect.objectContaining({
          useSemanticSearch: true,
          currentQuery: "Find my old relevant info",
        }),
      );

      // Verify that generateText received the merged messages
      expect(generateTextMock).toHaveBeenCalled();
      const generateCall = generateTextMock.mock.calls[0][0];
      expect(generateCall.messages).toBeDefined();
      // Should include both semantic and recent messages
      expect(generateCall.messages.length).toBeGreaterThan(0);
    });

    it("should handle when no semantic results are found", async () => {
      // Mock MemoryManager to return only recent messages
      const getMessagesSpy = vi
        .fn()
        .mockResolvedValue([{ role: "user", parts: [{ type: "text", text: "Only recent" }] }]);

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: memoryWithVector,
      });

      const memoryManager = (agent as any).memoryManager;
      if (memoryManager) {
        memoryManager.getMessages = getMessagesSpy;
      }

      const generateTextMock = vi.fn().mockResolvedValue({
        text: "Response",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });

      vi.mocked((await import("ai")).generateText).mockImplementation(generateTextMock);

      await agent.generateText("Query with no semantic matches", {
        userId: "test-user",
        conversationId: "test-conv",
      });

      // Should still call with semantic search enabled
      expect(getMessagesSpy).toHaveBeenCalledWith(
        expect.anything(),
        "test-user",
        "test-conv",
        undefined,
        expect.objectContaining({
          useSemanticSearch: true,
          currentQuery: "Query with no semantic matches",
        }),
      );
    });
  });
});
