import { LibSQLStorage } from ".";
import type { MemoryMessage } from "../types";

// Create shared data structure for tests
const mockDataStore = {
  deletedConversations: new Set<string>(),
  conversationUpdates: new Map<string, any>(),
};

// We'll create proper mocks for external dependencies
jest.mock("@libsql/client", () => {
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
  };

  // A smart mock that handles various types of queries
  const createMockExecute = () => {
    return jest.fn().mockImplementation(({ sql, args }) => {
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

      // Default response
      return Promise.resolve({ rows: [] });
    });
  };

  // Create the mock client
  const mockClient = {
    execute: createMockExecute(),
    close: jest.fn(),
  };

  return {
    createClient: jest.fn().mockReturnValue(mockClient),
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
    jest.clearAllMocks();
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
