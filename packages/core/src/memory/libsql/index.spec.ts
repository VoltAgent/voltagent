import { LibSQLStorage } from ".";
import type { MemoryMessage } from "../types";
// ✅ ADD: Import workflow types for testing
import type {
  WorkflowHistoryEntry,
  WorkflowStepHistoryEntry,
  WorkflowTimelineEvent,
} from "../../workflow/types";

// Create shared data structure for tests
const mockDataStore = {
  deletedConversations: new Set<string>(),
  conversationUpdates: new Map<string, any>(),
};

// We'll create proper mocks for external dependencies
vi.mock("@libsql/client", () => {
  // Mock database responses - these simulate what would come from a real database
  const mockData = {
    messages: [
      {
        message_id: "msg-1",
        conversation_id: "conversation-1",
        role: "user",
        content: "Hello",
        type: "text",
        created_at: "2023-01-01T12:00:00.000Z",
      },
      {
        message_id: "msg-2",
        conversation_id: "conversation-1",
        role: "assistant",
        content: "Hi there!",
        type: "text",
        created_at: "2023-01-01T12:01:00.000Z",
      },
      {
        message_id: "msg-3",
        conversation_id: "conversation-2",
        role: "user",
        content: "Different user",
        type: "text",
        created_at: "2023-01-01T12:02:00.000Z",
      },
    ],
    conversations: [
      {
        id: "conversation-1",
        resource_id: "resource-1",
        user_id: "user-1",
        title: "First Conversation",
        metadata: JSON.stringify({ isImportant: true }),
        created_at: "2023-01-01T10:00:00.000Z",
        updated_at: "2023-01-01T12:01:00.000Z",
      },
      {
        id: "conversation-2",
        resource_id: "resource-1",
        user_id: "user-2",
        title: "Second Conversation",
        metadata: JSON.stringify({ isImportant: false }),
        created_at: "2023-01-01T11:00:00.000Z",
        updated_at: "2023-01-01T12:02:00.000Z",
      },
    ],
    // ✅ ADD: Workflow test data
    workflowHistories: [
      {
        id: "workflow-history-1",
        name: "Test Workflow",
        workflow_id: "workflow-1",
        status: "completed",
        start_time: "2023-01-01T10:00:00.000Z",
        end_time: "2023-01-01T10:05:00.000Z",
        input: JSON.stringify({ param: "value" }),
        output: JSON.stringify({ result: "success" }),
        metadata: JSON.stringify({ userId: "user-1" }),
        created_at: "2023-01-01T10:00:00.000Z",
        updated_at: "2023-01-01T10:05:00.000Z",
      },
      {
        id: "workflow-history-2",
        name: "Another Workflow",
        workflow_id: "workflow-2",
        status: "running",
        start_time: "2023-01-01T11:00:00.000Z",
        end_time: null,
        input: JSON.stringify({ param: "value2" }),
        output: null,
        metadata: JSON.stringify({ userId: "user-2" }),
        created_at: "2023-01-01T11:00:00.000Z",
        updated_at: "2023-01-01T11:00:00.000Z",
      },
    ],
    workflowSteps: [
      {
        id: "step-1",
        workflow_history_id: "workflow-history-1",
        step_index: 0,
        step_type: "agent",
        step_name: "First Step",
        status: "completed",
        start_time: "2023-01-01T10:01:00.000Z",
        end_time: "2023-01-01T10:03:00.000Z",
        input: JSON.stringify({ task: "analyze" }),
        output: JSON.stringify({ analysis: "complete" }),
        error_message: null,
        agent_execution_id: "agent-exec-1",
        created_at: "2023-01-01T10:01:00.000Z",
        updated_at: "2023-01-01T10:03:00.000Z",
      },
      {
        id: "step-2",
        workflow_history_id: "workflow-history-1",
        step_index: 1,
        step_type: "func",
        step_name: "Second Step",
        status: "completed",
        start_time: "2023-01-01T10:03:00.000Z",
        end_time: "2023-01-01T10:05:00.000Z",
        input: JSON.stringify({ data: "processed" }),
        output: JSON.stringify({ final: "result" }),
        error_message: null,
        agent_execution_id: null,
        created_at: "2023-01-01T10:03:00.000Z",
        updated_at: "2023-01-01T10:05:00.000Z",
      },
    ],
    workflowTimelineEvents: [
      {
        id: "event-1",
        workflow_history_id: "workflow-history-1",
        event_id: "event-1",
        name: "workflow_start",
        type: "workflow",
        start_time: "2023-01-01T10:00:00.000Z",
        end_time: "2023-01-01T10:05:00.000Z",
        status: "completed",
        level: "INFO",
        input: JSON.stringify({ initial: "data" }),
        output: JSON.stringify({ final: "result" }),
        status_message: null,
        metadata: JSON.stringify({ executionId: "exec-1" }),
        trace_id: "trace-1",
        parent_event_id: null,
        created_at: "2023-01-01T10:00:00.000Z",
      },
      {
        id: "event-2",
        workflow_history_id: "workflow-history-1",
        event_id: "event-2",
        name: "step_execution",
        type: "workflow-step",
        start_time: "2023-01-01T10:01:00.000Z",
        end_time: "2023-01-01T10:03:00.000Z",
        status: "completed",
        level: "INFO",
        input: JSON.stringify({ step: "data" }),
        output: JSON.stringify({ step: "result" }),
        status_message: null,
        metadata: JSON.stringify({ stepIndex: 0 }),
        trace_id: "trace-1",
        parent_event_id: "event-1",
        created_at: "2023-01-01T10:01:00.000Z",
      },
    ],
  };

  // A smart mock that handles various types of queries
  const createMockExecute = () => {
    return vi.fn().mockImplementation(({ sql, args }) => {
      // Debug: Log all SQL queries for timeline events
      if (sql?.includes("workflow_timeline_events")) {
        console.log("[DEBUG] SQL Query:", sql);
        console.log("[DEBUG] Args:", args);
        console.log("[DEBUG] All if conditions will be checked...");
      }

      // Initialize database queries - just return empty results
      if (sql?.includes("CREATE TABLE") || sql?.includes("CREATE INDEX")) {
        return Promise.resolve({ rows: [] });
      }

      // Handle message retrieval
      if (sql?.includes("SELECT") && sql?.includes("FROM") && sql?.includes("_messages")) {
        let filteredMessages = [...mockData.messages];

        // Skip filtering if it's a deleted conversation
        if (args?.[0] && mockDataStore.deletedConversations.has(args[0])) {
          return Promise.resolve({ rows: [] });
        }

        // Handle JOIN queries with conversations for user filtering
        if (sql?.includes("INNER JOIN") && sql?.includes("_conversations")) {
          // Filter by user_id through conversation join
          if (args?.includes("user-1")) {
            filteredMessages = filteredMessages.filter((m) => {
              const conv = mockData.conversations.find((c) => c.id === m.conversation_id);
              return conv?.user_id === "user-1";
            });
          } else if (args?.includes("user-2")) {
            filteredMessages = filteredMessages.filter((m) => {
              const conv = mockData.conversations.find((c) => c.id === m.conversation_id);
              return conv?.user_id === "user-2";
            });
          } else if (args?.includes("unknown-user")) {
            return Promise.resolve({ rows: [] }); // Explicit handling for unknown user
          }
        }

        // Apply conversationId filter if present
        if (args?.includes("conversation-1")) {
          filteredMessages = filteredMessages.filter((m) => m.conversation_id === "conversation-1");
        } else if (args?.includes("conversation-2")) {
          filteredMessages = filteredMessages.filter((m) => m.conversation_id === "conversation-2");
        } else if (args?.includes("non-existent")) {
          // Handle non-existent conversation case
          return Promise.resolve({ rows: [] });
        }

        // Apply role filter if present
        if (args?.includes("user")) {
          filteredMessages = filteredMessages.filter((m) => m.role === "user");
        } else if (args?.includes("assistant")) {
          filteredMessages = filteredMessages.filter((m) => m.role === "assistant");
        }

        // Handle LIMIT clause for pagination
        if (sql?.includes("LIMIT") && args?.length >= 2) {
          const limitIndex = args.findIndex(
            (arg: any, index: number) => typeof arg === "number" && index > 0 && arg === 1,
          );
          if (limitIndex !== -1) {
            filteredMessages = filteredMessages.slice(0, 1);
          }
        }

        return Promise.resolve({ rows: filteredMessages });
      }

      // Handle conversation retrieval by ID
      if (
        sql?.includes("SELECT") &&
        sql?.includes("FROM") &&
        sql?.includes("_conversations") &&
        sql?.includes("WHERE id =")
      ) {
        const conversationId = args?.[0];

        // Return null for deleted conversations
        if (conversationId && mockDataStore.deletedConversations.has(conversationId)) {
          return Promise.resolve({ rows: [] });
        }

        let conversation = mockData.conversations.find((c) => c.id === conversationId);

        // Apply any pending updates
        if (conversation && mockDataStore.conversationUpdates.has(conversationId)) {
          const updates = mockDataStore.conversationUpdates.get(conversationId);
          conversation = {
            ...conversation,
            ...updates,
            // Make sure metadata is stringified
            metadata: updates.metadata ? JSON.stringify(updates.metadata) : conversation.metadata,
          };
        }

        return Promise.resolve({
          rows: conversation ? [conversation] : [],
        });
      }

      // Handle conversations retrieval by user_id
      if (
        sql?.includes("SELECT") &&
        sql?.includes("FROM") &&
        sql?.includes("_conversations") &&
        sql?.includes("WHERE user_id =")
      ) {
        const userId = args?.[0];
        let conversations = mockData.conversations.filter((c) => c.user_id === userId);

        // Filter out deleted conversations
        conversations = conversations.filter((c) => !mockDataStore.deletedConversations.has(c.id));

        // Apply any pending updates
        conversations = conversations.map((c) => {
          if (mockDataStore.conversationUpdates.has(c.id)) {
            const updates = mockDataStore.conversationUpdates.get(c.id);
            return {
              ...c,
              ...updates,
              // Make sure metadata is stringified
              metadata: updates.metadata ? JSON.stringify(updates.metadata) : c.metadata,
            };
          }
          return c;
        });

        return Promise.resolve({ rows: conversations });
      }

      // Handle resource conversations retrieval
      if (
        sql?.includes("SELECT") &&
        sql?.includes("FROM") &&
        sql?.includes("_conversations") &&
        sql?.includes("WHERE resource_id =")
      ) {
        const resourceId = args?.[0];
        let conversations = mockData.conversations.filter((c) => c.resource_id === resourceId);

        // Filter out deleted conversations
        conversations = conversations.filter((c) => !mockDataStore.deletedConversations.has(c.id));

        // Apply any pending updates
        conversations = conversations.map((c) => {
          if (mockDataStore.conversationUpdates.has(c.id)) {
            const updates = mockDataStore.conversationUpdates.get(c.id);
            return {
              ...c,
              ...updates,
              // Make sure metadata is stringified
              metadata: updates.metadata ? JSON.stringify(updates.metadata) : c.metadata,
            };
          }
          return c;
        });

        return Promise.resolve({ rows: conversations });
      }

      // Handle general conversations queries (queryConversations method)
      if (
        sql?.includes("SELECT") &&
        sql?.includes("FROM") &&
        sql?.includes("_conversations") &&
        (sql?.includes("WHERE") || args?.length > 0)
      ) {
        let conversations = [...mockData.conversations];

        // Filter out deleted conversations
        conversations = conversations.filter((c) => !mockDataStore.deletedConversations.has(c.id));

        // Apply filtering based on arguments
        if (args?.length > 0) {
          // If first arg is a user_id, filter by it
          if (args[0] && mockData.conversations.some((c) => c.user_id === args[0])) {
            conversations = conversations.filter((c) => c.user_id === args[0]);
          }
          // If first arg is a resource_id, filter by it
          else if (args[0] && mockData.conversations.some((c) => c.resource_id === args[0])) {
            conversations = conversations.filter((c) => c.resource_id === args[0]);
          }
        }

        // Apply any pending updates
        conversations = conversations.map((c) => {
          if (mockDataStore.conversationUpdates.has(c.id)) {
            const updates = mockDataStore.conversationUpdates.get(c.id);
            return {
              ...c,
              ...updates,
              // Make sure metadata is stringified
              metadata: updates.metadata ? JSON.stringify(updates.metadata) : c.metadata,
            };
          }
          return c;
        });

        return Promise.resolve({ rows: conversations });
      }

      // Handle message counting
      if (sql?.includes("COUNT(*)")) {
        return Promise.resolve({ rows: [{ count: 0 }] });
      }

      // Handle insertions - mock a successful response
      if (sql?.includes("INSERT INTO")) {
        return Promise.resolve({
          rows: [],
          lastInsertRowid: 123, // Mock an insert ID
        });
      }

      // Handle updates - store the updates in memory
      if (sql?.includes("UPDATE") && sql?.includes("_conversations") && args?.length >= 2) {
        const conversationId = args[args.length - 1]; // ID is typically the last parameter
        const updates: any = {};

        // Parse the SQL to extract updates
        if (sql.includes("title =")) {
          const titleIndex = args.indexOf(
            args.find((a: any) => typeof a === "string" && a !== conversationId),
          );
          if (titleIndex !== -1) {
            updates.title = args[titleIndex];
          }
        }

        if (sql.includes("metadata =")) {
          const metadataIndex = args.indexOf(
            args.find((a: any) => a.startsWith("{") || a.startsWith("{")),
          );
          if (metadataIndex !== -1) {
            updates.metadata = JSON.parse(args[metadataIndex]);
          }
        }

        // Simplified: Just save the title and metadata for later retrieval
        if (updates.title || updates.metadata) {
          mockDataStore.conversationUpdates.set(conversationId, {
            ...(mockDataStore.conversationUpdates.get(conversationId) || {}),
            ...updates,
            updated_at: new Date().toISOString(),
          });
        }

        return Promise.resolve({ rows: [] });
      }

      // Handle deletes
      if (sql?.includes("DELETE") && args?.length > 0) {
        const id = args[0];
        if (id) {
          mockDataStore.deletedConversations.add(id);
        }
        return Promise.resolve({ rows: [] });
      }

      // ✅ ADD: Handle workflow history queries
      if (sql?.includes("workflow_history")) {
        // GET workflow history by ID
        if (sql?.includes("SELECT") && sql?.includes("WHERE id =")) {
          const historyId = args?.[0];
          const history = mockData.workflowHistories.find((h) => h.id === historyId);
          return Promise.resolve({ rows: history ? [history] : [] });
        }

        // GET workflow histories by workflow_id
        if (sql?.includes("SELECT") && sql?.includes("WHERE workflow_id =")) {
          const workflowId = args?.[0];
          const histories = mockData.workflowHistories.filter((h) => h.workflow_id === workflowId);
          return Promise.resolve({ rows: histories });
        }

        // GET all workflow IDs
        if (sql?.includes("SELECT DISTINCT workflow_id")) {
          const workflowIds = [...new Set(mockData.workflowHistories.map((h) => h.workflow_id))];
          return Promise.resolve({ rows: workflowIds.map((id) => ({ workflow_id: id })) });
        }

        // INSERT/UPDATE workflow history
        if (sql?.includes("INSERT") || sql?.includes("UPDATE")) {
          return Promise.resolve({ rows: [] });
        }
      }

      // ✅ ADD: Handle workflow steps queries
      if (sql?.includes("workflow_steps")) {
        // GET workflow step by ID
        if (sql?.includes("SELECT") && sql?.includes("WHERE id =")) {
          const stepId = args?.[0];
          const step = mockData.workflowSteps.find((s) => s.id === stepId);
          return Promise.resolve({ rows: step ? [step] : [] });
        }

        // GET workflow steps by workflow_history_id
        if (sql?.includes("SELECT") && sql?.includes("WHERE workflow_history_id =")) {
          const historyId = args?.[0];
          const steps = mockData.workflowSteps.filter((s) => s.workflow_history_id === historyId);
          // Sort by step_index
          const sortedSteps = steps.sort((a, b) => a.step_index - b.step_index);
          return Promise.resolve({ rows: sortedSteps });
        }

        // INSERT/UPDATE workflow steps
        if (sql?.includes("INSERT") || sql?.includes("UPDATE")) {
          return Promise.resolve({ rows: [] });
        }
      }

      // ✅ ADD: Handle workflow timeline events queries
      if (sql?.includes("workflow_timeline_events")) {
        console.log("[DEBUG MOCK] Entered workflow_timeline_events condition");

        // GET workflow timeline event by ID - more specific condition
        if (
          sql?.includes("SELECT") &&
          sql?.includes("WHERE") &&
          (sql?.includes("WHERE id =") || sql?.includes("WHERE event_id ="))
        ) {
          console.log("[DEBUG MOCK] Condition 1: Event by ID - matched");
          const eventId = args?.[0];
          const event = mockData.workflowTimelineEvents.find(
            (e) => e.id === eventId || e.event_id === eventId,
          );
          return Promise.resolve({ rows: event ? [event] : [] });
        }

        // GET workflow timeline events by workflow_history_id - be more specific
        if (
          sql?.includes("SELECT") &&
          sql?.includes("WHERE") &&
          sql?.includes("workflow_history_id")
        ) {
          console.log("[DEBUG MOCK] Condition 2: Events by workflow_history_id - matched!");
          const historyId = args?.[0];
          console.log("[DEBUG MOCK] Timeline events query for historyId:", historyId);
          console.log(
            "[DEBUG MOCK] Available timeline events:",
            mockData.workflowTimelineEvents.map((e) => ({
              id: e.id,
              workflow_history_id: e.workflow_history_id,
            })),
          );

          const events = mockData.workflowTimelineEvents.filter(
            (e) => e.workflow_history_id === historyId,
          );
          console.log("[DEBUG MOCK] Filtered events:", events.length);

          // Sort by start_time
          const sortedEvents = events.sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
          );
          return Promise.resolve({ rows: sortedEvents });
        }

        // INSERT/UPDATE workflow timeline events
        if (sql?.includes("INSERT") || sql?.includes("UPDATE")) {
          console.log("[DEBUG MOCK] Condition 3: INSERT/UPDATE - matched");
          return Promise.resolve({ rows: [] });
        }

        console.log("[DEBUG MOCK] No specific condition matched, falling through...");
      }

      // ✅ ADD: Handle workflow stats queries
      if (
        sql?.includes("COUNT(*)") &&
        sql?.includes("workflow_history") &&
        sql?.includes("WHERE workflow_id =")
      ) {
        const workflowId = args?.[0];
        const histories = mockData.workflowHistories.filter((h) => h.workflow_id === workflowId);

        if (histories.length === 0) {
          // Return default stats for non-existent workflow
          const emptyStatsRow = {
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            avg_duration_ms: 0,
            last_execution_time: undefined,
          };
          return Promise.resolve({ rows: [emptyStatsRow] });
        }

        const totalExecutions = histories.length;
        const successfulExecutions = histories.filter((h) => h.status === "completed").length;
        const failedExecutions = histories.filter((h) => h.status === "error").length;

        // Calculate average execution time (mock calculation)
        const avgExecutionTime = histories.length > 0 ? 5000 : 0; // 5 seconds average
        const lastExecutionTime = histories.length > 0 ? histories[0].start_time : null;

        const statsRow = {
          total_executions: totalExecutions,
          successful_executions: successfulExecutions,
          failed_executions: failedExecutions,
          avg_duration_ms: avgExecutionTime,
          last_execution_time: lastExecutionTime,
        };

        return Promise.resolve({ rows: [statsRow] });
      }

      // Default response
      return Promise.resolve({ rows: [] });
    });
  };

  // Create the mock client
  const mockClient = {
    execute: createMockExecute(),
    close: vi.fn(),
  };

  return {
    createClient: vi.fn().mockReturnValue(mockClient),
  };
});

