import type { Conversation } from "@voltagent/core";
import type { UIMessage } from "ai";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PostgreSQLMemoryAdapter } from "./memory-adapter";

// Test configuration - uses DATABASE_URL with fallback to local Docker defaults as defined in docker-compose.test.yaml
const TEST_CONFIG = {
  connection: process.env.DATABASE_URL || "postgresql://test:test@localhost:5433/voltagent_test",
  tablePrefix: "test_voltagent",
  debug: true,
};

describe("PostgreSQLMemoryAdapter Integration Tests", () => {
  let storage: PostgreSQLMemoryAdapter;

  beforeAll(async () => {
    storage = new PostgreSQLMemoryAdapter(TEST_CONFIG);
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

    it("should add multiple messages at once", async () => {
      const conversation = {
        id: "test-conv-batch",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Batch Message Test",
        metadata: {},
      };

      await storage.createConversation(conversation);

      const messages: UIMessage[] = [
        {
          id: "batch-msg-1",
          role: "user",
          parts: [{ type: "text", text: "First message" }],
          metadata: {},
        },
        {
          id: "batch-msg-2",
          role: "assistant",
          parts: [{ type: "text", text: "Second message" }],
          metadata: {},
        },
        {
          id: "batch-msg-3",
          role: "user",
          parts: [{ type: "text", text: "Third message" }],
          metadata: {},
        },
      ];

      await storage.addMessages(messages, conversation.userId, conversation.id);

      const retrieved = await storage.getMessages(conversation.userId, conversation.id);
      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].parts[0]).toEqual({ type: "text", text: "First message" });
      expect(retrieved[1].parts[0]).toEqual({ type: "text", text: "Second message" });
      expect(retrieved[2].parts[0]).toEqual({ type: "text", text: "Third message" });
    });

    it("should filter messages by role", async () => {
      const conversation = {
        id: "test-conv-filter",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Filter Test",
        metadata: {},
      };

      await storage.createConversation(conversation);

      const messages: UIMessage[] = [
        {
          id: "filter-msg-1",
          role: "user",
          parts: [{ type: "text", text: "User message 1" }],
          metadata: {},
        },
        {
          id: "filter-msg-2",
          role: "assistant",
          parts: [{ type: "text", text: "Assistant message" }],
          metadata: {},
        },
        {
          id: "filter-msg-3",
          role: "user",
          parts: [{ type: "text", text: "User message 2" }],
          metadata: {},
        },
      ];

      await storage.addMessages(messages, conversation.userId, conversation.id);

      const userMessages = await storage.getMessages(conversation.userId, conversation.id, {
        roles: ["user"],
      });

      expect(userMessages).toHaveLength(2);
      expect(userMessages.every((m) => m.role === "user")).toBe(true);
    });
  });

  describe("Working Memory Operations", () => {
    it("should set and get conversation-scoped working memory", async () => {
      const conversation = {
        id: "test-conv-wm",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Working Memory Test",
        metadata: {},
      };

      await storage.createConversation(conversation);

      await storage.setWorkingMemory({
        conversationId: conversation.id,
        scope: "conversation",
        content: "This is test working memory content",
      });

      const memory = await storage.getWorkingMemory({
        conversationId: conversation.id,
        scope: "conversation",
      });

      expect(memory).toBe("This is test working memory content");
    });

    it("should set and get user-scoped working memory", async () => {
      const userId = "test-user-wm";

      await storage.setWorkingMemory({
        userId,
        scope: "user",
        content: "User-level working memory",
      });

      const memory = await storage.getWorkingMemory({
        userId,
        scope: "user",
      });

      expect(memory).toBe("User-level working memory");
    });

    it("should delete working memory", async () => {
      const conversation = {
        id: "test-conv-wm-delete",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Delete WM Test",
        metadata: {},
      };

      await storage.createConversation(conversation);

      // Set memory
      await storage.setWorkingMemory({
        conversationId: conversation.id,
        scope: "conversation",
        content: "Memory to be deleted",
      });

      // Verify it exists
      let memory = await storage.getWorkingMemory({
        conversationId: conversation.id,
        scope: "conversation",
      });
      expect(memory).toBe("Memory to be deleted");

      // Delete it
      await storage.deleteWorkingMemory({
        conversationId: conversation.id,
        scope: "conversation",
      });

      // Verify it's gone
      memory = await storage.getWorkingMemory({
        conversationId: conversation.id,
        scope: "conversation",
      });
      expect(memory).toBeNull();
    });
  });

  describe("Workflow State Operations", () => {
    it("should save and retrieve workflow state", async () => {
      const state = {
        id: "wf-test-1",
        workflowId: "test-workflow",
        workflowName: "Test Workflow",
        status: "running" as const,
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await storage.setWorkflowState(state.id, state);

      const retrieved = await storage.getWorkflowState(state.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(state.id);
      expect(retrieved?.workflowId).toBe(state.workflowId);
      expect(retrieved?.status).toBe(state.status);
    });

    it("should update workflow state", async () => {
      const state = {
        id: "wf-test-2",
        workflowId: "test-workflow",
        workflowName: "Test Workflow",
        status: "running" as const,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await storage.setWorkflowState(state.id, state);

      await storage.updateWorkflowState(state.id, {
        status: "completed",
        updatedAt: new Date(),
      });

      const updated = await storage.getWorkflowState(state.id);
      expect(updated?.status).toBe("completed");
    });

    it("should get suspended workflow states", async () => {
      const workflowId = "test-workflow-suspended";

      // Create multiple workflow states
      const states = [
        {
          id: "wf-susp-1",
          workflowId,
          workflowName: "Test Workflow",
          status: "suspended" as const,
          suspension: {
            suspendedAt: new Date(),
            stepIndex: 1,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "wf-susp-2",
          workflowId,
          workflowName: "Test Workflow",
          status: "running" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "wf-susp-3",
          workflowId,
          workflowName: "Test Workflow",
          status: "suspended" as const,
          suspension: {
            suspendedAt: new Date(),
            stepIndex: 2,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const state of states) {
        await storage.setWorkflowState(state.id, state);
      }

      const suspended = await storage.getSuspendedWorkflowStates(workflowId);

      // Should only return suspended states
      expect(suspended.length).toBeGreaterThanOrEqual(2);
      expect(suspended.every((s) => s.status === "suspended")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      const badStorage = new PostgreSQLMemoryAdapter({
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
      // Try to add a message to a non-existent conversation
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

    it("should handle duplicate conversation IDs", async () => {
      const conversation = {
        id: "test-conv-duplicate",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Duplicate Test",
        metadata: {},
      };

      await storage.createConversation(conversation);

      // Try to create the same conversation again
      await expect(storage.createConversation(conversation)).rejects.toThrow();
    });
  });

  describe("Query Operations", () => {
    it("should query conversations with filters", async () => {
      // Create test conversations
      const conversations = [
        {
          id: "query-conv-1",
          resourceId: "resource-1",
          userId: "user-1",
          title: "First",
          metadata: {},
        },
        {
          id: "query-conv-2",
          resourceId: "resource-2",
          userId: "user-1",
          title: "Second",
          metadata: {},
        },
        {
          id: "query-conv-3",
          resourceId: "resource-1",
          userId: "user-2",
          title: "Third",
          metadata: {},
        },
      ];

      for (const conv of conversations) {
        await storage.createConversation(conv);
      }

      // Query by userId
      const user1Convs = await storage.queryConversations({ userId: "user-1" });
      expect(user1Convs.length).toBeGreaterThanOrEqual(2);
      expect(user1Convs.every((c) => c.userId === "user-1")).toBe(true);

      // Query by resourceId
      const resource1Convs = await storage.queryConversations({ resourceId: "resource-1" });
      expect(resource1Convs.length).toBeGreaterThanOrEqual(2);
      expect(resource1Convs.every((c) => c.resourceId === "resource-1")).toBe(true);

      // Query with limit
      const limitedConvs = await storage.queryConversations({
        userId: "user-1",
        limit: 1,
      });
      expect(limitedConvs).toHaveLength(1);
    });

    it("should update conversation metadata", async () => {
      const conversation = {
        id: "test-conv-update",
        resourceId: "test-resource",
        userId: "test-user",
        title: "Original Title",
        metadata: { version: 1 },
      };

      await storage.createConversation(conversation);

      const updated = await storage.updateConversation(conversation.id, {
        title: "Updated Title",
        metadata: { version: 2, updated: true },
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.metadata).toEqual({ version: 2, updated: true });

      // Verify the update persisted
      const retrieved = await storage.getConversation(conversation.id);
      expect(retrieved?.title).toBe("Updated Title");
      expect(retrieved?.metadata).toEqual({ version: 2, updated: true });
    });
  });
});
