/**
 * Unit tests for Supabase Memory Storage Adapter
 * Tests all functionality using mocked Supabase client
 */

import {
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
  type ConversationStepRecord,
} from "@voltagent/core";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, dbError, notFound, ok } from "./__testutils__/supabase-mock";
import { SupabaseMemoryAdapter } from "./memory-adapter";

// Mock the supabase module
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Mock the logger module
vi.mock("@voltagent/logger", () => ({
  createPinoLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe.sequential("SupabaseMemoryAdapter - Core Functionality", () => {
  let adapter: SupabaseMemoryAdapter;
  let mockClient: any;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  // Using shared test utils for Supabase mocking

  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock console to suppress initialization messages
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Create mock client and bypass initialize timing
    const { createClient } = await import("@supabase/supabase-js");
    supabaseMock = createSupabaseMock();
    mockClient = supabaseMock.client;
    vi.mocked(createClient).mockReturnValue(mockClient as any);
    vi.spyOn(SupabaseMemoryAdapter.prototype as any, "initialize").mockResolvedValue(undefined);

    // Create adapter instance
    adapter = new SupabaseMemoryAdapter({
      supabaseUrl: "https://test.supabase.co",
      supabaseKey: "test-key",
      debug: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe("Constructor", () => {
    it("should create adapter with url and key", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      expect(adapter).toBeDefined();
      // createClient was called during beforeEach
      expect(createClient).toHaveBeenCalled();
    });

    it("should create adapter with existing client", async () => {
      vi.clearAllMocks();
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { createClient } = await import("@supabase/supabase-js");
      const localSupabase = createSupabaseMock();
      const testClient = localSupabase.client;
      vi.mocked(createClient).mockReturnValue(testClient);
      vi.spyOn(SupabaseMemoryAdapter.prototype as any, "initialize").mockResolvedValue(undefined);

      const adapter = new SupabaseMemoryAdapter({ client: testClient });
      expect(adapter).toBeDefined();
    });

    it("should throw error when neither client nor url/key provided", () => {
      expect(() => new SupabaseMemoryAdapter({} as any)).toThrow(
        "Either provide a 'client' or both 'supabaseUrl' and 'supabaseKey'",
      );
    });
  });

  // ============================================================================
  // Conversation Tests
  // ============================================================================

  describe("Conversation Operations", () => {
    it("should create a conversation", async () => {
      const conversation = {
        id: "conv-1",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test Conversation",
        metadata: { test: true },
      };

      const dbRow = {
        id: conversation.id,
        resource_id: conversation.resourceId,
        user_id: conversation.userId,
        title: conversation.title,
        metadata: conversation.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Not found on getConversation, then inserted row
      supabaseMock.queue("voltagent_memory_conversations", notFound(), ok(dbRow));

      const result = await adapter.createConversation(conversation);

      expect(result).toMatchObject(conversation);
      expect(mockClient.from).toHaveBeenCalledWith("voltagent_memory_conversations");
    });

    it("should throw error when creating duplicate conversation", async () => {
      const conversation = {
        id: "conv-1",
        resourceId: "resource-1",
        userId: "user-1",
        title: "Test Conversation",
        metadata: {},
      };

      const existingConv = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Test Conversation",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock getConversation to return existing conversation
      supabaseMock.queue("voltagent_memory_conversations", ok(existingConv));

      await expect(adapter.createConversation(conversation)).rejects.toThrow(
        ConversationAlreadyExistsError,
      );
    });

    it("should get a conversation by ID", async () => {
      const dbRow = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Test Conversation",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseMock.queue("voltagent_memory_conversations", ok(dbRow));

      const result = await adapter.getConversation("conv-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("conv-1");
      expect(result?.resourceId).toBe("resource-1");
      expect(result?.userId).toBe("user-1");
    });

    it("should return null for non-existent conversation", async () => {
      supabaseMock.queue("voltagent_memory_conversations", notFound());

      const result = await adapter.getConversation("non-existent");
      expect(result).toBeNull();
    });

    it("should update a conversation", async () => {
      const updates = {
        title: "Updated Title",
        metadata: { updated: true },
      };

      const existingRow = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Old Title",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedRow = {
        ...existingRow,
        title: "Updated Title",
        metadata: { updated: true },
        updated_at: new Date().toISOString(),
      };

      supabaseMock.queue("voltagent_memory_conversations", ok(existingRow), ok(updatedRow));

      const result = await adapter.updateConversation("conv-1", updates);

      expect(result.title).toBe("Updated Title");
      expect(result.metadata).toEqual({ updated: true });
    });

    it("should delete a conversation", async () => {
      supabaseMock.queue("voltagent_memory_conversations", ok(null));

      await expect(adapter.deleteConversation("conv-1")).resolves.not.toThrow();
      expect(mockClient.from).toHaveBeenCalledWith("voltagent_memory_conversations");
    });

    it("should get conversations by resource ID", async () => {
      const dbRows = [
        {
          id: "conv-1",
          resource_id: "resource-1",
          user_id: "user-1",
          title: "Conv 1",
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "conv-2",
          resource_id: "resource-1",
          user_id: "user-2",
          title: "Conv 2",
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      supabaseMock.queue("voltagent_memory_conversations", ok(dbRows));

      const result = await adapter.getConversations("resource-1");

      expect(result).toHaveLength(2);
      expect(result[0].resourceId).toBe("resource-1");
    });

    it("should query conversations with filters", async () => {
      const dbRows = [
        {
          id: "conv-1",
          resource_id: "resource-1",
          user_id: "user-1",
          title: "Conv 1",
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      supabaseMock.queue("voltagent_memory_conversations", ok(dbRows));

      const result = await adapter.queryConversations({
        userId: "user-1",
        resourceId: "resource-1",
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-1");
    });
  });

  // ============================================================================
  // Message Tests
  // ============================================================================

  describe("Message Operations", () => {
    it("should add a message to a conversation", async () => {
      const message: UIMessage = {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        metadata: {},
      };

      const existingConv = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Test",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // getConversation
      supabaseMock.queue("voltagent_memory_conversations", ok(existingConv));
      // insert
      supabaseMock.queue("voltagent_memory_messages", ok(null));
      // applyStorageLimit count
      supabaseMock.queue("voltagent_memory_messages", ok(null, { count: 0 }));

      await expect(adapter.addMessage(message, "user-1", "conv-1")).resolves.not.toThrow();
    });

    it("should get messages from a conversation", async () => {
      const dbRows = [
        {
          message_id: "msg-2",
          user_id: "user-1",
          role: "assistant",
          parts: [{ type: "text", text: "Hi!" }],
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          message_id: "msg-1",
          user_id: "user-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      supabaseMock.queue("voltagent_memory_messages", ok(dbRows));

      const result = await adapter.getMessages("user-1", "conv-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("msg-1");
      expect(result[0].role).toBe("user");
    });

    it("should clear all messages for a user", async () => {
      supabaseMock.queue(
        "voltagent_memory_conversations",
        ok([{ id: "conv-1" }, { id: "conv-2" }]),
      );
      supabaseMock.queue("voltagent_memory_messages", ok(null));

      await expect(adapter.clearMessages("user-1")).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Conversation Step Tests
  // ============================================================================

  describe("Conversation Step Operations", () => {
    it("should deduplicate step ids before upsert and keep last row", async () => {
      const steps: ConversationStepRecord[] = [
        {
          id: "tool-call-1",
          conversationId: "conv-1",
          userId: "user-1",
          agentId: "agent-1",
          agentName: "Agent 1",
          operationId: "op-1",
          stepIndex: 4,
          type: "tool_call",
          role: "assistant",
          arguments: { city: "Istanbul" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "tool-call-1",
          conversationId: "conv-1",
          userId: "user-1",
          agentId: "agent-1",
          agentName: "Agent 1",
          operationId: "op-1",
          stepIndex: 4,
          type: "tool_result",
          role: "assistant",
          result: { forecast: "sunny" },
          createdAt: "2024-01-01T00:00:01.000Z",
        },
      ];

      supabaseMock.queue("voltagent_memory_steps", ok(null));

      await expect(adapter.saveConversationSteps(steps)).resolves.not.toThrow();

      const builder = supabaseMock.getLast("voltagent_memory_steps");
      expect(builder.upsert).toHaveBeenCalledTimes(1);
      const [rows, options] = builder.upsert.mock.calls[0];

      expect(options).toEqual({ onConflict: "id", ignoreDuplicates: false });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "tool-call-1",
        type: "tool_result",
        result: { forecast: "sunny" },
        created_at: "2024-01-01T00:00:01.000Z",
      });
    });
  });

  // ============================================================================
  // Working Memory Tests
  // ============================================================================

  describe("Working Memory Operations", () => {
    it("should set conversation-scoped working memory", async () => {
      const existingConv = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Test",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1) setWorkingMemory: getConversation
      supabaseMock.queue("voltagent_memory_conversations", ok(existingConv));
      // 2) updateConversation: getConversation
      supabaseMock.queue("voltagent_memory_conversations", ok(existingConv));
      // 3) updateConversation: update/select/single -> updated row
      const updatedRow = { ...existingConv, metadata: { workingMemory: "Test memory content" } };
      supabaseMock.queue("voltagent_memory_conversations", ok(updatedRow));

      await expect(
        adapter.setWorkingMemory({
          conversationId: "conv-1",
          scope: "conversation",
          content: "Test memory content",
        }),
      ).resolves.not.toThrow();
    });

    it("should get conversation-scoped working memory", async () => {
      const dbRow = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Test",
        metadata: { workingMemory: "Test memory content" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseMock.queue("voltagent_memory_conversations", ok(dbRow));

      const result = await adapter.getWorkingMemory({
        conversationId: "conv-1",
        scope: "conversation",
      });

      expect(result).toBe("Test memory content");
    });

    it("should delete working memory", async () => {
      // getConversation with workingMemory then update
      const convWithWM = {
        id: "conv-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "Test",
        metadata: { workingMemory: "Something" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      supabaseMock.queue("voltagent_memory_conversations", ok(convWithWM));
      supabaseMock.queue(
        "voltagent_memory_conversations",
        ok(convWithWM),
        ok({ ...convWithWM, metadata: {} }),
      );

      await expect(
        adapter.deleteWorkingMemory({
          conversationId: "conv-1",
          scope: "conversation",
        }),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // Workflow State Tests
  // ============================================================================

  describe("Workflow State Operations", () => {
    it("should set workflow state", async () => {
      const state = {
        id: "wf-1",
        workflowId: "workflow-1",
        workflowName: "Test Workflow",
        status: "running" as const,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      supabaseMock.queue("voltagent_memory_workflow_states", ok(null));

      await expect(adapter.setWorkflowState("wf-1", state)).resolves.not.toThrow();
    });

    it("should get workflow state", async () => {
      const dbRow = {
        id: "wf-1",
        workflow_id: "workflow-1",
        workflow_name: "Test Workflow",
        status: "running",
        metadata: {},
        suspension: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseMock.queue("voltagent_memory_workflow_states", ok(dbRow));

      const result = await adapter.getWorkflowState("wf-1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("wf-1");
      expect(result?.workflowId).toBe("workflow-1");
      expect(result?.status).toBe("running");
    });

    it("should update workflow state", async () => {
      const existingState = {
        id: "wf-1",
        workflow_id: "workflow-1",
        workflow_name: "Test Workflow",
        status: "running",
        metadata: {},
        suspension: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      supabaseMock.queue("voltagent_memory_workflow_states", ok(existingState));
      supabaseMock.queue("voltagent_memory_workflow_states", ok(null));

      await expect(
        adapter.updateWorkflowState("wf-1", {
          status: "completed",
          updatedAt: new Date(),
        }),
      ).resolves.not.toThrow();
    });

    it("should get suspended workflow states", async () => {
      const dbRows = [
        {
          id: "wf-1",
          workflow_id: "workflow-1",
          workflow_name: "Test Workflow",
          status: "suspended",
          suspension: {
            suspendedAt: new Date().toISOString(),
            stepIndex: 1,
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      supabaseMock.queue("voltagent_memory_workflow_states", ok(dbRows));

      const result = await adapter.getSuspendedWorkflowStates("workflow-1");

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("suspended");
    });

    it("should query workflow runs with filters and pagination", async () => {
      const dbRows = [
        {
          id: "wf-2",
          workflow_id: "workflow-1",
          workflow_name: "Test Workflow",
          status: "completed",
          created_at: new Date("2024-01-02T00:00:00Z").toISOString(),
          updated_at: new Date("2024-01-02T00:00:00Z").toISOString(),
        },
      ];

      supabaseMock.queue("voltagent_memory_workflow_states", ok(dbRows));

      const result = await adapter.queryWorkflowRuns({
        workflowId: "workflow-1",
        status: "completed",
        from: new Date("2024-01-01T00:00:00Z"),
        to: new Date("2024-01-03T00:00:00Z"),
        limit: 10,
        offset: 5,
      });

      expect(result).toHaveLength(1);
      const builder = supabaseMock.getLast("voltagent_memory_workflow_states");
      expect(builder.eq).toHaveBeenCalledWith("workflow_id", "workflow-1");
      expect(builder.eq).toHaveBeenCalledWith("status", "completed");
      expect(builder.gte).toHaveBeenCalledWith("created_at", "2024-01-01T00:00:00.000Z");
      expect(builder.lte).toHaveBeenCalledWith("created_at", "2024-01-03T00:00:00.000Z");
      expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(5, 14);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      supabaseMock.queue("voltagent_memory_conversations", dbError("Database connection failed"));

      await expect(adapter.getConversation("test-id")).rejects.toThrow(
        "Failed to get conversation: Database connection failed",
      );
    });

    it("should throw ConversationNotFoundError when updating non-existent conversation", async () => {
      supabaseMock.queue("voltagent_memory_conversations", notFound());

      await expect(
        adapter.updateConversation("non-existent", { title: "New Title" }),
      ).rejects.toThrow(ConversationNotFoundError);
    });
  });

  // ============================================================================
  // Advanced Behavior Tests (Query shapes, initialization)
  // ============================================================================

  describe("Advanced Behavior", () => {
    it("should apply roles and time filters when getting messages", async () => {
      const before = new Date("2020-02-02T00:00:00.000Z");
      const after = new Date("2020-01-01T00:00:00.000Z");
      const roles = ["user", "assistant"] as const;

      supabaseMock.queue("voltagent_memory_messages", ok([]));

      await adapter.getMessages("user-1", "conv-1", {
        roles: roles as any,
        before,
        after,
        limit: 5,
      });

      const builder = supabaseMock.getLast("voltagent_memory_messages");
      expect(builder.eq).toHaveBeenCalledWith("conversation_id", "conv-1");
      expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(builder.in).toHaveBeenCalledWith("role", roles as any);
      expect(builder.lt).toHaveBeenCalledWith("created_at", before.toISOString());
      expect(builder.gt).toHaveBeenCalledWith("created_at", after.toISOString());
      expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(builder.limit).toHaveBeenCalledWith(5);
    });

    it("should order and paginate conversations correctly", async () => {
      supabaseMock.queue("voltagent_memory_conversations", ok([]));

      await adapter.queryConversations({
        userId: "user-1",
        resourceId: "resource-1",
        orderBy: "updated_at",
        orderDirection: "ASC",
        limit: 10,
        offset: 20,
      });

      const builder = supabaseMock.getLast("voltagent_memory_conversations");
      expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(builder.eq).toHaveBeenCalledWith("resource_id", "resource-1");
      expect(builder.order).toHaveBeenCalledWith("updated_at", { ascending: true });
      expect(builder.limit).toHaveBeenCalledWith(10);
      expect(builder.range).toHaveBeenCalledWith(20, 29);
    });

    it("should log creation SQL on fresh install during initialization", async () => {
      // restore original initialize
      (SupabaseMemoryAdapter.prototype as any).initialize.mockRestore?.();

      // Fresh install: both tables missing
      supabaseMock.queue("voltagent_memory_conversations", dbError("Table not found"));
      supabaseMock.queue("voltagent_memory_messages", dbError("Table not found"));

      const logSpy = vi.spyOn(console, "log");

      // This will call initialize() in constructor
      const local = new SupabaseMemoryAdapter({
        supabaseUrl: "https://test.supabase.co",
        supabaseKey: "test-key",
      });

      // Give microtask time for async initialize
      await new Promise((r) => setTimeout(r, 0));
      expect(logSpy).toHaveBeenCalled();
      const calls = (logSpy.mock.calls || []).flat().join("\n");
      expect(calls).toContain("TABLE CREATION SQL");

      // avoid unhandled later
      vi.spyOn(local as any, "initialize").mockResolvedValue(undefined);
    });

    it("should log migration SQL when old columns exist", async () => {
      // restore original initialize
      (SupabaseMemoryAdapter.prototype as any).initialize.mockRestore?.();

      // checkFreshInstallation: Not fresh, both tables exist
      supabaseMock.queue("voltagent_memory_conversations", ok([]));
      supabaseMock.queue("voltagent_memory_messages", ok([]));

      // checkMigrationNeeded: New columns don't exist (migration needed)
      // Trying to select new columns fails
      supabaseMock.queue("voltagent_memory_messages", dbError("column parts does not exist"));
      supabaseMock.queue(
        "voltagent_memory_conversations",
        dbError("column user_id does not exist"),
      );

      const logSpy = vi.spyOn(console, "log");

      const local = new SupabaseMemoryAdapter({
        supabaseUrl: "https://test.supabase.co",
        supabaseKey: "test-key",
      });
      await new Promise((r) => setTimeout(r, 0));

      const calls = (logSpy.mock.calls || []).flat().join("\n");
      expect(calls).toContain("MIGRATION SQL FROM OLD SYSTEM TO V2");

      vi.spyOn(local as any, "initialize").mockResolvedValue(undefined);
    });
  });
});