describe("LibSQLStorage", () => {
  let storage: LibSQLStorage;

  beforeEach(async () => {
    // Create a clean storage instance before each test
    storage = new LibSQLStorage({
      url: "libsql://test.db",
      debug: false,
    });

    // Wait for initialization to complete
    // @ts-expect-error - Accessing private property for testing
    await storage.initialized;

    // Clear mock calls from initialization
    // @ts-expect-error - Accessing private property for testing
    storage.client.execute.mockClear();

    // Reset the mock data state for clean tests
    mockDataStore.deletedConversations.clear();
    mockDataStore.conversationUpdates.clear();
  });

  afterEach(() => {
    storage.close();
    vi.clearAllMocks();
  });

  describe("Message Operations", () => {
    describe("addMessage", () => {
      it("should add a message and return void", async () => {
        const message: MemoryMessage = {
          id: "new-message-id",
          role: "user",
          content: "Test message",
          type: "text",
          createdAt: new Date().toISOString(),
        };

        const result = await storage.addMessage(message, "conversation-1");

        // Function should complete without error and return void
        expect(result).toBeUndefined();
      });

      it("should handle messages without explicit user or conversation IDs", async () => {
        const message: MemoryMessage = {
          id: "another-message-id",
          role: "user",
          content: "Default IDs",
          type: "text",
          createdAt: new Date().toISOString(),
        };

        // No error should be thrown
        await expect(storage.addMessage(message)).resolves.not.toThrow();
      });
    });

    describe("getMessages", () => {
      it("should retrieve messages for a specific user and conversation", async () => {
        const messages = await storage.getMessages({
          userId: "user-1",
          conversationId: "conversation-1",
        });

        // We should receive properly formatted messages
        expect(messages).toEqual([
          expect.objectContaining({
            role: "user",
            content: "Hello",
            type: "text",
          }),
          expect.objectContaining({
            role: "assistant",
            content: "Hi there!",
            type: "text",
          }),
        ]);

        // The order should be correct (by timestamp)
        expect(messages[0].role).toBe("user");
        expect(messages[1].role).toBe("assistant");
      });

      it("should filter messages by role", async () => {
        const userMessages = await storage.getMessages({
          userId: "user-1",
          conversationId: "conversation-1",
          role: "user",
        });

        expect(userMessages).toHaveLength(1);
        expect(userMessages[0].role).toBe("user");
        expect(userMessages[0].content).toBe("Hello");
      });

      it("should return empty array for unknown user or conversation", async () => {
        const messages = await storage.getMessages({
          userId: "unknown-user",
          conversationId: "conversation-1",
        });

        expect(messages).toEqual([]);
      });

      it("should return all messages when no filters are provided", async () => {
        const messages = await storage.getMessages();
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    describe("clearMessages", () => {
      it("should clear messages for a specific conversation and user", async () => {
        const result = await storage.clearMessages({
          userId: "user-1",
          conversationId: "conversation-1",
        });

        expect(result).toBeUndefined();
      });

      it("should clear all messages for a user when no conversationId provided", async () => {
        const result = await storage.clearMessages({
          userId: "user-1",
        });

        expect(result).toBeUndefined();
      });

      it("should not error when clearing messages for non-existent user", async () => {
        await expect(
          storage.clearMessages({
            userId: "non-existent-user",
          }),
        ).resolves.not.toThrow();
      });
    });

    describe("getConversationMessages", () => {
      it("should retrieve messages for a specific conversation", async () => {
        const messages = await storage.getConversationMessages("conversation-1");

        expect(messages).toEqual([
          expect.objectContaining({
            role: "user",
            content: "Hello",
            type: "text",
          }),
          expect.objectContaining({
            role: "assistant",
            content: "Hi there!",
            type: "text",
          }),
        ]);
      });

      it("should handle pagination options", async () => {
        const messages = await storage.getConversationMessages("conversation-1", {
          limit: 1,
          offset: 0,
        });

        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe("user");
      });

      it("should return empty array for non-existent conversation", async () => {
        const messages = await storage.getConversationMessages("non-existent");
        expect(messages).toEqual([]);
      });
    });
  });

  describe("Conversation Operations", () => {
    describe("createConversation", () => {
      it("should create a conversation with the required fields", async () => {
        const newConversation = await storage.createConversation({
          id: "new-conversation-id",
          resourceId: "resource-new",
          userId: "test-user",
          title: "New Conversation",
          metadata: { isTest: true },
        });

        // Verify the returned conversation has expected properties
        expect(newConversation).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            resourceId: "resource-new",
            userId: "test-user",
            title: "New Conversation",
            metadata: { isTest: true },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        );
      });

      it("should create a conversation with custom id when provided", async () => {
        const customId = "custom-conversation-id";
        const newConversation = await storage.createConversation({
          id: customId,
          resourceId: "resource-new",
          userId: "test-user",
          title: "New Conversation",
          metadata: { isTest: true },
        });

        // Verify the returned conversation has the custom id
        expect(newConversation).toEqual(
          expect.objectContaining({
            id: customId,
            resourceId: "resource-new",
            userId: "test-user",
            title: "New Conversation",
            metadata: { isTest: true },
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        );
      });

      it("should create a conversation with minimal required fields", async () => {
        const minimalConversation = await storage.createConversation({
          id: "minimal-conversation-id",
          resourceId: "resource-minimal",
          userId: "test-user",
          title: "",
          metadata: {},
        });

        expect(minimalConversation).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            resourceId: "resource-minimal",
            userId: "test-user",
            title: "",
            metadata: {},
          }),
        );
      });
    });

    describe("getConversation", () => {
      it("should retrieve a conversation by ID", async () => {
        const conversation = await storage.getConversation("conversation-1");

        expect(conversation).toEqual(
          expect.objectContaining({
            id: "conversation-1",
            resourceId: "resource-1",
            userId: "user-1",
            title: "First Conversation",
            metadata: { isImportant: true },
          }),
        );
      });

      it("should return null for non-existent conversation", async () => {
        const conversation = await storage.getConversation("non-existent");
        expect(conversation).toBeNull();
      });
    });

    describe("getConversations", () => {
      it("should retrieve all conversations for a resource", async () => {
        const conversations = await storage.getConversations("resource-1");

        expect(conversations).toHaveLength(2);
        expect(conversations).toEqual([
          expect.objectContaining({
            id: "conversation-1",
            title: "First Conversation",
          }),
          expect.objectContaining({
            id: "conversation-2",
            title: "Second Conversation",
          }),
        ]);
      });

      it("should return empty array for non-existent resource", async () => {
        const conversations = await storage.getConversations("non-existent");
        expect(conversations).toEqual([]);
      });
    });

    describe("getConversationsByUserId", () => {
      it("should retrieve conversations for a specific user", async () => {
        const conversations = await storage.getConversationsByUserId("user-1");

        expect(conversations).toEqual([
          expect.objectContaining({
            id: "conversation-1",
            userId: "user-1",
            title: "First Conversation",
          }),
        ]);
      });

      it("should handle query options", async () => {
        const conversations = await storage.getConversationsByUserId("user-1", {
          limit: 10,
          offset: 0,
          orderBy: "created_at",
          orderDirection: "ASC",
        });

        expect(conversations).toBeDefined();
        expect(Array.isArray(conversations)).toBe(true);
      });

      it("should return empty array for non-existent user", async () => {
        const conversations = await storage.getConversationsByUserId("non-existent-user");
        expect(conversations).toEqual([]);
      });
    });

    describe("queryConversations", () => {
      it("should query conversations with user filter", async () => {
        const conversations = await storage.queryConversations({
          userId: "user-1",
        });

        expect(conversations).toEqual([
          expect.objectContaining({
            id: "conversation-1",
            userId: "user-1",
          }),
        ]);
      });

      it("should query conversations with resource filter", async () => {
        const conversations = await storage.queryConversations({
          resourceId: "resource-1",
        });

        expect(conversations).toHaveLength(2);
      });

      it("should handle pagination and ordering", async () => {
        const conversations = await storage.queryConversations({
          userId: "user-1",
          limit: 5,
          offset: 0,
          orderBy: "updated_at",
          orderDirection: "DESC",
        });

        expect(conversations).toBeDefined();
        expect(Array.isArray(conversations)).toBe(true);
      });
    });

    describe("updateConversation", () => {
      it("should update a conversation's properties", async () => {
        const updates = {
          title: "Updated Title",
          metadata: { isImportant: false, isUpdated: true },
        };

        const updated = await storage.updateConversation("conversation-1", updates);

        expect(updated).toEqual(
          expect.objectContaining({
            id: "conversation-1",
            title: "Updated Title",
            metadata: { isImportant: false, isUpdated: true },
          }),
        );
      });

      it("should handle partial updates", async () => {
        // Use a different conversation ID to avoid interference from previous test
        const titleUpdate = await storage.updateConversation("conversation-2", {
          title: "Only Title Updated",
        });

        expect(titleUpdate.title).toBe("Only Title Updated");
        expect(titleUpdate.metadata).toEqual({ isImportant: false }); // Match the mock data
      });
    });

    describe("deleteConversation", () => {
      it("should delete a conversation and return void", async () => {
        const result = await storage.deleteConversation("conversation-1");

        // Should complete without error and return void
        expect(result).toBeUndefined();

        // Verify the conversation is gone
        const deleted = await storage.getConversation("conversation-1");
        expect(deleted).toBeNull();
      });

      it("should not error when deleting non-existent conversation", async () => {
        await expect(storage.deleteConversation("non-existent")).resolves.not.toThrow();
      });
    });
  });

  describe("User-Specific Conversation Operations", () => {
    describe("getUserConversations", () => {
      it("should return a fluent query builder", () => {
        const builder = storage.getUserConversations("user-1");

        expect(builder).toHaveProperty("limit");
        expect(builder).toHaveProperty("orderBy");
        expect(builder).toHaveProperty("execute");
        expect(typeof builder.limit).toBe("function");
        expect(typeof builder.orderBy).toBe("function");
        expect(typeof builder.execute).toBe("function");
      });

      it("should execute query with limit", async () => {
        const conversations = await storage.getUserConversations("user-1").limit(5).execute();

        expect(conversations).toBeDefined();
        expect(Array.isArray(conversations)).toBe(true);
      });

      it("should execute query with ordering", async () => {
        const conversations = await storage
          .getUserConversations("user-1")
          .orderBy("created_at", "ASC")
          .execute();

        expect(conversations).toBeDefined();
        expect(Array.isArray(conversations)).toBe(true);
      });

      it("should execute query with limit and ordering", async () => {
        const conversations = await storage
          .getUserConversations("user-1")
          .limit(10)
          .orderBy("updated_at", "DESC")
          .execute();

        expect(conversations).toBeDefined();
        expect(Array.isArray(conversations)).toBe(true);
      });

      it("should execute query with default options", async () => {
        const conversations = await storage.getUserConversations("user-1").execute();

        expect(conversations).toBeDefined();
        expect(Array.isArray(conversations)).toBe(true);
      });
    });

    describe("getUserConversation", () => {
      it("should return conversation if user owns it", async () => {
        const conversation = await storage.getUserConversation("conversation-1", "user-1");

        expect(conversation).toEqual(
          expect.objectContaining({
            id: "conversation-1",
            userId: "user-1",
            title: "First Conversation",
          }),
        );
      });

      it("should return null if user doesn't own the conversation", async () => {
        const conversation = await storage.getUserConversation("conversation-1", "user-2");
        expect(conversation).toBeNull();
      });

      it("should return null for non-existent conversation", async () => {
        const conversation = await storage.getUserConversation("non-existent", "user-1");
        expect(conversation).toBeNull();
      });
    });

    describe("getPaginatedUserConversations", () => {
      it("should return paginated conversations with metadata", async () => {
        const result = await storage.getPaginatedUserConversations("user-1", 1, 10);

        expect(result).toEqual(
          expect.objectContaining({
            conversations: expect.any(Array),
            page: 1,
            pageSize: 10,
            hasMore: expect.any(Boolean),
          }),
        );
      });

      it("should handle default pagination parameters", async () => {
        const result = await storage.getPaginatedUserConversations("user-1");

        expect(result).toEqual(
          expect.objectContaining({
            conversations: expect.any(Array),
            page: 1,
            pageSize: 10,
            hasMore: expect.any(Boolean),
          }),
        );
      });

      it("should return empty conversations for non-existent user", async () => {
        const result = await storage.getPaginatedUserConversations("non-existent-user");

        expect(result).toEqual({
          conversations: [],
          page: 1,
          pageSize: 10,
          hasMore: false,
        });
      });

      it("should handle page navigation", async () => {
        const page2 = await storage.getPaginatedUserConversations("user-1", 2, 5);

        expect(page2.page).toBe(2);
        expect(page2.pageSize).toBe(5);
      });
    });
  });

  describe("Workflow Operations", () => {
    describe("Workflow History Operations", () => {
      describe("storeWorkflowHistory", () => {
        it("should store a workflow history entry", async () => {
          const workflowHistory = {
            id: "new-workflow-history",
            name: "New Test Workflow",
            workflowId: "workflow-3",
            status: "running" as const,
            startTime: new Date("2023-01-01T12:00:00.000Z"),
            endTime: undefined,
            input: { param: "test" },
            output: undefined,
            metadata: { userId: "test-user" },
            steps: [],
            events: [],
            createdAt: new Date("2023-01-01T12:00:00.000Z"),
            updatedAt: new Date("2023-01-01T12:00:00.000Z"),
          };

          const result = await storage.storeWorkflowHistory(workflowHistory);
          expect(result).toBeUndefined();
        });
      });

      describe("getWorkflowHistory", () => {
        it("should retrieve a workflow history entry by ID", async () => {
          const history = await storage.getWorkflowHistory("workflow-history-1");

          expect(history).toEqual(
            expect.objectContaining({
              id: "workflow-history-1",
              workflowName: "Test Workflow",
              workflowId: "workflow-1",
              status: "completed",
              input: { param: "value" },
              output: { result: "success" },
              metadata: { userId: "user-1" },
            }),
          );
        });

        it("should return null for non-existent workflow history", async () => {
          const history = await storage.getWorkflowHistory("non-existent");
          expect(history).toBeNull();
        });
      });

      describe("getWorkflowHistoryByWorkflowId", () => {
        it("should retrieve workflow histories for a specific workflow ID", async () => {
          const histories = await storage.getWorkflowHistoryByWorkflowId("workflow-1");

          expect(histories).toHaveLength(1);
          expect(histories[0]).toEqual(
            expect.objectContaining({
              id: "workflow-history-1",
              workflowId: "workflow-1",
              workflowName: "Test Workflow",
            }),
          );
        });

        it("should return empty array for non-existent workflow ID", async () => {
          const histories = await storage.getWorkflowHistoryByWorkflowId("non-existent");
          expect(histories).toEqual([]);
        });
      });

      describe("updateWorkflowHistory", () => {
        it("should update a workflow history entry", async () => {
          const updates = {
            status: "completed" as const,
            endTime: new Date("2023-01-01T12:05:00.000Z"),
            output: { result: "updated" },
          };

          const result = await storage.updateWorkflowHistory("workflow-history-2", updates);
          expect(result).toBeUndefined();
        });
      });

      describe("deleteWorkflowHistory", () => {
        it("should delete a workflow history entry", async () => {
          const result = await storage.deleteWorkflowHistory("workflow-history-1");
          expect(result).toBeUndefined();
        });
      });
    });

    describe("Workflow Steps Operations", () => {
      describe("storeWorkflowStep", () => {
        it("should store a workflow step", async () => {
          const workflowStep = {
            id: "new-step",
            workflowHistoryId: "workflow-history-1",
            stepIndex: 2,
            stepType: "func" as const,
            stepName: "New Step",
            status: "running" as const,
            startTime: new Date("2023-01-01T10:06:00.000Z"),
            endTime: undefined,
            input: { data: "input" },
            output: undefined,
            errorMessage: undefined,
            agentExecutionId: undefined,
            createdAt: new Date("2023-01-01T10:06:00.000Z"),
            updatedAt: new Date("2023-01-01T10:06:00.000Z"),
          };

          const result = await storage.storeWorkflowStep(workflowStep);
          expect(result).toBeUndefined();
        });
      });

      describe("getWorkflowStep", () => {
        it("should retrieve a workflow step by ID", async () => {
          const step = await storage.getWorkflowStep("step-1");

          expect(step).toEqual(
            expect.objectContaining({
              id: "step-1",
              workflowHistoryId: "workflow-history-1",
              stepIndex: 0,
              stepType: "agent",
              stepName: "First Step",
              status: "completed",
            }),
          );
        });

        it("should return null for non-existent workflow step", async () => {
          const step = await storage.getWorkflowStep("non-existent");
          expect(step).toBeNull();
        });
      });

      describe("getWorkflowSteps", () => {
        it("should retrieve workflow steps for a workflow history", async () => {
          const steps = await storage.getWorkflowSteps("workflow-history-1");

          expect(steps).toHaveLength(2);
          expect(steps[0]).toEqual(
            expect.objectContaining({
              id: "step-1",
              stepIndex: 0,
              stepName: "First Step",
            }),
          );
          expect(steps[1]).toEqual(
            expect.objectContaining({
              id: "step-2",
              stepIndex: 1,
              stepName: "Second Step",
            }),
          );
        });

        it("should return empty array for non-existent workflow history", async () => {
          const steps = await storage.getWorkflowSteps("non-existent");
          expect(steps).toEqual([]);
        });
      });

      describe("updateWorkflowStep", () => {
        it("should update a workflow step", async () => {
          const updates = {
            status: "completed" as const,
            endTime: new Date("2023-01-01T10:08:00.000Z"),
            output: { result: "updated" },
          };

          const result = await storage.updateWorkflowStep("step-1", updates);
          expect(result).toBeUndefined();
        });
      });

      describe("deleteWorkflowStep", () => {
        it("should delete a workflow step", async () => {
          const result = await storage.deleteWorkflowStep("step-1");
          expect(result).toBeUndefined();
        });
      });
    });

    describe("Workflow Timeline Events Operations", () => {
      describe("storeWorkflowTimelineEvent", () => {
        it("should store a workflow timeline event", async () => {
          const timelineEvent = {
            id: "new-event",
            workflowHistoryId: "workflow-history-1",
            eventId: "new-event",
            name: "test_event",
            type: "workflow-step",
            startTime: new Date("2023-01-01T10:07:00.000Z"),
            endTime: undefined,
            status: "running",
            level: "INFO",
            input: { event: "data" },
            output: undefined,
            statusMessage: undefined,
            metadata: { custom: "metadata" },
            traceId: "trace-2",
            parentEventId: "event-1",
            createdAt: new Date("2023-01-01T10:07:00.000Z"),
          };

          const result = await storage.storeWorkflowTimelineEvent(timelineEvent);
          expect(result).toBeUndefined();
        });
      });

      describe("getWorkflowTimelineEvent", () => {
        it("should retrieve a workflow timeline event by ID", async () => {
          const event = await storage.getWorkflowTimelineEvent("event-1");

          expect(event).toEqual(
            expect.objectContaining({
              id: "event-1",
              workflowHistoryId: "workflow-history-1",
              eventId: "event-1",
              name: "workflow_start",
              type: "workflow",
              status: "completed",
              level: "INFO",
            }),
          );
        });

        it("should return null for non-existent timeline event", async () => {
          const event = await storage.getWorkflowTimelineEvent("non-existent");
          expect(event).toBeNull();
        });
      });

      describe("getWorkflowTimelineEvents", () => {
        it("should retrieve timeline events for a workflow history", async () => {
          const events = await storage.getWorkflowTimelineEvents("workflow-history-1");

          expect(events).toHaveLength(2);
          expect(events[0]).toEqual(
            expect.objectContaining({
              id: "event-1",
              name: "workflow_start",
              type: "workflow",
            }),
          );
          expect(events[1]).toEqual(
            expect.objectContaining({
              id: "event-2",
              name: "step_execution",
              type: "workflow-step",
            }),
          );
        });

        it("should return empty array for non-existent workflow history", async () => {
          const events = await storage.getWorkflowTimelineEvents("non-existent");
          expect(events).toEqual([]);
        });
      });

      describe("deleteWorkflowTimelineEvent", () => {
        it("should delete a workflow timeline event", async () => {
          const result = await storage.deleteWorkflowTimelineEvent("event-1");
          expect(result).toBeUndefined();
        });
      });
    });

    describe("Query Operations", () => {
      describe("getAllWorkflowIds", () => {
        it("should retrieve all workflow IDs", async () => {
          const workflowIds = await storage.getAllWorkflowIds();

          expect(workflowIds).toEqual(expect.arrayContaining(["workflow-1", "workflow-2"]));
        });
      });
    });

    describe("Bulk Operations", () => {
      describe("getWorkflowHistoryWithStepsAndEvents", () => {
        it("should retrieve workflow history with steps and events", async () => {
          const historyWithDetails =
            await storage.getWorkflowHistoryWithStepsAndEvents("workflow-history-1");

          expect(historyWithDetails).toEqual(
            expect.objectContaining({
              id: "workflow-history-1",
              workflowName: "Test Workflow",
              steps: expect.any(Array),
              events: expect.any(Array),
            }),
          );

          expect(historyWithDetails?.steps).toHaveLength(2);
          expect(historyWithDetails?.events).toHaveLength(2);
        });

        it("should return null for non-existent workflow history", async () => {
          const historyWithDetails =
            await storage.getWorkflowHistoryWithStepsAndEvents("non-existent");
          expect(historyWithDetails).toBeNull();
        });
      });

      describe("deleteWorkflowHistoryWithRelated", () => {
        it("should delete workflow history with related data", async () => {
          const result = await storage.deleteWorkflowHistoryWithRelated("workflow-history-1");
          expect(result).toBeUndefined();
        });
      });
    });

    describe("Cleanup Operations", () => {
      describe("cleanupOldWorkflowHistories", () => {
        it("should cleanup old workflow histories beyond limit", async () => {
          const deletedCount = await storage.cleanupOldWorkflowHistories("workflow-1", 1);
          expect(deletedCount).toBeGreaterThanOrEqual(0);
        });

        it("should return 0 when no cleanup needed", async () => {
          const deletedCount = await storage.cleanupOldWorkflowHistories("workflow-1", 10);
          expect(deletedCount).toBe(0);
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // @ts-expect-error - Accessing private property for testing
      storage.client.execute.mockImplementationOnce(() => {
        throw new Error("Database connection failed");
      });

      await expect(storage.getMessages()).rejects.toThrow();
    });

    it("should close the database connection", async () => {
      storage.close();

      // @ts-expect-error - Accessing private property for testing
      expect(storage.client.close).toHaveBeenCalled();
    });
  });
});
