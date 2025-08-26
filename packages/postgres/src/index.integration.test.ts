import type { Conversation } from "@voltagent/core";
import type { UIMessage } from "ai";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgresStorage } from ".";

// Test configuration - uses DATABASE_URL with fallback to local Docker defaults as defined in docker-compose.test.yaml
const TEST_CONFIG = {
  connection: process.env.DATABASE_URL || "postgresql://test:test@localhost:5433/voltagent_test",
  tablePrefix: "test_voltagent",
  debug: true,
};

describe("PostgresStorage Integration Tests", () => {
  let storage: PostgresStorage;

  beforeAll(async () => {
    storage = new PostgresStorage(TEST_CONFIG);
    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (storage) {
      await storage.close();
    }
  });

  beforeEach(async () => {
    // Clean up data before each test
    try {
      await storage.clearMessages("test-user");
      const conversations = await storage.getConversations("test-resource");
      for (const conv of conversations) {
        await storage.deleteConversation(conv.id);
      }
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe("Real Database Operations", () => {
    it("should create and retrieve a conversation", async () => {
      const conversation = {
        id: "test-conv-1",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Integration Test Conversation",
        metadata: { test: true },
      };

      const created = await storage.createConversation(conversation);
      expect(created.id).toBe(conversation.id);
      expect(created.title).toBe(conversation.title);

      const retrieved = await storage.getConversation(conversation.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe(conversation.title);
    });

    it("should add and retrieve messages", async () => {
      const conversation = {
        id: "test-conv-2",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Message Test",
        metadata: {},
      };

      await storage.createConversation(conversation);

      const message: UIMessage = {
        id: "test-msg-1",
        role: "user",
        parts: [
          {
            type: "text",
            text: "Hello, this is a test message",
          },
        ],
        metadata: {},
      };

      await storage.addMessage(message, conversation.userId, conversation.id);

      const messages = await storage.getMessages(conversation.userId, conversation.id);

      expect(messages).toHaveLength(1);
      expect(messages[0].parts[0]).toEqual({
        type: "text",
        text: "Hello, this is a test message",
      });
      expect(messages[0].role).toBe(message.role);
    });

    it("should handle user-scoped operations", async () => {
      const user1Conv = {
        id: "user1-conv",
        resourceId: "test-resource",
        userId: "user1",
        title: "User 1 Conversation",
        metadata: {},
      };

      const user2Conv = {
        id: "user2-conv",
        resourceId: "test-resource",
        userId: "user2",
        title: "User 2 Conversation",
        metadata: {},
      };

      await storage.createConversation(user1Conv);
      await storage.createConversation(user2Conv);

      const user1Conversations = await storage.getConversationsByUserId("user1");
      const user2Conversations = await storage.getConversationsByUserId("user2");

      expect(user1Conversations).toHaveLength(1);
      expect(user2Conversations).toHaveLength(1);
      expect(user1Conversations[0].userId).toBe("user1");
      expect(user2Conversations[0].userId).toBe("user2");
    });

    it("should enforce storage limits", async () => {
      const limitedStorage = new PostgresStorage({
        ...TEST_CONFIG,
        storageLimit: 3,
        tablePrefix: "test_limited",
      });

      const conversation = {
        id: `limit-test-conv-${Date.now()}`, // Use unique ID to avoid conflicts
        resourceId: "test-resource",
        userId: "test-user",
        title: "Limit Test",
        metadata: {},
      };

      await limitedStorage.createConversation(conversation);

      // Add messages beyond the limit
      for (let i = 1; i <= 5; i++) {
        const message: UIMessage = {
          id: `msg-${i}`,
          role: "user",
          parts: [
            {
              type: "text",
              text: `Message ${i}`,
            },
          ],
          metadata: {},
        };
        await limitedStorage.addMessage(message, conversation.userId, conversation.id);
        await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for ordering
      }

      const messages = await limitedStorage.getMessages(conversation.userId, conversation.id);

      // Should only have 3 messages (the limit)
      expect(messages.length).toBeLessThanOrEqual(3);

      await limitedStorage.close();
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      const badStorage = new PostgresStorage({
        connection: {
          host: "nonexistent-host",
          port: 9999,
          database: "nonexistent",
          user: "nonexistent",
          password: "nonexistent",
        },
      });

      await expect(badStorage.getConversation("test-id")).rejects.toThrow();
    });

    it("should handle invalid data gracefully", async () => {
      // Try to add a message to a non-existent conversation (should fail due to foreign key constraint)
      const invalidMessage = {
        id: "test-msg-invalid",
        role: "user",
        parts: [
          {
            type: "text",
            text: "Test message",
          },
        ],
        metadata: {},
      } as UIMessage;

      await expect(
        storage.addMessage(invalidMessage, "test-user", "non-existent-conversation"),
      ).rejects.toThrow();
    });
  });
});
