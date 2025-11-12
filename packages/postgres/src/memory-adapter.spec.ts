/**
 * Unit tests for PostgreSQL Memory Storage Adapter
 * Tests all functionality using mocked pg client
 */

import { ConversationAlreadyExistsError } from "@voltagent/core";
import type { UIMessage } from "ai";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgreSQLMemoryAdapter } from "./memory-adapter";

// Mock the pg module
vi.mock("pg", () => ({
  Pool: vi.fn(),
}));

describe.sequential("PostgreSQLMemoryAdapter - Core Functionality", () => {
  let adapter: PostgreSQLMemoryAdapter;

  // Mock functions
  const mockQuery = vi.fn();
  const mockRelease = vi.fn();
  const mockConnect = vi.fn();
  const mockPoolQuery = vi.fn();
  const mockEnd = vi.fn();

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Mock an empty database result
   */
  const mockEmptyResult = () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
  };

  /**
   * Mock a database result with data
   */
  const mockResultWith = (data: any) => {
    mockQuery.mockResolvedValueOnce({
      rows: Array.isArray(data) ? data : [data],
    });
  };

  /**
   * Mock a successful transaction (BEGIN + COMMIT)
   */
  const mockTransaction = () => {
    mockEmptyResult(); // BEGIN
    return {
      commit: () => mockEmptyResult(), // COMMIT
      rollback: () => mockEmptyResult(), // ROLLBACK
    };
  };

  /**
   * Mock database initialization queries
   */
  const mockInitialization = () => {
    mockEmptyResult(); // BEGIN
    mockEmptyResult(); // CREATE TABLE users
    mockEmptyResult(); // CREATE TABLE conversations
    mockEmptyResult(); // CREATE TABLE messages
    mockEmptyResult(); // CREATE TABLE workflow_states
    mockEmptyResult(); // CREATE TABLE steps

    // CREATE INDEX (8 indexes)
    for (let i = 0; i < 8; i++) {
      mockEmptyResult();
    }

    // addUIMessageColumnsToMessagesTable (fails but is caught)
    mockQuery.mockRejectedValueOnce(new Error("column already exists"));

    mockEmptyResult(); // COMMIT
  };

  /**
   * Create test conversation data
   */
  const createConversationData = (overrides = {}) => ({
    id: "conv-test",
    resource_id: "resource-1",
    user_id: "user-1",
    title: "Test Conversation",
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  /**
   * Mock a getConversation query result
   */
  const mockGetConversation = (data?: any) => {
    if (data) {
      mockResultWith(data);
    } else {
      mockEmptyResult(); // Conversation doesn't exist
    }
  };

  /**
   * Mock pool.query (for workflow operations)
   */
  const mockPoolQueryResult = (data: any) => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: Array.isArray(data) ? data : [data],
    });
  };

  // ============================================================================
  // Test Setup
  // ============================================================================

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock client
    const mockClient = {
      query: mockQuery,
      release: mockRelease,
    };

    // Mock connect to return the client
    mockConnect.mockResolvedValue(mockClient);

    // Mock Pool constructor
    vi.mocked(Pool).mockImplementation(
      () =>
        ({
          connect: mockConnect,
          query: mockPoolQuery,
          end: mockEnd,
        }) as any,
    );

    // Mock initialization - will be called in constructor
    mockInitialization();

    // Create adapter - initialization starts in constructor
    adapter = new PostgreSQLMemoryAdapter({
      connection: {
        host: "localhost",
        port: 5432,
        database: "test",
        user: "test",
        password: "test",
      },
      tablePrefix: "test",
      debug: false,
    });

    // Wait for initialization to complete before tests run
    // @ts-expect-error - accessing private property for testing
    await adapter.initPromise;
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ============================================================================
  // Conversation Tests
  // ============================================================================

  describe("Conversations", () => {
    it("should create and retrieve a conversation", async () => {
      const conversationData = createConversationData({
        id: "conv-test-1",
        title: "Test Conversation",
        metadata: { test: true },
      });

      // Create conversation
      mockGetConversation(null); // Check doesn't exist
      mockResultWith(conversationData); // INSERT result

      const conversation = await adapter.createConversation({
        id: "conv-test-1",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test Conversation",
        metadata: { test: true },
      });

      expect(conversation.id).toBe("conv-test-1");
      expect(conversation.title).toBe("Test Conversation");
      expect(conversation.metadata).toEqual({ test: true });

      // Retrieve conversation
      mockGetConversation(conversationData);

      const retrieved = await adapter.getConversation("conv-test-1");
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe("conv-test-1");
    });

    it("should handle duplicate conversation IDs", async () => {
      const existingConversation = createConversationData({
        id: "conv-dup",
        title: "First",
      });

      // Try to create duplicate
      mockGetConversation(existingConversation); // Already exists!

      await expect(
        adapter.createConversation({
          id: "conv-dup",
          resourceId: "resource-1",
          userId: "user-1",
          title: "Second",
          metadata: {},
        }),
      ).rejects.toThrow(ConversationAlreadyExistsError);
    });

    it("should update conversation", async () => {
      const originalData = createConversationData({
        id: "conv-update",
        title: "Original",
        metadata: { version: 1 },
      });

      // Create conversation first
      mockGetConversation(null);
      mockResultWith(originalData);

      await adapter.createConversation({
        id: "conv-update",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Original",
        metadata: { version: 1 },
      });

      // Update conversation
      const tx = mockTransaction();
      mockGetConversation(originalData); // Check exists
      mockResultWith({
        ...originalData,
        title: "Updated",
        metadata: { version: 2 },
      }); // UPDATE result
      tx.commit();

      const updated = await adapter.updateConversation("conv-update", {
        title: "Updated",
        metadata: { version: 2 },
      });

      expect(updated.title).toBe("Updated");
      expect(updated.metadata).toEqual({ version: 2 });
    });

    it("should delete conversation", async () => {
      // Delete is simple - just one DELETE query
      mockEmptyResult();

      await adapter.deleteConversation("conv-delete");

      // Verify deletion
      mockGetConversation(null);
      const deleted = await adapter.getConversation("conv-delete");
      expect(deleted).toBeNull();
    });
  });

  // ============================================================================
  // Advanced Behavior Tests (SQL shapes, filters)
  // ============================================================================

  describe("Advanced Behavior", () => {
    it("should apply roles and time filters when getting messages", async () => {
      const before = new Date("2020-02-02T00:00:00.000Z");
      const after = new Date("2020-01-01T00:00:00.000Z");
      const roles = ["user", "assistant"] as const;

      // getMessages SELECT returns empty
      mockResultWith([]);

      await adapter.getMessages("user-1", "conv-1", {
        roles: roles as any,
        before,
        after,
        limit: 5,
      });

      const last = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
      const sql: string = last[0];
      const params: any[] = last[1];
      expect(sql).toContain("FROM test_messages");
      expect(sql).toContain("WHERE conversation_id = $1 AND user_id = $2");
      expect(sql).toContain("AND role IN ($3,$4)");
      expect(sql).toContain("AND created_at < $");
      expect(sql).toContain("AND created_at > $");
      expect(sql).toContain("ORDER BY created_at ASC");
      expect(sql).toContain("LIMIT $");
      expect(params).toEqual([
        "conv-1",
        "user-1",
        "user",
        "assistant",
        before.toISOString(),
        after.toISOString(),
        5,
      ]);
    });

    it("should order and paginate conversations correctly", async () => {
      mockResultWith([]);

      await adapter.queryConversations({
        userId: "user-1",
        resourceId: "resource-1",
        orderBy: "updated_at",
        orderDirection: "ASC",
        limit: 10,
        offset: 20,
      });

      const last = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
      const sql: string = last[0];
      const params: any[] = last[1];
      expect(sql).toContain("FROM test_conversations");
      expect(sql).toContain("user_id = $1");
      expect(sql).toContain("resource_id = $2");
      expect(sql).toContain("ORDER BY updated_at ASC");
      expect(sql).toContain("LIMIT $3");
      expect(sql).toContain("OFFSET $4");
      expect(params).toEqual(["user-1", "resource-1", 10, 20]);
    });

    it("should clear all messages for a user (no conversationId)", async () => {
      const tx = mockTransaction();
      mockEmptyResult(); // DELETE by subquery
      mockEmptyResult(); // DELETE steps by subquery
      tx.commit();

      await adapter.clearMessages("user-1");

      const messageDelete = mockQuery.mock.calls[mockQuery.mock.calls.length - 3];
      expect(messageDelete[0]).toContain(
        "DELETE FROM test_messages\n           WHERE conversation_id IN (\n             SELECT id FROM test_conversations WHERE user_id = $1\n           )",
      );
      expect(messageDelete[1]).toEqual(["user-1"]);

      const stepsDelete = mockQuery.mock.calls[mockQuery.mock.calls.length - 2];
      expect(stepsDelete[0]).toContain(
        "DELETE FROM test_steps\n           WHERE conversation_id IN (\n             SELECT id FROM test_conversations WHERE user_id = $1\n           )",
      );
      expect(stepsDelete[1]).toEqual(["user-1"]);
    });
  });

  // ============================================================================
  // Message Tests
  // ============================================================================

  describe("Messages", () => {
    let conversationId: string;

    beforeEach(async () => {
      conversationId = "conv-msg-test";

      // Create conversation for message tests
      const conversationData = createConversationData({
        id: conversationId,
        title: "Message Test",
      });

      mockGetConversation(null);
      mockResultWith(conversationData);

      await adapter.createConversation({
        id: conversationId,
        resourceId: "resource-1",
        userId: "user-1",
        title: "Message Test",
        metadata: {},
      });
    });

    it("should add and retrieve messages", async () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        metadata: {},
      };

      // Add message
      const tx = mockTransaction();
      mockGetConversation(createConversationData({ id: conversationId }));
      mockEmptyResult(); // INSERT message
      tx.commit();

      await adapter.addMessage(message, "user-1", conversationId);

      // Retrieve messages
      mockResultWith({
        message_id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        metadata: {},
      });

      const messages = await adapter.getMessages("user-1", conversationId);
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe("msg-1");
      expect(messages[0].parts[0]).toEqual({ type: "text", text: "Hello" });
    });

    it("should add multiple messages", async () => {
      const messages: UIMessage[] = [
        {
          id: "msg-batch-1",
          role: "user",
          parts: [{ type: "text", text: "First" }],
          metadata: {},
        },
        {
          id: "msg-batch-2",
          role: "assistant",
          parts: [{ type: "text", text: "Second" }],
          metadata: {},
        },
      ];

      // Add messages
      const tx = mockTransaction();
      mockGetConversation(createConversationData({ id: conversationId }));
      mockEmptyResult(); // INSERT first message
      mockEmptyResult(); // INSERT second message
      tx.commit();

      await adapter.addMessages(messages, "user-1", conversationId);

      // Retrieve messages
      mockResultWith([
        {
          message_id: "msg-batch-1",
          role: "user",
          parts: [{ type: "text", text: "First" }],
          metadata: {},
        },
        {
          message_id: "msg-batch-2",
          role: "assistant",
          parts: [{ type: "text", text: "Second" }],
          metadata: {},
        },
      ]);

      const retrieved = await adapter.getMessages("user-1", conversationId);
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe("msg-batch-1");
      expect(retrieved[1].id).toBe("msg-batch-2");
    });

    it("should filter messages by role", async () => {
      const testMessages: UIMessage[] = [
        {
          id: "msg-role-1",
          role: "user",
          parts: [{ type: "text", text: "User message" }],
          metadata: {},
        },
        {
          id: "msg-role-2",
          role: "assistant",
          parts: [{ type: "text", text: "Assistant message" }],
          metadata: {},
        },
        {
          id: "msg-role-3",
          role: "user",
          parts: [{ type: "text", text: "Another user message" }],
          metadata: {},
        },
      ];

      // Add messages
      const tx = mockTransaction();
      mockGetConversation(createConversationData({ id: conversationId }));
      // INSERT 3 messages
      for (let i = 0; i < 3; i++) {
        mockEmptyResult();
      }
      tx.commit();

      await adapter.addMessages(testMessages, "user-1", conversationId);

      // Get only user messages
      mockResultWith([
        {
          message_id: "msg-role-1",
          role: "user",
          parts: [{ type: "text", text: "User message" }],
          metadata: {},
        },
        {
          message_id: "msg-role-3",
          role: "user",
          parts: [{ type: "text", text: "Another user message" }],
          metadata: {},
        },
      ]);

      const userMessages = await adapter.getMessages("user-1", conversationId, {
        roles: ["user"],
      });
      expect(userMessages).toHaveLength(2);
      expect(userMessages.every((m) => m.role === "user")).toBe(true);
    });

    it("should clear messages", async () => {
      // Add a message first
      const tx1 = mockTransaction();
      mockGetConversation(createConversationData({ id: conversationId }));
      mockEmptyResult(); // INSERT
      tx1.commit();

      await adapter.addMessage(
        {
          id: "msg-clear",
          role: "user",
          parts: [{ type: "text", text: "To be cleared" }],
          metadata: {},
        },
        "user-1",
        conversationId,
      );

      // Clear messages
      const tx2 = mockTransaction();
      mockEmptyResult(); // DELETE
      tx2.commit();

      await adapter.clearMessages("user-1", conversationId);

      // Verify cleared
      mockEmptyResult(); // No messages

      const messages = await adapter.getMessages("user-1", conversationId);
      expect(messages).toHaveLength(0);
    });
  });

  // ============================================================================
  // Working Memory Tests
  // ============================================================================

  describe("Working Memory", () => {
    let conversationId: string;

    beforeEach(async () => {
      conversationId = "conv-wm-test";

      // Create conversation
      const conversationData = createConversationData({
        id: conversationId,
        title: "Working Memory Test",
      });

      mockGetConversation(null);
      mockResultWith(conversationData);

      await adapter.createConversation({
        id: conversationId,
        resourceId: "resource-1",
        userId: "user-1",
        title: "Working Memory Test",
        metadata: {},
      });
    });

    it("should set and get working memory for conversation", async () => {
      const conversationData = createConversationData({
        id: conversationId,
        title: "Working Memory Test",
      });

      // Set working memory
      const tx1 = mockTransaction();
      mockGetConversation(conversationData);

      // updateConversation internal calls
      const tx2 = mockTransaction();
      mockGetConversation(conversationData);
      mockResultWith({
        ...conversationData,
        metadata: { workingMemory: "Test memory content" },
      });
      tx2.commit();

      tx1.commit();

      await adapter.setWorkingMemory({
        conversationId,
        scope: "conversation",
        content: "Test memory content",
      });

      // Get working memory
      mockGetConversation({
        ...conversationData,
        metadata: { workingMemory: "Test memory content" },
      });

      const memory = await adapter.getWorkingMemory({
        conversationId,
        scope: "conversation",
      });

      expect(memory).toBe("Test memory content");
    });

    it("should handle user-scoped working memory", async () => {
      // Set user working memory
      const tx = mockTransaction();
      mockEmptyResult(); // SELECT user (doesn't exist)
      mockEmptyResult(); // INSERT new user record
      tx.commit();

      await adapter.setWorkingMemory({
        userId: "user-1",
        scope: "user",
        content: "User memory content",
      });

      // Get user working memory
      mockResultWith({
        id: "user-1",
        metadata: { workingMemory: "User memory content" },
      });

      const memory = await adapter.getWorkingMemory({
        userId: "user-1",
        scope: "user",
      });

      expect(memory).toBe("User memory content");
    });

    it("should delete working memory", async () => {
      const conversationData = createConversationData({
        id: conversationId,
        title: "Working Memory Test",
      });

      // Set memory first
      const tx1 = mockTransaction();
      mockGetConversation(conversationData);

      // updateConversation for set
      const tx2 = mockTransaction();
      mockGetConversation(conversationData);
      mockResultWith({
        ...conversationData,
        metadata: { workingMemory: "To be deleted" },
      });
      tx2.commit();

      tx1.commit();

      await adapter.setWorkingMemory({
        conversationId,
        scope: "conversation",
        content: "To be deleted",
      });

      // Delete memory
      const tx3 = mockTransaction();
      mockGetConversation({
        ...conversationData,
        metadata: { workingMemory: "To be deleted" },
      });

      // updateConversation for delete
      const tx4 = mockTransaction();
      mockGetConversation({
        ...conversationData,
        metadata: { workingMemory: "To be deleted" },
      });
      mockResultWith({
        ...conversationData,
        metadata: {}, // No working memory
      });
      tx4.commit();

      tx3.commit();

      await adapter.deleteWorkingMemory({
        conversationId,
        scope: "conversation",
      });

      // Verify deleted
      mockGetConversation({
        ...conversationData,
        metadata: {},
      });

      const memory = await adapter.getWorkingMemory({
        conversationId,
        scope: "conversation",
      });

      expect(memory).toBeNull();
    });
  });

  // ============================================================================
  // Workflow State Tests
  // ============================================================================

  describe("Workflow States", () => {
    it("should save and retrieve workflow state", async () => {
      const state = {
        id: "wf-1",
        workflowId: "test-workflow",
        workflowName: "Test Workflow",
        status: "suspended" as const,
        suspension: {
          suspendedAt: new Date(),
          stepIndex: 2,
          reason: "test",
        },
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save workflow state
      const tx = mockTransaction();
      mockEmptyResult(); // INSERT OR UPDATE
      tx.commit();

      await adapter.setWorkflowState("wf-1", state);

      // Get workflow state (uses pool.query)
      mockPoolQueryResult({
        id: state.id,
        workflow_id: state.workflowId,
        workflow_name: state.workflowName,
        status: state.status,
        suspension: state.suspension,
        user_id: null,
        conversation_id: null,
        metadata: state.metadata,
        created_at: state.createdAt,
        updated_at: state.updatedAt,
      });

      const retrieved = await adapter.getWorkflowState("wf-1");
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe("wf-1");
      expect(retrieved?.status).toBe("suspended");
    });

    it("should update workflow state", async () => {
      const initial = {
        id: "wf-2",
        workflowId: "test-workflow",
        workflowName: "Test Workflow",
        status: "running" as const,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set initial state
      const tx1 = mockTransaction();
      mockEmptyResult(); // INSERT OR UPDATE
      tx1.commit();

      await adapter.setWorkflowState("wf-2", initial);

      // Update workflow state
      mockPoolQueryResult({
        id: initial.id,
        workflow_id: initial.workflowId,
        workflow_name: initial.workflowName,
        status: initial.status,
        suspension: null,
        user_id: null,
        conversation_id: null,
        metadata: initial.metadata,
        created_at: initial.createdAt,
        updated_at: initial.updatedAt,
      });

      // setWorkflowState called internally
      const tx2 = mockTransaction();
      mockEmptyResult(); // INSERT OR UPDATE
      tx2.commit();

      await adapter.updateWorkflowState("wf-2", {
        status: "completed",
        updatedAt: new Date(),
      });

      // Verify update
      mockPoolQueryResult({
        id: "wf-2",
        workflow_id: initial.workflowId,
        workflow_name: initial.workflowName,
        status: "completed",
        suspension: null,
        user_id: null,
        conversation_id: null,
        metadata: initial.metadata,
        created_at: initial.createdAt,
        updated_at: new Date(),
      });

      const updated = await adapter.getWorkflowState("wf-2");
      expect(updated?.status).toBe("completed");
    });

    it("should get suspended workflow states", async () => {
      const states = [
        {
          id: "wf-susp-1",
          workflowId: "workflow-a",
          workflowName: "Workflow A",
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
          workflowId: "workflow-a",
          workflowName: "Workflow A",
          status: "running" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "wf-susp-3",
          workflowId: "workflow-a",
          workflowName: "Workflow A",
          status: "suspended" as const,
          suspension: {
            suspendedAt: new Date(),
            stepIndex: 3,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Save all states
      for (const state of states) {
        const tx = mockTransaction();
        mockEmptyResult(); // INSERT OR UPDATE
        tx.commit();

        await adapter.setWorkflowState(state.id, state);
      }

      // Get suspended states (uses pool.query)
      mockPoolQueryResult([
        {
          id: "wf-susp-1",
          workflow_id: "workflow-a",
          workflow_name: "Workflow A",
          status: "suspended",
          suspension: states[0].suspension,
          user_id: null,
          conversation_id: null,
          metadata: null,
          created_at: states[0].createdAt,
          updated_at: states[0].updatedAt,
        },
        {
          id: "wf-susp-3",
          workflow_id: "workflow-a",
          workflow_name: "Workflow A",
          status: "suspended",
          suspension: states[2].suspension,
          user_id: null,
          conversation_id: null,
          metadata: null,
          created_at: states[2].createdAt,
          updated_at: states[2].updatedAt,
        },
      ]);

      const suspended = await adapter.getSuspendedWorkflowStates("workflow-a");
      expect(suspended).toHaveLength(2);
      expect(suspended.every((s) => s.status === "suspended")).toBe(true);
    });
  });

  // ============================================================================
  // Schema Tests - Testing schema creation and table naming
  // ============================================================================

  describe.sequential("PostgreSQLMemoryAdapter - Schema Validation", () => {
    let adapter: PostgreSQLMemoryAdapter;

    // Mock functions
    const mockQuery = vi.fn();
    const mockRelease = vi.fn();
    const mockConnect = vi.fn();
    const mockPoolQuery = vi.fn();
    const mockEnd = vi.fn();

    /**
     * Mock an empty database result
     */
    const mockEmptyResult = () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
    };

    /**
     * Mock database initialization queries
     */
    const mockInitialization = () => {
      mockEmptyResult(); // BEGIN
      mockEmptyResult(); // CREATE TABLE users
      mockEmptyResult(); // CREATE TABLE conversations
      mockEmptyResult(); // CREATE TABLE messages
      mockEmptyResult(); // CREATE TABLE workflow_states
      mockEmptyResult(); // CREATE TABLE steps

      // CREATE INDEX (8 indexes)
      for (let i = 0; i < 8; i++) {
        mockEmptyResult();
      }

      // addUIMessageColumnsToMessagesTable (fails but is caught)
      mockQuery.mockRejectedValueOnce(new Error("column already exists"));

      mockEmptyResult(); // COMMIT
    };

    afterEach(async () => {
      if (adapter) {
        await adapter.close();
      }
      vi.clearAllMocks();
    });

    it("should use implicit schema (resolved via search_path) and default table prefix", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      vi.mocked(Pool).mockImplementation(
        () =>
          ({
            connect: mockConnect,
            query: mockPoolQuery,
            end: mockEnd,
          }) as any,
      );

      mockInitialization();

      adapter = new PostgreSQLMemoryAdapter({
        connection: {
          host: "localhost",
          port: 5432,
          database: "test",
          user: "test",
          password: "test",
        },
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      // Check that tables were created without schema prefix (public schema)
      const calls = mockQuery.mock.calls;

      // Find CREATE TABLE calls
      const createTableCalls = calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("CREATE TABLE IF NOT EXISTS"),
      );

      expect(createTableCalls.length).toBeGreaterThan(0);

      // Verify default table names (no schema prefix for public schema)
      const usersTableCall = createTableCalls.find((call) =>
        call[0].includes("voltagent_memory_users"),
      );
      const conversationsTableCall = createTableCalls.find((call) =>
        call[0].includes("voltagent_memory_conversations"),
      );
      const messagesTableCall = createTableCalls.find((call) =>
        call[0].includes("voltagent_memory_messages"),
      );

      expect(usersTableCall).toBeTruthy();
      expect(conversationsTableCall).toBeTruthy();
      expect(messagesTableCall).toBeTruthy();

      // Verify no schema prefix for public schema
      expect(usersTableCall?.[0]).not.toContain('"public".');
    });

    it("should use custom schema with proper quoting", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      vi.mocked(Pool).mockImplementation(
        () =>
          ({
            connect: mockConnect,
            query: mockPoolQuery,
            end: mockEnd,
          }) as any,
      );

      mockEmptyResult(); // BEGIN
      mockEmptyResult(); // CREATE SCHEMA
      mockEmptyResult(); // CREATE TABLE users
      mockEmptyResult(); // CREATE TABLE conversations
      mockEmptyResult(); // CREATE TABLE messages
      mockEmptyResult(); // CREATE TABLE workflow_states
      mockEmptyResult(); // CREATE TABLE steps

      // CREATE INDEX (8 indexes)
      for (let i = 0; i < 8; i++) {
        mockEmptyResult();
      }

      // addUIMessageColumnsToMessagesTable (fails but is caught)
      mockQuery.mockRejectedValueOnce(new Error("column already exists"));

      mockEmptyResult(); // COMMIT

      adapter = new PostgreSQLMemoryAdapter({
        connection: {
          host: "localhost",
          port: 5432,
          database: "test",
          user: "test",
          password: "test",
        },
        schema: "custom_schema",
        tablePrefix: "my_prefix",
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      const calls = mockQuery.mock.calls;

      // Verify schema creation
      const createSchemaCall = calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes('CREATE SCHEMA IF NOT EXISTS "custom_schema"'),
      );
      expect(createSchemaCall).toBeTruthy();

      // Verify table names with schema prefix and custom table prefix
      const createTableCalls = calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("CREATE TABLE IF NOT EXISTS"),
      );

      const usersTableCall = createTableCalls.find((call) =>
        call[0].includes('"custom_schema"."my_prefix_users"'),
      );
      const conversationsTableCall = createTableCalls.find((call) =>
        call[0].includes('"custom_schema"."my_prefix_conversations"'),
      );
      const messagesTableCall = createTableCalls.find((call) =>
        call[0].includes('"custom_schema"."my_prefix_messages"'),
      );
      const workflowStatesTableCall = createTableCalls.find((call) =>
        call[0].includes('"custom_schema"."my_prefix_workflow_states"'),
      );

      expect(usersTableCall).toBeTruthy();
      expect(conversationsTableCall).toBeTruthy();
      expect(messagesTableCall).toBeTruthy();
      expect(workflowStatesTableCall).toBeTruthy();
    });

    it("should create all required tables with proper structure", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      vi.mocked(Pool).mockImplementation(
        () =>
          ({
            connect: mockConnect,
            query: mockPoolQuery,
            end: mockEnd,
          }) as any,
      );

      mockInitialization();

      adapter = new PostgreSQLMemoryAdapter({
        connection: {
          host: "localhost",
          port: 5432,
          database: "test",
          user: "test",
          password: "test",
        },
        tablePrefix: "test",
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      const calls = mockQuery.mock.calls;

      // Verify users table structure
      const usersTableCall = calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("CREATE TABLE IF NOT EXISTS") &&
          call[0].includes("test_users"),
      );
      expect(usersTableCall).toBeTruthy();
      expect(usersTableCall?.[0]).toContain("id TEXT PRIMARY KEY");
      expect(usersTableCall?.[0]).toContain("metadata JSONB");
      expect(usersTableCall?.[0]).toContain("created_at TIMESTAMPTZ");
      expect(usersTableCall?.[0]).toContain("updated_at TIMESTAMPTZ");

      // Verify conversations table structure
      const conversationsTableCall = calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("CREATE TABLE IF NOT EXISTS") &&
          call[0].includes("test_conversations"),
      );
      expect(conversationsTableCall).toBeTruthy();
      expect(conversationsTableCall?.[0]).toContain("id TEXT PRIMARY KEY");
      expect(conversationsTableCall?.[0]).toContain("resource_id TEXT NOT NULL");
      expect(conversationsTableCall?.[0]).toContain("user_id TEXT NOT NULL");
      expect(conversationsTableCall?.[0]).toContain("title TEXT NOT NULL");
      expect(conversationsTableCall?.[0]).toContain("metadata JSONB NOT NULL");
      expect(conversationsTableCall?.[0]).toContain("created_at TIMESTAMPTZ");
      expect(conversationsTableCall?.[0]).toContain("updated_at TIMESTAMPTZ");

      // Verify messages table structure
      const messagesTableCall = calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("CREATE TABLE IF NOT EXISTS") &&
          call[0].includes("test_messages"),
      );
      expect(messagesTableCall).toBeTruthy();
      expect(messagesTableCall?.[0]).toContain("conversation_id TEXT NOT NULL");
      expect(messagesTableCall?.[0]).toContain("message_id TEXT NOT NULL");
      expect(messagesTableCall?.[0]).toContain("user_id TEXT NOT NULL");
      expect(messagesTableCall?.[0]).toContain("role TEXT NOT NULL");
      expect(messagesTableCall?.[0]).toContain("parts JSONB");
      expect(messagesTableCall?.[0]).toContain("metadata JSONB");
      expect(messagesTableCall?.[0]).toContain("format_version INTEGER DEFAULT 2");
      expect(messagesTableCall?.[0]).toContain("PRIMARY KEY (conversation_id, message_id)");
      expect(messagesTableCall?.[0]).toContain("REFERENCES");
      expect(messagesTableCall?.[0]).toContain("ON DELETE CASCADE");

      // Verify workflow_states table structure
      const workflowStatesTableCall = calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("CREATE TABLE IF NOT EXISTS") &&
          call[0].includes("test_workflow_states"),
      );
      expect(workflowStatesTableCall).toBeTruthy();
      expect(workflowStatesTableCall?.[0]).toContain("id TEXT PRIMARY KEY");
      expect(workflowStatesTableCall?.[0]).toContain("workflow_id TEXT NOT NULL");
      expect(workflowStatesTableCall?.[0]).toContain("workflow_name TEXT NOT NULL");
      expect(workflowStatesTableCall?.[0]).toContain("status TEXT NOT NULL");
      expect(workflowStatesTableCall?.[0]).toContain("suspension JSONB");
      expect(workflowStatesTableCall?.[0]).toContain("events JSONB");
      expect(workflowStatesTableCall?.[0]).toContain("output JSONB");
      expect(workflowStatesTableCall?.[0]).toContain("cancellation JSONB");
      expect(workflowStatesTableCall?.[0]).toContain("user_id TEXT");
      expect(workflowStatesTableCall?.[0]).toContain("conversation_id TEXT");
      expect(workflowStatesTableCall?.[0]).toContain("metadata JSONB");
    });

    it("should create all required indexes", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      vi.mocked(Pool).mockImplementation(
        () =>
          ({
            connect: mockConnect,
            query: mockPoolQuery,
            end: mockEnd,
          }) as any,
      );

      mockInitialization();

      adapter = new PostgreSQLMemoryAdapter({
        connection: {
          host: "localhost",
          port: 5432,
          database: "test",
          user: "test",
          password: "test",
        },
        tablePrefix: "test",
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      const calls = mockQuery.mock.calls;

      // Find all index creation calls
      const indexCalls = calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("CREATE INDEX IF NOT EXISTS"),
      );

      // Should have 6 indexes based on the initialization mock
      expect(indexCalls.length).toBeGreaterThanOrEqual(6);

      // Verify specific indexes exist
      const userIdIndex = indexCalls.find(
        (call) => call[0].includes("idx_") && call[0].includes("user_id"),
      );
      const resourceIdIndex = indexCalls.find(
        (call) => call[0].includes("idx_") && call[0].includes("resource_id"),
      );
      const conversationIdIndex = indexCalls.find(
        (call) => call[0].includes("idx_") && call[0].includes("conversation_id"),
      );
      const createdAtIndex = indexCalls.find(
        (call) => call[0].includes("idx_") && call[0].includes("created_at"),
      );
      const workflowIdIndex = indexCalls.find(
        (call) => call[0].includes("idx_") && call[0].includes("workflow_id"),
      );
      const statusIndex = indexCalls.find(
        (call) => call[0].includes("idx_") && call[0].includes("status"),
      );

      expect(userIdIndex).toBeTruthy();
      expect(resourceIdIndex).toBeTruthy();
      expect(conversationIdIndex).toBeTruthy();
      expect(createdAtIndex).toBeTruthy();
      expect(workflowIdIndex).toBeTruthy();
      expect(statusIndex).toBeTruthy();
    });

    it("should handle schema that is public explicitly", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      vi.mocked(Pool).mockImplementation(
        () =>
          ({
            connect: mockConnect,
            query: mockPoolQuery,
            end: mockEnd,
          }) as any,
      );

      mockInitialization();

      adapter = new PostgreSQLMemoryAdapter({
        connection: {
          host: "localhost",
          port: 5432,
          database: "test",
          user: "test",
          password: "test",
        },
        schema: "public",
        tablePrefix: "test",
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      const calls = mockQuery.mock.calls;

      // Verify that CREATE SCHEMA is NOT called for public schema
      const createSchemaCall = calls.find(
        (call) =>
          typeof call[0] === "string" && call[0].includes('CREATE SCHEMA IF NOT EXISTS "public"'),
      );
      expect(createSchemaCall).toBeFalsy();

      // Verify tables are created without schema prefix
      const createTableCalls = calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("CREATE TABLE IF NOT EXISTS"),
      );

      const usersTableCall = createTableCalls.find((call) => call[0].includes("test_users"));

      expect(usersTableCall).toBeTruthy();
    });

    it("should use connection string format", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      const mockPoolConstructor = vi.fn().mockReturnValue({
        connect: mockConnect,
        query: mockPoolQuery,
        end: mockEnd,
      });

      vi.mocked(Pool).mockImplementation(mockPoolConstructor as any);

      mockInitialization();

      const connectionString = "postgresql://user:pass@localhost:5432/testdb";

      adapter = new PostgreSQLMemoryAdapter({
        connection: connectionString,
        tablePrefix: "test",
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      // Verify Pool was created with connection string
      expect(mockPoolConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString,
          max: 10, // default maxConnections
        }),
      );
    });

    it("should use custom maxConnections", async () => {
      const mockClient = {
        query: mockQuery,
        release: mockRelease,
      };

      mockConnect.mockResolvedValue(mockClient);

      const mockPoolConstructor = vi.fn().mockReturnValue({
        connect: mockConnect,
        query: mockPoolQuery,
        end: mockEnd,
      });

      vi.mocked(Pool).mockImplementation(mockPoolConstructor as any);

      mockInitialization();

      adapter = new PostgreSQLMemoryAdapter({
        connection: {
          host: "localhost",
          port: 5432,
          database: "test",
          user: "test",
          password: "test",
        },
        maxConnections: 25,
        tablePrefix: "test",
      });

      // @ts-expect-error - accessing private property for testing
      await adapter.initPromise;

      // Verify Pool was created with custom maxConnections
      expect(mockPoolConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          max: 25,
        }),
      );
    });
  });
});
