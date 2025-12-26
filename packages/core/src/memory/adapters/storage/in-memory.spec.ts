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
import type { WorkflowStateEntry } from "../../types";
import { InMemoryStorageAdapter } from "./in-memory";

describe("InMemoryStorageAdapter", () => {
  let storage: InMemoryStorageAdapter;

  beforeEach(() => {
    storage = new InMemoryStorageAdapter();
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

      it("should return UIMessage with createdAt in metadata", async () => {
        // Act
        const messages = await storage.getMessages(userId, conversationId);

        // Assert
        messages.forEach((msg) => {
          expect(msg.metadata).toBeDefined();
          expect(msg.metadata).toHaveProperty("createdAt");
          expect(msg.metadata?.createdAt).toBeInstanceOf(Date);
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
  });

  describe("Workflow State Operations", () => {
    const baseState = (overrides: Partial<WorkflowStateEntry> = {}): WorkflowStateEntry => ({
      id: "exec-1",
      workflowId: "workflow-123",
      workflowName: "Test Workflow",
      status: "running",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      ...overrides,
    });

    it("should return workflow states for a workflow ordered by creation time", async () => {
      const workflowId = "workflow-123";
      const olderState = baseState({ id: "exec-older" });
      const newerState = baseState({
        id: "exec-newer",
        status: "completed",
        createdAt: new Date("2024-02-01T00:00:00Z"),
        updatedAt: new Date("2024-02-01T00:00:00Z"),
      });
      const otherWorkflowState = baseState({
        id: "exec-other",
        workflowId: "another-workflow",
      });

      await storage.setWorkflowState(olderState.id, olderState);
      await storage.setWorkflowState(newerState.id, newerState);
      await storage.setWorkflowState(otherWorkflowState.id, otherWorkflowState);

      const result = await storage.queryWorkflowRuns({ workflowId });

      expect(result.map((state) => state.id)).toEqual(["exec-newer", "exec-older"]);
      expect(result.every((state) => state.workflowId === workflowId)).toBe(true);
    });

    it("should return empty array when workflow has no states", async () => {
      const result = await storage.queryWorkflowRuns({ workflowId: "missing-workflow" });
      expect(result).toEqual([]);
    });

    it("should filter workflow states by status", async () => {
      await storage.setWorkflowState(
        "exec-running",
        baseState({ id: "exec-running", status: "running" }),
      );
      await storage.setWorkflowState(
        "exec-completed",
        baseState({ id: "exec-completed", status: "completed" }),
      );

      const result = await storage.queryWorkflowRuns({ status: "completed" });
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("exec-completed");
    });

    it("should respect from/to and pagination", async () => {
      await storage.setWorkflowState(
        "exec-1",
        baseState({
          id: "exec-1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
        }),
      );
      await storage.setWorkflowState(
        "exec-2",
        baseState({
          id: "exec-2",
          createdAt: new Date("2024-02-01T00:00:00Z"),
          updatedAt: new Date("2024-02-01T00:00:00Z"),
        }),
      );
      await storage.setWorkflowState(
        "exec-3",
        baseState({
          id: "exec-3",
          createdAt: new Date("2024-03-01T00:00:00Z"),
          updatedAt: new Date("2024-03-01T00:00:00Z"),
        }),
      );

      const result = await storage.queryWorkflowRuns({
        workflowId: "workflow-123",
        from: new Date("2024-02-01T00:00:00Z"),
        to: new Date("2024-03-01T00:00:00Z"),
        limit: 1,
        offset: 0,
      });

      expect(result.map((s) => s.id)).toEqual(["exec-3"]);
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
