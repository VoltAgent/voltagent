/**
 * Tests for semantic search integration
 */

import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmbeddingAdapter } from "./adapters/embedding/types";
import { InMemoryStorageAdapter } from "./adapters/storage/in-memory";
import { InMemoryVectorAdapter } from "./adapters/vector/in-memory";
import { Memory } from "./index";

// Mock embedding adapter
class MockEmbeddingAdapter implements EmbeddingAdapter {
  async embed(text: string): Promise<number[]> {
    // Return a simple hash-based vector for testing
    const hash = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array(3)
      .fill(0)
      .map((_, i) => (hash * (i + 1)) % 100);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  getDimensions(): number {
    return 3;
  }

  getModelName(): string {
    return "mock-model";
  }
}

describe("Memory V2 - Semantic Search", () => {
  let memory: Memory;
  let storage: InMemoryStorageAdapter;
  let vector: InMemoryVectorAdapter;
  let embedding: EmbeddingAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
    vector = new InMemoryVectorAdapter();
    embedding = new MockEmbeddingAdapter();

    memory = new Memory({
      storage,
      embedding,
      vector,
      enableCache: true,
    });
  });

  describe("Auto-embedding on message save", () => {
    it("should automatically embed and store message when saved", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Create conversation
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "agent1",
        title: "Test Conversation",
      });

      // Save a message
      const message: UIMessage = {
        id: "msg1",
        role: "user",
        parts: [{ type: "text", text: "Hello, how are you?" }],
      };

      const storeSpy = vi.spyOn(vector, "store");

      await memory.addMessage(message, userId, conversationId);

      // Verify the message was embedded and stored
      expect(storeSpy).toHaveBeenCalledWith(
        `msg_${conversationId}_${message.id}`,
        expect.any(Array),
        expect.objectContaining({
          messageId: message.id,
          conversationId,
          userId,
          role: "user",
        }),
      );
    });

    it("should handle batch message embedding", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Create conversation
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "agent1",
        title: "Test Conversation",
      });

      // Save multiple messages
      const messages: UIMessage[] = [
        {
          id: "msg1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
        {
          id: "msg2",
          role: "assistant",
          parts: [{ type: "text", text: "Hi there!" }],
        },
        {
          id: "msg3",
          role: "user",
          parts: [{ type: "text", text: "How can you help?" }],
        },
      ];

      const storeBatchSpy = vi.spyOn(vector, "storeBatch");

      await memory.addMessages(messages, userId, conversationId);

      // Verify batch embedding was used
      expect(storeBatchSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: `msg_${conversationId}_msg1`,
            vector: expect.any(Array),
          }),
          expect.objectContaining({
            id: `msg_${conversationId}_msg2`,
            vector: expect.any(Array),
          }),
          expect.objectContaining({
            id: `msg_${conversationId}_msg3`,
            vector: expect.any(Array),
          }),
        ]),
      );
    });

    it("should skip embedding for messages without text content", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Create conversation
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "agent1",
        title: "Test Conversation",
      });

      // Save a message without text parts
      const message: UIMessage = {
        id: "msg1",
        role: "user",
        parts: [], // No text parts
      };

      const storeSpy = vi.spyOn(vector, "store");

      await memory.addMessage(message, userId, conversationId);

      // Verify no embedding was stored
      expect(storeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Semantic search retrieval", () => {
    beforeEach(async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Create conversation and add test messages
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "agent1",
        title: "Test Conversation",
      });

      const messages: UIMessage[] = [
        {
          id: "msg1",
          role: "user",
          parts: [{ type: "text", text: "Tell me about dogs" }],
        },
        {
          id: "msg2",
          role: "assistant",
          parts: [{ type: "text", text: "Dogs are loyal companions" }],
        },
        {
          id: "msg3",
          role: "user",
          parts: [{ type: "text", text: "What about cats?" }],
        },
        {
          id: "msg4",
          role: "assistant",
          parts: [{ type: "text", text: "Cats are independent pets" }],
        },
        {
          id: "msg5",
          role: "user",
          parts: [{ type: "text", text: "Tell me more about dogs and their training" }],
        },
      ];

      await memory.addMessages(messages, userId, conversationId);
    });

    it("should retrieve semantically similar messages", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      const messages = await memory.getMessagesWithSemanticSearch(
        userId,
        conversationId,
        "dogs and puppies",
        {
          limit: 2,
          semanticLimit: 3,
        },
      );

      // Should return recent messages plus semantically similar ones
      expect(messages.length).toBeGreaterThan(0);

      // Check that messages about dogs are included
      const messageTexts = messages
        .map((m) => m.parts?.find((p) => p.type === "text" && "text" in p))
        .filter(Boolean)
        .map((p) => (p as any).text);

      const dogRelatedMessages = messageTexts.filter((text) => text.toLowerCase().includes("dog"));

      expect(dogRelatedMessages.length).toBeGreaterThan(0);
    });

    it("should handle merging strategies correctly", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Test prepend strategy
      const prependMessages = await memory.getMessagesWithSemanticSearch(
        userId,
        conversationId,
        "pets",
        {
          limit: 2,
          semanticLimit: 2,
          mergeStrategy: "prepend",
        },
      );

      expect(prependMessages).toBeDefined();
      expect(Array.isArray(prependMessages)).toBe(true);

      // Test append strategy
      const appendMessages = await memory.getMessagesWithSemanticSearch(
        userId,
        conversationId,
        "pets",
        {
          limit: 2,
          semanticLimit: 2,
          mergeStrategy: "append",
        },
      );

      expect(appendMessages).toBeDefined();
      expect(Array.isArray(appendMessages)).toBe(true);

      // Test interleave strategy
      const interleaveMessages = await memory.getMessagesWithSemanticSearch(
        userId,
        conversationId,
        "pets",
        {
          limit: 2,
          semanticLimit: 2,
          mergeStrategy: "interleave",
        },
      );

      expect(interleaveMessages).toBeDefined();
      expect(Array.isArray(interleaveMessages)).toBe(true);
    });

    it("should fall back to recent messages when semantic search fails", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Mock vector search to throw an error
      vi.spyOn(vector, "search").mockRejectedValueOnce(new Error("Vector search failed"));

      const messages = await memory.getMessagesWithSemanticSearch(
        userId,
        conversationId,
        "test query",
        {
          limit: 3,
          semanticLimit: 2,
        },
      );

      // Should still return recent messages
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.length).toBeLessThanOrEqual(3);
    });

    it("should return only recent messages when no query provided", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      const messages = await memory.getMessagesWithSemanticSearch(
        userId,
        conversationId,
        undefined, // No query
        {
          limit: 3,
        },
      );

      // Should return only recent messages
      expect(messages.length).toBeLessThanOrEqual(3);
    });

    it("should preserve vector result order and default to append", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Force vector search order: msg3 first, then msg1
      vi.spyOn(vector, "search").mockResolvedValueOnce([
        {
          id: "v1",
          vector: [0, 0, 0],
          score: 0.99,
          metadata: { messageId: "msg3", conversationId, userId },
        },
        {
          id: "v2",
          vector: [0, 0, 0],
          score: 0.98,
          metadata: { messageId: "msg1", conversationId, userId },
        },
      ]);

      const messages = await memory.getMessagesWithContext(userId, conversationId, {
        limit: 1, // recent will include only the latest message (msg5)
        useSemanticSearch: true,
        currentQuery: "pets",
      });

      // With default mergeStrategy=append, recent comes first, semantic hits appended preserving order
      expect(messages[0]?.id).toBe("msg5");
      const ids = messages.map((m) => m.id);
      const idxMsg3 = ids.indexOf("msg3");
      const idxMsg1 = ids.indexOf("msg1");
      expect(idxMsg3).toBeGreaterThan(0);
      expect(idxMsg1).toBeGreaterThan(idxMsg3);
    });

    it("should support append strategy to place semantic messages after recent", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Force vector search order: msg2 first, then msg1
      vi.spyOn(vector, "search").mockResolvedValueOnce([
        {
          id: "v1",
          vector: [0, 0, 0],
          score: 0.99,
          metadata: { messageId: "msg2", conversationId, userId },
        },
        {
          id: "v2",
          vector: [0, 0, 0],
          score: 0.98,
          metadata: { messageId: "msg1", conversationId, userId },
        },
      ]);

      const messages = await memory.getMessagesWithContext(userId, conversationId, {
        limit: 1, // recent will include only the latest message (msg5)
        useSemanticSearch: true,
        currentQuery: "pets",
        mergeStrategy: "append",
      });

      // With append, first should be the recent message (msg5)
      expect(messages[0]?.id).toBe("msg5");
      const ids = messages.map((m) => m.id);
      const idxMsg2 = ids.indexOf("msg2");
      const idxMsg1 = ids.indexOf("msg1");
      expect(idxMsg2).toBeGreaterThan(0);
      expect(idxMsg1).toBeGreaterThan(idxMsg2);
    });
  });

  describe("Vector support detection", () => {
    it("should correctly report vector support when configured", () => {
      expect(memory.hasVectorSupport()).toBe(true);
    });

    it("should report no vector support when not configured", () => {
      const memoryWithoutVector = new Memory({
        storage: new InMemoryStorageAdapter(),
      });

      expect(memoryWithoutVector.hasVectorSupport()).toBe(false);
    });
  });

  describe("Conversation cleanup", () => {
    it("should delete vectors when conversation is deleted", async () => {
      const userId = "user123";
      const conversationId = "conv456";

      // Create conversation and add messages
      await memory.createConversation({
        id: conversationId,
        userId,
        resourceId: "agent1",
        title: "Test Conversation",
      });

      const messages: UIMessage[] = [
        {
          id: "msg1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
        {
          id: "msg2",
          role: "assistant",
          parts: [{ type: "text", text: "Hi!" }],
        },
      ];

      await memory.addMessages(messages, userId, conversationId);

      const deleteBatchSpy = vi.spyOn(vector, "deleteBatch");

      // Delete conversation
      await memory.deleteConversation(conversationId);

      // Verify vectors were deleted
      expect(deleteBatchSpy).toHaveBeenCalledWith(
        expect.arrayContaining([`msg_${conversationId}_msg1`, `msg_${conversationId}_msg2`]),
      );
    });
  });
});
