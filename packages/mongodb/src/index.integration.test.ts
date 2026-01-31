/**
 * Integration tests for MongoDB Memory Storage Adapter
 * Tests against real MongoDB instance running in Docker
 */

import { ConversationAlreadyExistsError, ConversationNotFoundError } from "@voltagent/core";
import type { UIMessage } from "ai";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoDBMemoryAdapter } from "./memory-adapter";

describe("MongoDBMemoryAdapter - Integration Tests", () => {
  let adapter: MongoDBMemoryAdapter;

  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
  const TEST_DATABASE = "voltagent_test";

  beforeAll(async () => {
    // Create adapter with test database
    adapter = new MongoDBMemoryAdapter({
      connection: MONGO_URI,
      database: TEST_DATABASE,
      collectionPrefix: "test_memory",
      debug: false,
    });

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    // Clean up all collections before each test
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(TEST_DATABASE);

    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      if (collection.name.startsWith("test_memory_")) {
        await db.collection(collection.name).deleteMany({});
      }
    }

    await client.close();
  });

  afterAll(async () => {
    // Close adapter connection
    await adapter.close();
  });

  // ============================================================================
  // Message Operations Integration Tests
  // ============================================================================

  describe("Message Operations", () => {
    it("should add and retrieve messages", async () => {
      // Create conversation first
      const conversation = await adapter.createConversation({
        id: "conv-1",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test Conversation",
        metadata: {},
      });

      expect(conversation.id).toBe("conv-1");

      // Add message
      const message: UIMessage = {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello, world!" }],
        metadata: { custom: "data" },
      };

      await adapter.addMessage(message, "user-1", "conv-1");

      // Retrieve messages
      const messages = await adapter.getMessages("user-1", "conv-1");

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-1");
      expect(messages[0].role).toBe("user");
      expect(messages[0].parts).toEqual(message.parts);
      expect(messages[0].metadata?.createdAt).toBeInstanceOf(Date);
    });

    it("should add multiple messages in batch", async () => {
      await adapter.createConversation({
        id: "conv-2",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      const messages: UIMessage[] = [
        { id: "msg-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
        { id: "msg-2", role: "assistant", parts: [{ type: "text", text: "Hi there!" }] },
        { id: "msg-3", role: "user", parts: [{ type: "text", text: "How are you?" }] },
      ];

      await adapter.addMessages(messages, "user-1", "conv-2");

      const retrieved = await adapter.getMessages("user-1", "conv-2");

      expect(retrieved).toHaveLength(3);
      expect(retrieved.map((m) => m.id)).toEqual(["msg-1", "msg-2", "msg-3"]);
    });

    it("should filter messages by role", async () => {
      await adapter.createConversation({
        id: "conv-3",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      await adapter.addMessages(
        [
          { id: "msg-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
          { id: "msg-2", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
          { id: "msg-3", role: "user", parts: [{ type: "text", text: "How are you?" }] },
        ],
        "user-1",
        "conv-3",
      );

      const userMessages = await adapter.getMessages("user-1", "conv-3", { roles: ["user"] });

      expect(userMessages).toHaveLength(2);
      expect(userMessages.every((m) => m.role === "user")).toBe(true);
    });

    it("should clear messages for a conversation", async () => {
      await adapter.createConversation({
        id: "conv-4",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      await adapter.addMessage(
        { id: "msg-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
        "user-1",
        "conv-4",
      );

      await adapter.clearMessages("user-1", "conv-4");

      const messages = await adapter.getMessages("user-1", "conv-4");
      expect(messages).toHaveLength(0);
    });

    it("should throw error when adding message to non-existent conversation", async () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      };

      await expect(adapter.addMessage(message, "user-1", "non-existent")).rejects.toThrow(
        ConversationNotFoundError,
      );
    });
  });

  // ============================================================================
  // Conversation Operations Integration Tests
  // ============================================================================

  describe("Conversation Operations", () => {
    it("should create and retrieve conversation", async () => {
      const input = {
        id: "conv-create-test",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test Conversation",
        metadata: { custom: "field" },
      };

      const created = await adapter.createConversation(input);

      expect(created.id).toBe(input.id);
      expect(created.title).toBe(input.title);
      expect(created.metadata).toEqual(input.metadata);
      expect(created.createdAt).toBeTypeOf("string");
      expect(created.updatedAt).toBeTypeOf("string");

      const retrieved = await adapter.getConversation("conv-create-test");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(input.id);
    });

    it("should throw error when creating duplicate conversation", async () => {
      const input = {
        id: "conv-duplicate",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      };

      await adapter.createConversation(input);

      await expect(adapter.createConversation(input)).rejects.toThrow(
        ConversationAlreadyExistsError,
      );
    });

    it("should update conversation", async () => {
      await adapter.createConversation({
        id: "conv-update",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Original Title",
        metadata: {},
      });

      const updated = await adapter.updateConversation("conv-update", {
        title: "Updated Title",
        metadata: { updated: true },
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.metadata.updated).toBe(true);
    });

    it("should delete conversation and cascade to messages", async () => {
      await adapter.createConversation({
        id: "conv-delete",
        resourceId: "resource-1",
        userId: "user-1",
        title: "To Delete",
        metadata: {},
      });

      await adapter.addMessage(
        { id: "msg-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
        "user-1",
        "conv-delete",
      );

      await adapter.deleteConversation("conv-delete");

      const conversation = await adapter.getConversation("conv-delete");
      expect(conversation).toBeNull();

      const messages = await adapter.getMessages("user-1", "conv-delete");
      expect(messages).toHaveLength(0);
    });

    it("should query conversations with pagination", async () => {
      // Create multiple conversations
      for (let i = 1; i <= 5; i++) {
        await adapter.createConversation({
          id: `conv-query-${i}`,
          resourceId: "resource-1",
          userId: "user-1",
          title: `Conversation ${i}`,
          metadata: {},
        });
        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const page1 = await adapter.queryConversations({
        userId: "user-1",
        limit: 2,
        offset: 0,
      });

      expect(page1).toHaveLength(2);

      const page2 = await adapter.queryConversations({
        userId: "user-1",
        limit: 2,
        offset: 2,
      });

      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it("should get conversations by resourceId", async () => {
      await adapter.createConversation({
        id: "conv-res-1",
        resourceId: "resource-test",
        userId: "user-1",
        title: "Test 1",
        metadata: {},
      });

      await adapter.createConversation({
        id: "conv-res-2",
        resourceId: "resource-test",
        userId: "user-2",
        title: "Test 2",
        metadata: {},
      });

      const conversations = await adapter.getConversations("resource-test");

      expect(conversations).toHaveLength(2);
    });
  });

  // ============================================================================
  // Working Memory Integration Tests
  // ============================================================================

  describe("Working Memory Operations", () => {
    it("should set and get conversation-scoped working memory", async () => {
      await adapter.createConversation({
        id: "conv-memory",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      await adapter.setWorkingMemory({
        conversationId: "conv-memory",
        content: "Important context about this conversation",
        scope: "conversation",
      });

      const memory = await adapter.getWorkingMemory({
        conversationId: "conv-memory",
        scope: "conversation",
      });

      expect(memory).toBe("Important context about this conversation");
    });

    it("should set and get user-scoped working memory", async () => {
      await adapter.setWorkingMemory({
        userId: "user-memory-test",
        content: "User preferences and context",
        scope: "user",
      });

      const memory = await adapter.getWorkingMemory({
        userId: "user-memory-test",
        scope: "user",
      });

      expect(memory).toBe("User preferences and context");
    });

    it("should delete working memory", async () => {
      await adapter.createConversation({
        id: "conv-del-memory",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      await adapter.setWorkingMemory({
        conversationId: "conv-del-memory",
        content: "Test memory",
        scope: "conversation",
      });

      await adapter.deleteWorkingMemory({
        conversationId: "conv-del-memory",
        scope: "conversation",
      });

      const memory = await adapter.getWorkingMemory({
        conversationId: "conv-del-memory",
        scope: "conversation",
      });

      expect(memory).toBeNull();
    });
  });

  // ============================================================================
  // Workflow State Integration Tests
  // ============================================================================

  describe("Workflow State Operations", () => {
    it("should set and get workflow state", async () => {
      const state: any = {
        id: "exec-1",
        workflowId: "workflow-1",
        workflowName: "Test Workflow",
        status: "running",
        suspension: null,
        events: [],
        output: null,
        cancellation: null,
        userId: "user-1",
        conversationId: "conv-1",
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await adapter.setWorkflowState("exec-1", state);

      const retrieved = await adapter.getWorkflowState("exec-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("exec-1");
      expect(retrieved?.status).toBe("running");
    });

    it("should update workflow state", async () => {
      const state: any = {
        id: "exec-update",
        workflowId: "workflow-1",
        workflowName: "Test",
        status: "running",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await adapter.setWorkflowState("exec-update", state);

      await adapter.updateWorkflowState("exec-update", {
        status: "completed",
        output: { result: "success" },
      });

      const updated = await adapter.getWorkflowState("exec-update");

      expect(updated?.status).toBe("completed");
      expect(updated?.output).toEqual({ result: "success" });
    });

    it("should query workflow runs", async () => {
      const now = new Date();

      for (let i = 1; i <= 3; i++) {
        await adapter.setWorkflowState(`exec-query-${i}`, {
          id: `exec-query-${i}`,
          workflowId: "workflow-query",
          workflowName: "Test",
          status: i === 1 ? "completed" : "running",
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      const allRuns = await adapter.queryWorkflowRuns({
        workflowId: "workflow-query",
      });

      expect(allRuns.length).toBeGreaterThanOrEqual(3);

      const completedRuns = await adapter.queryWorkflowRuns({
        workflowId: "workflow-query",
        status: "completed",
      });

      expect(completedRuns).toHaveLength(1);
    });

    it("should get suspended workflow states", async () => {
      const now = new Date();

      await adapter.setWorkflowState("exec-suspended-1", {
        id: "exec-suspended-1",
        workflowId: "workflow-suspend",
        workflowName: "Test",
        status: "suspended",
        createdAt: now,
        updatedAt: now,
      } as any);

      await adapter.setWorkflowState("exec-running-1", {
        id: "exec-running-1",
        workflowId: "workflow-suspend",
        workflowName: "Test",
        status: "running",
        createdAt: now,
        updatedAt: now,
      } as any);

      const suspended = await adapter.getSuspendedWorkflowStates("workflow-suspend");

      expect(suspended).toHaveLength(1);
      expect(suspended[0].status).toBe("suspended");
    });
  });

  // ============================================================================
  // Conversation Steps Integration Tests
  // ============================================================================

  describe("Conversation Steps Operations", () => {
    it("should save and retrieve conversation steps", async () => {
      await adapter.createConversation({
        id: "conv-steps",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      const steps: any[] = [
        {
          id: "step-1",
          conversationId: "conv-steps",
          userId: "user-1",
          agentId: "agent-1",
          agentName: "Test Agent",
          operationId: "op-1",
          stepIndex: 0,
          type: "message",
          role: "user",
          content: "Hello",
        },
        {
          id: "step-2",
          conversationId: "conv-steps",
          userId: "user-1",
          agentId: "agent-1",
          agentName: "Test Agent",
          operationId: "op-1",
          stepIndex: 1,
          type: "message",
          role: "assistant",
          content: "Hi there",
        },
      ];

      await adapter.saveConversationSteps(steps);

      const retrieved = await adapter.getConversationSteps("user-1", "conv-steps");

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].stepIndex).toBe(0);
      expect(retrieved[1].stepIndex).toBe(1);
    });

    it("should filter steps by operationId", async () => {
      await adapter.createConversation({
        id: "conv-steps-filter",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      await adapter.saveConversationSteps([
        {
          id: "step-op1",
          conversationId: "conv-steps-filter",
          userId: "user-1",
          agentId: "agent-1",
          operationId: "op-1",
          stepIndex: 0,
          type: "message",
          role: "user",
        } as any,
        {
          id: "step-op2",
          conversationId: "conv-steps-filter",
          userId: "user-1",
          agentId: "agent-1",
          operationId: "op-2",
          stepIndex: 1,
          type: "message",
          role: "user",
        } as any,
      ]);

      const op1Steps = await adapter.getConversationSteps("user-1", "conv-steps-filter", {
        operationId: "op-1",
      });

      expect(op1Steps).toHaveLength(1);
      expect(op1Steps[0].operationId).toBe("op-1");
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle empty message arrays", async () => {
      await adapter.createConversation({
        id: "conv-empty",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      await adapter.addMessages([], "user-1", "conv-empty");
      const messages = await adapter.getMessages("user-1", "conv-empty");

      expect(messages).toHaveLength(0);
    });

    it("should return empty array for non-existent conversation messages", async () => {
      const messages = await adapter.getMessages("user-1", "non-existent");
      expect(messages).toHaveLength(0);
    });

    it("should handle messages without IDs", async () => {
      await adapter.createConversation({
        id: "conv-no-id",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      const message: UIMessage = {
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        id: "",
      };

      await adapter.addMessage(message, "user-1", "conv-no-id");

      const messages = await adapter.getMessages("user-1", "conv-no-id");

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBeTruthy();
    });

    it("should handle pagination beyond available results", async () => {
      await adapter.createConversation({
        id: "conv-pagination",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test",
        metadata: {},
      });

      const conversations = await adapter.queryConversations({
        userId: "user-1",
        limit: 10,
        offset: 100,
      });

      expect(conversations).toHaveLength(0);
    });
  });
});
