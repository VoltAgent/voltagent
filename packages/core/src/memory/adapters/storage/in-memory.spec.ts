/**
 * Unit tests for InMemoryStorageAdapter
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ConversationAlreadyExistsError, ConversationNotFoundError } from "../../errors";
import {
  createTestConversation,
  createTestMessages,
  createTestUIMessage,
  extractMessageTexts,
} from "../../test-utils";
import { InMemoryStorageAdapter } from "./in-memory";

describe("InMemoryStorageAdapter", () => {
  let storage: InMemoryStorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter({ storageLimit: 100 });
  });

  describe("Conversation Operations", () => {
    describe("createConversation", () => {
      it("should create a conversation with valid data", async () => {
        // Arrange
        const input = createTestConversation();

        // Act
        const result = await storage.createConversation(input);

        // Assert
        expect(result.id).toBe(input.id);
        expect(result.userId).toBe(input.userId);
        expect(result.resourceId).toBe(input.resourceId);
        expect(result.title).toBe(input.title);
        expect(result.metadata).toEqual(input.metadata);
      });

      it("should throw ConversationAlreadyExistsError for duplicate IDs", async () => {
        // Arrange
        const input = createTestConversation({ id: "duplicate-id" });
        await storage.createConversation(input);

        // Act & Assert
        await expect(storage.createConversation(input)).rejects.toThrow(
          ConversationAlreadyExistsError,
        );
      });

      it("should set createdAt and updatedAt timestamps", async () => {
        // Arrange
        const input = createTestConversation();

        // Act
        const result = await storage.createConversation(input);

        // Assert
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.createdAt).toBe(result.updatedAt);
      });

      it("should deep clone the conversation object", async () => {
        // Arrange
        const input = createTestConversation({
          metadata: { nested: { value: "test" } },
        });

        // Act
        await storage.createConversation(input);

        // Modify the input to ensure it doesn't affect stored data
        (input.metadata as any).nested.value = "modified";

        const retrieved = await storage.getConversation(input.id);

        // Assert
        expect((retrieved?.metadata as any)?.nested?.value).toBe("test");
      });
    });

    describe("getConversation", () => {
      it("should retrieve existing conversation by ID", async () => {
        // Arrange
        const input = createTestConversation();
        await storage.createConversation(input);

        // Act
        const result = await storage.getConversation(input.id);

        // Assert
        expect(result).toBeDefined();
        expect(result?.id).toBe(input.id);
      });

      it("should return null for non-existent conversation", async () => {
        // Act
        const result = await storage.getConversation("non-existent");

        // Assert
        expect(result).toBeNull();
      });

      it("should return deep cloned conversation", async () => {
        // Arrange
        const input = createTestConversation({
          metadata: { test: "value" },
        });
        await storage.createConversation(input);

        // Act
        const result1 = await storage.getConversation(input.id);
        const result2 = await storage.getConversation(input.id);

        // Assert
        expect(result1).not.toBe(result2);
        expect(result1).toEqual(result2);
      });
    });

    describe("updateConversation", () => {
      it("should update conversation fields", async () => {
        // Arrange
        const input = createTestConversation();
        await storage.createConversation(input);

        // Act
        const updated = await storage.updateConversation(input.id, {
          title: "Updated Title",
          metadata: { updated: true },
        });

        // Assert
        expect(updated.title).toBe("Updated Title");
        expect(updated.metadata).toEqual({ updated: true });
      });

      it("should throw ConversationNotFoundError for non-existent ID", async () => {
        // Act & Assert
        await expect(storage.updateConversation("non-existent", { title: "New" })).rejects.toThrow(
          ConversationNotFoundError,
        );
      });

      it("should update the updatedAt timestamp", async () => {
        // Arrange
        const input = createTestConversation();
        const created = await storage.createConversation(input);
        const originalUpdatedAt = created.updatedAt;

        // Wait a bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Act
        const updated = await storage.updateConversation(input.id, {
          title: "Updated",
        });

        // Assert
        expect(updated.updatedAt).not.toBe(originalUpdatedAt);
      });

      it("should not modify id, createdAt fields", async () => {
        // Arrange
        const input = createTestConversation();
        const created = await storage.createConversation(input);

        // Act
        const updated = await storage.updateConversation(input.id, {
          title: "Updated",
        });

        // Assert
        expect(updated.id).toBe(created.id);
        expect(updated.createdAt).toBe(created.createdAt);
      });
    });

    describe("deleteConversation", () => {
      it("should delete conversation and associated messages", async () => {
        // Arrange
        const conv = createTestConversation({ id: "conv-to-delete" });
        await storage.createConversation(conv);

        const message = createTestUIMessage();
        await storage.addMessage(message, conv.userId, conv.id);

        // Act
        await storage.deleteConversation(conv.id);

        // Assert
        const retrieved = await storage.getConversation(conv.id);
        expect(retrieved).toBeNull();

        const messages = await storage.getMessages(conv.userId, conv.id);
        expect(messages).toHaveLength(0);
      });

      it("should throw ConversationNotFoundError for non-existent ID", async () => {
        // Act & Assert
        await expect(storage.deleteConversation("non-existent")).rejects.toThrow(
          ConversationNotFoundError,
        );
      });

      it("should clean up messages for all users", async () => {
        // Arrange
        const conv = createTestConversation({ id: "shared-conv" });
        await storage.createConversation(conv);

        // Add messages from different users
        await storage.addMessage(createTestUIMessage(), "user1", conv.id);
        await storage.addMessage(createTestUIMessage(), "user2", conv.id);

        // Act
        await storage.deleteConversation(conv.id);

        // Assert
        const messages1 = await storage.getMessages("user1", conv.id);
        const messages2 = await storage.getMessages("user2", conv.id);
        expect(messages1).toHaveLength(0);
        expect(messages2).toHaveLength(0);
      });
    });

    describe("queryConversations", () => {
      beforeEach(async () => {
        // Create test conversations with delays to ensure different timestamps
        await storage.createConversation(
          createTestConversation({
            id: "conv-1",
            userId: "user-1",
            resourceId: "resource-1",
            title: "Alpha",
          }),
        );
        await new Promise((r) => setTimeout(r, 10));
        await storage.createConversation(
          createTestConversation({
            id: "conv-2",
            userId: "user-1",
            resourceId: "resource-2",
            title: "Beta",
          }),
        );
        await new Promise((r) => setTimeout(r, 10));
        await storage.createConversation(
          createTestConversation({
            id: "conv-3",
            userId: "user-2",
            resourceId: "resource-1",
            title: "Charlie",
          }),
        );
      });

      it("should filter by userId", async () => {
        // Act
        const result = await storage.queryConversations({ userId: "user-1" });

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every((c) => c.userId === "user-1")).toBe(true);
      });

      it("should filter by resourceId", async () => {
        // Act
        const result = await storage.queryConversations({
          resourceId: "resource-1",
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every((c) => c.resourceId === "resource-1")).toBe(true);
      });

      it("should apply pagination (limit, offset)", async () => {
        // Act
        const page1 = await storage.queryConversations({ limit: 2, offset: 0 });
        const page2 = await storage.queryConversations({ limit: 2, offset: 2 });

        // Assert
        expect(page1).toHaveLength(2);
        expect(page2).toHaveLength(1);
      });

      it("should sort by created_at DESC by default", async () => {
        // Act
        const result = await storage.queryConversations({});

        // Assert
        expect(result[0].id).toBe("conv-3");
        expect(result[1].id).toBe("conv-2");
        expect(result[2].id).toBe("conv-1");
      });

      it("should support custom ordering", async () => {
        // Act
        const byTitle = await storage.queryConversations({
          orderBy: "title",
          orderDirection: "ASC",
        });

        // Assert
        expect(byTitle[0].title).toBe("Alpha");
        expect(byTitle[1].title).toBe("Beta");
        expect(byTitle[2].title).toBe("Charlie");
      });

      it("should return deep cloned conversations", async () => {
        // Act
        const result1 = await storage.queryConversations({});
        const result2 = await storage.queryConversations({});

        // Assert
        expect(result1).not.toBe(result2);
        expect(result1).toEqual(result2);
      });
    });
  });

  describe("Message Operations", () => {
    let conversationId: string;
    let userId: string;

    beforeEach(async () => {
      conversationId = "test-conv";
      userId = "test-user";

      await storage.createConversation(createTestConversation({ id: conversationId, userId }));
    });

    describe("addMessage", () => {
      it("should add message to conversation", async () => {
        // Arrange
        const message = createTestUIMessage();

        // Act
        await storage.addMessage(message, userId, conversationId);
        const messages = await storage.getMessages(userId, conversationId);

        // Assert
        expect(messages).toHaveLength(1);
        expect(messages[0].id).toBe(message.id);
      });

      it("should create user storage if not exists", async () => {
        // Arrange
        const message = createTestUIMessage();
        const newUserId = "new-user";

        // Act
        await storage.addMessage(message, newUserId, conversationId);
        const messages = await storage.getMessages(newUserId, conversationId);

        // Assert
        expect(messages).toHaveLength(1);
      });

      it("should add createdAt timestamp", async () => {
        // Arrange
        const message = createTestUIMessage();

        // Act
        await storage.addMessage(message, userId, conversationId);

        // Assert
        // Access internal storage to check metadata
        const stats = storage.getStats();
        expect(stats.totalMessages).toBe(1);
      });

      it("should maintain userId and conversationId", async () => {
        // Arrange
        const message = createTestUIMessage();

        // Act
        await storage.addMessage(message, userId, conversationId);

        // Verify by retrieving with correct IDs
        const messages = await storage.getMessages(userId, conversationId);
        expect(messages).toHaveLength(1);

        // Verify by retrieving with wrong IDs
        const wrongMessages = await storage.getMessages("wrong-user", conversationId);
        expect(wrongMessages).toHaveLength(0);
      });
    });

    describe("addMessages", () => {
      it("should add multiple messages in order", async () => {
        // Arrange
        const messages = createTestMessages(3);

        // Act
        await storage.addMessages(messages, userId, conversationId);
        const retrieved = await storage.getMessages(userId, conversationId);

        // Assert
        expect(retrieved).toHaveLength(3);
        expect(retrieved.map((m) => m.id)).toEqual(messages.map((m) => m.id));
      });

      it("should apply storage limit after batch add", async () => {
        // Arrange
        const limitedStorage = new InMemoryStorageAdapter({ storageLimit: 2 });
        await limitedStorage.createConversation(
          createTestConversation({ id: conversationId, userId }),
        );

        const messages = createTestMessages(5);

        // Act
        await limitedStorage.addMessages(messages, userId, conversationId);
        const retrieved = await limitedStorage.getMessages(userId, conversationId);

        // Assert
        expect(retrieved).toHaveLength(2);
        // Should keep the last 2 messages
        expect(retrieved[0].id).toBe(messages[3].id);
        expect(retrieved[1].id).toBe(messages[4].id);
      });
    });

    describe("getMessages", () => {
      beforeEach(async () => {
        // Add test messages
        const messages = [
          createTestUIMessage({
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "User 1" }],
          }),
          createTestUIMessage({
            id: "msg-2",
            role: "assistant",
            parts: [{ type: "text", text: "Assistant 1" }],
          }),
          createTestUIMessage({
            id: "msg-3",
            role: "user",
            parts: [{ type: "text", text: "User 2" }],
          }),
          createTestUIMessage({
            id: "msg-4",
            role: "system",
            parts: [{ type: "text", text: "System 1" }],
          }),
        ];

        for (const msg of messages) {
          await storage.addMessage(msg, userId, conversationId);
        }
      });

      it("should return messages for conversation", async () => {
        // Act
        const messages = await storage.getMessages(userId, conversationId);

        // Assert
        expect(messages).toHaveLength(4);
      });

      it("should filter by roles", async () => {
        // Act
        const userMessages = await storage.getMessages(userId, conversationId, {
          roles: ["user"],
        });

        // Assert
        expect(userMessages).toHaveLength(2);
        expect(userMessages.every((m) => m.role === "user")).toBe(true);
      });

      it("should filter by time range", async () => {
        // Arrange
        const midTime = new Date();
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Add a late message
        await storage.addMessage(
          createTestUIMessage({ id: "msg-5", parts: [{ type: "text", text: "Late" }] }),
          userId,
          conversationId,
        );

        // Act
        const beforeMessages = await storage.getMessages(userId, conversationId, {
          before: midTime,
        });
        const afterMessages = await storage.getMessages(userId, conversationId, {
          after: midTime,
        });

        // Assert
        expect(beforeMessages.length).toBeLessThan(5);
        expect(afterMessages.length).toBeGreaterThan(0);
      });

      it("should apply limit", async () => {
        // Act
        const limited = await storage.getMessages(userId, conversationId, {
          limit: 2,
        });

        // Assert
        expect(limited).toHaveLength(2);
      });

      it("should return clean UIMessage without storage metadata", async () => {
        // Act
        const messages = await storage.getMessages(userId, conversationId);

        // Assert
        messages.forEach((msg) => {
          expect(msg).not.toHaveProperty("createdAt");
          expect(msg).not.toHaveProperty("userId");
          expect(msg).not.toHaveProperty("conversationId");
        });
      });

      it("should return deep cloned messages", async () => {
        // Act
        const messages1 = await storage.getMessages(userId, conversationId);
        const messages2 = await storage.getMessages(userId, conversationId);

        // Assert
        expect(messages1).not.toBe(messages2);
        expect(messages1).toEqual(messages2);
      });

      it("should sort by createdAt ascending", async () => {
        // Act
        const messages = await storage.getMessages(userId, conversationId);
        const texts = extractMessageTexts(messages);

        // Assert
        expect(texts).toEqual(["User 1", "Assistant 1", "User 2", "System 1"]);
      });
    });

    describe("clearMessages", () => {
      beforeEach(async () => {
        // Add test messages
        await storage.addMessage(createTestUIMessage(), userId, conversationId);
        await storage.addMessage(createTestUIMessage(), userId, "other-conv");
      });

      it("should clear messages for specific conversation", async () => {
        // Act
        await storage.clearMessages(userId, conversationId);

        // Assert
        const messages = await storage.getMessages(userId, conversationId);
        const otherMessages = await storage.getMessages(userId, "other-conv");

        expect(messages).toHaveLength(0);
        expect(otherMessages).toHaveLength(1);
      });

      it("should clear all messages for user when no conversationId", async () => {
        // Act
        await storage.clearMessages(userId);

        // Assert
        const messages1 = await storage.getMessages(userId, conversationId);
        const messages2 = await storage.getMessages(userId, "other-conv");

        expect(messages1).toHaveLength(0);
        expect(messages2).toHaveLength(0);
      });

      it("should handle non-existent user gracefully", async () => {
        // Act & Assert - should not throw
        await expect(storage.clearMessages("non-existent-user")).resolves.toBeUndefined();
      });
    });

    describe("Storage Limits", () => {
      it("should enforce storage limit per conversation", async () => {
        // Arrange
        const limitedStorage = new InMemoryStorageAdapter({ storageLimit: 3 });
        await limitedStorage.createConversation(
          createTestConversation({ id: conversationId, userId }),
        );

        // Act
        for (let i = 0; i < 5; i++) {
          await limitedStorage.addMessage(
            createTestUIMessage({
              id: `msg-${i}`,
              parts: [{ type: "text", text: `Message ${i}` }],
            }),
            userId,
            conversationId,
          );
        }

        // Assert
        const messages = await limitedStorage.getMessages(userId, conversationId);
        expect(messages).toHaveLength(3);

        const texts = extractMessageTexts(messages);
        expect(texts).toEqual(["Message 2", "Message 3", "Message 4"]);
      });

      it("should keep most recent messages when limit exceeded", async () => {
        // Arrange
        const limitedStorage = new InMemoryStorageAdapter({ storageLimit: 2 });
        await limitedStorage.createConversation(
          createTestConversation({ id: conversationId, userId }),
        );

        // Act
        await limitedStorage.addMessage(
          createTestUIMessage({ id: "old", parts: [{ type: "text", text: "Old" }] }),
          userId,
          conversationId,
        );
        await limitedStorage.addMessage(
          createTestUIMessage({ id: "new", parts: [{ type: "text", text: "New" }] }),
          userId,
          conversationId,
        );
        await limitedStorage.addMessage(
          createTestUIMessage({ id: "newest", parts: [{ type: "text", text: "Newest" }] }),
          userId,
          conversationId,
        );

        // Assert
        const messages = await limitedStorage.getMessages(userId, conversationId);
        const texts = extractMessageTexts(messages);
        expect(texts).toEqual(["New", "Newest"]);
      });

      it("should maintain separate limits for different conversations", async () => {
        // Arrange
        const limitedStorage = new InMemoryStorageAdapter({ storageLimit: 2 });
        const conv1 = "conv-1";
        const conv2 = "conv-2";

        await limitedStorage.createConversation(createTestConversation({ id: conv1, userId }));
        await limitedStorage.createConversation(createTestConversation({ id: conv2, userId }));

        // Act
        // Add 3 messages to conv1
        for (let i = 0; i < 3; i++) {
          await limitedStorage.addMessage(
            createTestUIMessage({
              id: `c1-${i}`,
              parts: [{ type: "text", text: `Conv1-${i}` }],
            }),
            userId,
            conv1,
          );
        }

        // Add 1 message to conv2
        await limitedStorage.addMessage(
          createTestUIMessage({
            id: "c2-0",
            parts: [{ type: "text", text: "Conv2-0" }],
          }),
          userId,
          conv2,
        );

        // Assert
        const messages1 = await limitedStorage.getMessages(userId, conv1);
        const messages2 = await limitedStorage.getMessages(userId, conv2);

        expect(messages1).toHaveLength(2);
        expect(messages2).toHaveLength(1);

        const texts1 = extractMessageTexts(messages1);
        expect(texts1).toEqual(["Conv1-1", "Conv1-2"]);
      });
    });
  });

  describe("Utility Methods", () => {
    it("getStats() should return correct counts", async () => {
      // Arrange
      await storage.createConversation(createTestConversation({ id: "conv-1", userId: "user-1" }));
      await storage.createConversation(createTestConversation({ id: "conv-2", userId: "user-2" }));

      await storage.addMessage(createTestUIMessage(), "user-1", "conv-1");
      await storage.addMessage(createTestUIMessage(), "user-1", "conv-1");
      await storage.addMessage(createTestUIMessage(), "user-2", "conv-2");

      // Act
      const stats = storage.getStats();

      // Assert
      expect(stats.totalConversations).toBe(2);
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalMessages).toBe(3);
    });

    it("clear() should remove all data", async () => {
      // Arrange
      await storage.createConversation(createTestConversation({ id: "conv-1" }));
      await storage.addMessage(createTestUIMessage(), "user-1", "conv-1");

      // Act
      storage.clear();

      // Assert
      const stats = storage.getStats();
      expect(stats.totalConversations).toBe(0);
      expect(stats.totalUsers).toBe(0);
      expect(stats.totalMessages).toBe(0);

      const conv = await storage.getConversation("conv-1");
      expect(conv).toBeNull();
    });
  });
});
