import type { Conversation, MemoryMessage } from "@voltagent/core";
import { PostgresStorage } from ".";

// Mock pg Pool
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  })),
}));

// Mock Math.random for generateId
const mockRandomValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
let mockRandomIndex = 0;

vi.spyOn(Math, "random").mockImplementation(() => {
  return mockRandomValues[mockRandomIndex++ % mockRandomValues.length];
});

// Test data helpers
const createMessage = (overrides: Partial<MemoryMessage> = {}): MemoryMessage => ({
  id: "test-message-id",
  role: "user",
  content: "Test message",
  type: "text",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: "test-conversation-id",
  resourceId: "test-resource",
  userId: "test-user",
  title: "Test Conversation",
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createTimelineEvent = (overrides: any = {}): any => ({
  id: "test-event-id",
  type: "agent",
  name: "agent:start",
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  status: "running",
  level: "INFO",
  input: { message: "test input" },
  output: { result: "test output" },
  metadata: { id: "test-agent", agentId: "test-agent" },
  ...overrides,
});

describe("PostgresStorage", () => {
  let storage: PostgresStorage;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    mockRandomIndex = 0;

    // Setup mock query responses
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockEnd.mockReset();

    // Default successful query response
    mockQuery.mockResolvedValue({ rows: [] });
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: vi.fn(),
    });

    // Create storage instance with test configuration
    storage = new PostgresStorage({
      connection: {
        host: "localhost",
        port: 5432,
        database: "test_db",
        user: "test_user",
        password: "test_password",
      },
      debug: true,
    });

    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Initialization", () => {
    it("should initialize with default options", () => {
      const defaultStorage = new PostgresStorage({
        connection: "postgresql://test",
      });

      // @ts-expect-error - Accessing private property for testing
      expect(defaultStorage.options.storageLimit).toBe(100);
      // @ts-expect-error - Accessing private property for testing
      expect(defaultStorage.options.tablePrefix).toBe("voltagent_memory");
      // @ts-expect-error - Accessing private property for testing
      expect(defaultStorage.options.maxConnections).toBe(10);
      // @ts-expect-error - Accessing private property for testing
      expect(defaultStorage.options.debug).toBe(false);
    });

    it("should initialize with custom options", () => {
      const customStorage = new PostgresStorage({
        connection: "postgresql://test",
        storageLimit: 50,
        tablePrefix: "custom_prefix",
        maxConnections: 5,
        debug: true,
      });

      // @ts-expect-error - Accessing private property for testing
      expect(customStorage.options.storageLimit).toBe(50);
      // @ts-expect-error - Accessing private property for testing
      expect(customStorage.options.tablePrefix).toBe("custom_prefix");
      // @ts-expect-error - Accessing private property for testing
      expect(customStorage.options.maxConnections).toBe(5);
      // @ts-expect-error - Accessing private property for testing
      expect(customStorage.options.debug).toBe(true);
    });

    it("should initialize database tables on construction", async () => {
      // Verify that the tables were created
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS"));
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("CREATE INDEX IF NOT EXISTS"));

      // Verify new timeline events table was created
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("agent_history_timeline_events"),
      );
    });
  });

  describe("Message Operations", () => {
    it("should add a message", async () => {
      // First create a conversation
      const conversation = createConversation({ id: "conversation1" });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: conversation.id,
            resource_id: conversation.resourceId,
            user_id: conversation.userId,
            title: conversation.title,
            metadata: conversation.metadata,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
          },
        ],
      });

      await storage.createConversation({
        id: conversation.id,
        resourceId: conversation.resourceId,
        userId: conversation.userId,
        title: conversation.title,
        metadata: conversation.metadata,
      });

      // Now add a message
      const message = createMessage();
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For BEGIN transaction
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For message insert
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] }); // For count query
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For COMMIT transaction

      await storage.addMessage(message, "conversation1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          "conversation1",
          message.id,
          message.role,
          message.content,
          message.type,
          message.createdAt,
        ]),
      );
    });

    it("should get messages with filters", async () => {
      const mockMessages = [
        createMessage({ id: "msg1", role: "user" }),
        createMessage({ id: "msg2", role: "assistant" }),
      ];
      mockQuery.mockResolvedValueOnce({
        rows: mockMessages.map((msg) => ({
          message_id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.type,
          created_at: msg.createdAt,
        })),
      });

      const messages = await storage.getMessages({
        userId: "user1",
        conversationId: "conversation1",
        limit: 10,
        role: "user",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["user1", "conversation1", "user", 10]),
      );
      expect(messages).toEqual(mockMessages);
    });

    it("should clear messages", async () => {
      await storage.clearMessages({ userId: "user1", conversationId: "conversation1" });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM"),
        expect.arrayContaining(["conversation1", "user1"]),
      );
    });

    it("should respect storage limit", async () => {
      // Use the existing storage instance instead of creating a new one
      const message = createMessage();

      // First create a conversation using existing storage
      const conversation = createConversation({ id: "conversation1" });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: conversation.id,
            resource_id: conversation.resourceId,
            user_id: conversation.userId,
            title: conversation.title,
            metadata: conversation.metadata, // No JSON.stringify needed in mock
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
          },
        ],
      });

      await storage.createConversation({
        id: conversation.id,
        resourceId: conversation.resourceId,
        userId: conversation.userId,
        title: conversation.title,
        metadata: conversation.metadata,
      });

      // Mock storage limit scenario by setting up mocks for message addition
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For BEGIN transaction
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For message insert
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 101 }] }); // For count query (exceeds default limit of 100)
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For cleanup query
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For COMMIT transaction

      await storage.addMessage(message, "conversation1");

      // Verify that cleanup was called when limit was exceeded
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM"),
        expect.arrayContaining(["conversation1", 1]), // Should delete 1 message (101 - 100)
      );
    });
  });

  describe("Conversation Operations", () => {
    it("should create a conversation", async () => {
      const conversation = createConversation();
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: conversation.id,
            resource_id: conversation.resourceId,
            user_id: conversation.userId,
            title: conversation.title,
            metadata: conversation.metadata,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
          },
        ],
      });

      const result = await storage.createConversation({
        id: conversation.id,
        resourceId: conversation.resourceId,
        userId: conversation.userId,
        title: conversation.title,
        metadata: conversation.metadata,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          conversation.id,
          conversation.resourceId,
          conversation.userId,
          conversation.title,
          JSON.stringify(conversation.metadata),
        ]),
      );
      expect(result).toEqual(conversation);
    });

    it("should get a conversation by ID", async () => {
      const conversation = createConversation();
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: conversation.id,
            resource_id: conversation.resourceId,
            user_id: conversation.userId,
            title: conversation.title,
            metadata: conversation.metadata,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
          },
        ],
      });

      const result = await storage.getConversation(conversation.id);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [conversation.id]);
      expect(result).toEqual(conversation);
    });

    it("should get conversations for a resource", async () => {
      const conversations = [createConversation(), createConversation()];
      mockQuery.mockResolvedValueOnce({
        rows: conversations.map((conv) => ({
          id: conv.id,
          resource_id: conv.resourceId,
          user_id: conv.userId,
          title: conv.title,
          metadata: conv.metadata,
          created_at: conv.createdAt,
          updated_at: conv.updatedAt,
        })),
      });

      const result = await storage.getConversations("test-resource");

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), ["test-resource"]);
      expect(result).toEqual(conversations);
    });

    it("should update a conversation", async () => {
      const conversation = createConversation();
      const updates = { title: "Updated Title" };
      const updatedConversation = { ...conversation, ...updates };
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: updatedConversation.id,
            resource_id: updatedConversation.resourceId,
            user_id: updatedConversation.userId,
            title: updatedConversation.title,
            metadata: updatedConversation.metadata,
            created_at: updatedConversation.createdAt,
            updated_at: updatedConversation.updatedAt,
          },
        ],
      });

      const result = await storage.updateConversation(conversation.id, updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE"),
        expect.arrayContaining([updates.title, conversation.id]),
      );
      expect(result).toEqual(updatedConversation);
    });

    it("should delete a conversation", async () => {
      const conversation = createConversation();
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For DELETE
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For COMMIT

      await storage.deleteConversation(conversation.id);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM"), [
        conversation.id,
      ]);
    });

    it("should get conversations by user ID", async () => {
      const conversations = [
        createConversation({ userId: "user1" }),
        createConversation({ userId: "user1" }),
      ];
      mockQuery.mockResolvedValueOnce({
        rows: conversations.map((conv) => ({
          id: conv.id,
          resource_id: conv.resourceId,
          user_id: conv.userId,
          title: conv.title,
          metadata: conv.metadata,
          created_at: conv.createdAt,
          updated_at: conv.updatedAt,
        })),
      });

      const result = await storage.getConversationsByUserId("user1", { limit: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["user1", 10, 0]),
      );
      expect(result).toEqual(conversations);
    });

    it("should query conversations with multiple filters", async () => {
      const conversations = [createConversation({ userId: "user1", resourceId: "resource1" })];
      mockQuery.mockResolvedValueOnce({
        rows: conversations.map((conv) => ({
          id: conv.id,
          resource_id: conv.resourceId,
          user_id: conv.userId,
          title: conv.title,
          metadata: conv.metadata,
          created_at: conv.createdAt,
          updated_at: conv.updatedAt,
        })),
      });

      const result = await storage.queryConversations({
        userId: "user1",
        resourceId: "resource1",
        limit: 5,
        orderBy: "created_at",
        orderDirection: "ASC",
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["user1", "resource1", 5, 0]),
      );
      expect(result).toEqual(conversations);
    });

    it("should get conversation messages", async () => {
      const messages = [
        createMessage({ id: "msg1", role: "user" }),
        createMessage({ id: "msg2", role: "assistant" }),
      ];
      mockQuery.mockResolvedValueOnce({
        rows: messages.map((msg) => ({
          message_id: msg.id,
          role: msg.role,
          content: msg.content,
          type: msg.type,
          created_at: msg.createdAt,
        })),
      });

      const result = await storage.getConversationMessages("conversation1", { limit: 50 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["conversation1", 50, 0]),
      );
      expect(result).toEqual(messages);
    });

    describe("User-specific conversation methods", () => {
      describe("getUserConversations fluent interface", () => {
        it("should execute with default options", async () => {
          const conversations = [
            createConversation({ userId: "user1" }),
            createConversation({ userId: "user1" }),
          ];
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage.getUserConversations("user1").execute();

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1"]),
          );
          expect(result).toEqual(conversations);
        });

        it("should execute with limit", async () => {
          const conversations = [createConversation({ userId: "user1" })];
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage.getUserConversations("user1").limit(5).execute();

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1", 5, 0]),
          );
          expect(result).toEqual(conversations);
        });

        it("should execute with ordering", async () => {
          const conversations = [createConversation({ userId: "user1" })];
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage
            .getUserConversations("user1")
            .orderBy("created_at", "ASC")
            .execute();

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1"]),
          );
          expect(result).toEqual(conversations);
        });

        it("should execute with limit and ordering", async () => {
          const conversations = [createConversation({ userId: "user1" })];
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage
            .getUserConversations("user1")
            .limit(3)
            .orderBy("title", "DESC")
            .execute();

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1", 3, 0]),
          );
          expect(result).toEqual(conversations);
        });

        it("should execute with ordering and limit (reversed order)", async () => {
          const conversations = [createConversation({ userId: "user1" })];
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage
            .getUserConversations("user1")
            .orderBy("updated_at", "DESC")
            .limit(2)
            .execute();

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1", 2, 0]),
          );
          expect(result).toEqual(conversations);
        });
      });

      describe("getUserConversation", () => {
        it("should return conversation when user owns it", async () => {
          const conversation = createConversation({ userId: "user1", id: "conv1" });
          mockQuery.mockResolvedValueOnce({
            rows: [
              {
                id: conversation.id,
                resource_id: conversation.resourceId,
                user_id: conversation.userId,
                title: conversation.title,
                metadata: conversation.metadata,
                created_at: conversation.createdAt,
                updated_at: conversation.updatedAt,
              },
            ],
          });

          const result = await storage.getUserConversation("conv1", "user1");

          expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), ["conv1"]);
          expect(result).toEqual(conversation);
        });

        it("should return null when user does not own conversation", async () => {
          const conversation = createConversation({ userId: "user2", id: "conv1" });
          mockQuery.mockResolvedValueOnce({
            rows: [
              {
                id: conversation.id,
                resource_id: conversation.resourceId,
                user_id: conversation.userId,
                title: conversation.title,
                metadata: conversation.metadata,
                created_at: conversation.createdAt,
                updated_at: conversation.updatedAt,
              },
            ],
          });

          const result = await storage.getUserConversation("conv1", "user1");

          expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), ["conv1"]);
          expect(result).toBeNull();
        });

        it("should return null when conversation does not exist", async () => {
          mockQuery.mockResolvedValueOnce({ rows: [] });

          const result = await storage.getUserConversation("nonexistent", "user1");

          expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
            "nonexistent",
          ]);
          expect(result).toBeNull();
        });
      });

      describe("getPaginatedUserConversations", () => {
        it("should return paginated conversations with default parameters", async () => {
          const conversations = Array.from({ length: 10 }, (_, i) =>
            createConversation({ userId: "user1", id: `conv${i}` }),
          );
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage.getPaginatedUserConversations("user1");

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1", 11, 0]), // limit + 1 to check hasMore
          );
          expect(result).toEqual({
            conversations,
            page: 1,
            pageSize: 10,
            hasMore: false,
          });
        });

        it("should return paginated conversations with custom parameters", async () => {
          const conversations = Array.from({ length: 5 }, (_, i) =>
            createConversation({ userId: "user1", id: `conv${i}` }),
          );
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage.getPaginatedUserConversations("user1", 2, 5);

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1", 6, 5]), // limit + 1, offset = (page-1) * pageSize
          );
          expect(result).toEqual({
            conversations,
            page: 2,
            pageSize: 5,
            hasMore: false,
          });
        });

        it("should indicate hasMore when there are more conversations", async () => {
          // Return pageSize + 1 conversations to indicate there are more
          const conversations = Array.from({ length: 6 }, (_, i) =>
            createConversation({ userId: "user1", id: `conv${i}` }),
          );
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          const result = await storage.getPaginatedUserConversations("user1", 1, 5);

          expect(result).toEqual({
            conversations: conversations.slice(0, 5), // Should only return pageSize items
            page: 1,
            pageSize: 5,
            hasMore: true,
          });
        });

        it("should handle empty results", async () => {
          mockQuery.mockResolvedValueOnce({ rows: [] });

          const result = await storage.getPaginatedUserConversations("user1");

          expect(result).toEqual({
            conversations: [],
            page: 1,
            pageSize: 10,
            hasMore: false,
          });
        });

        it("should calculate correct offset for different pages", async () => {
          const conversations = [createConversation({ userId: "user1" })];
          mockQuery.mockResolvedValueOnce({
            rows: conversations.map((conv) => ({
              id: conv.id,
              resource_id: conv.resourceId,
              user_id: conv.userId,
              title: conv.title,
              metadata: conv.metadata,
              created_at: conv.createdAt,
              updated_at: conv.updatedAt,
            })),
          });

          await storage.getPaginatedUserConversations("user1", 3, 10);

          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining("SELECT"),
            expect.arrayContaining(["user1", 11, 20]), // offset = (3-1) * 10 = 20
          );
        });
      });
    });
  });

  describe("History Operations", () => {
    it("should add a history entry with new structure", async () => {
      const historyData = {
        id: "history-1",
        timestamp: new Date(),
        status: "completed",
        input: { message: "test input" },
        output: { result: "test output" },
        usage: { tokens: 100 },
        metadata: { source: "test" },
      };

      await storage.addHistoryEntry("history-1", historyData, "agent-1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          "history-1",
          "agent-1",
          historyData.timestamp.toISOString(),
          "completed",
          JSON.stringify(historyData.input),
          JSON.stringify(historyData.output),
          JSON.stringify(historyData.usage),
          JSON.stringify(historyData.metadata),
        ]),
      );
    });

    it("should get a history entry with events and steps", async () => {
      const mockHistoryRow = {
        id: "history-1",
        agent_id: "agent-1",
        timestamp: new Date().toISOString(),
        status: "completed",
        input: { message: "test input" },
        output: { result: "test output" },
        usage: { tokens: 100 },
        metadata: { source: "test" },
      };

      const mockSteps = [{ value: { type: "tool", name: "search", content: "searching..." } }];

      const mockEvents = [
        {
          id: "event-1",
          event_type: "agent",
          event_name: "agent:start",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          status: "completed",
          level: "INFO",
          input: { message: "test" },
          output: { result: "done" },
        },
      ];

      // Mock the three queries: history entry, steps, and timeline events
      mockQuery
        .mockResolvedValueOnce({ rows: [mockHistoryRow] })
        .mockResolvedValueOnce({ rows: mockSteps })
        .mockResolvedValueOnce({ rows: mockEvents });

      const result = await storage.getHistoryEntry("history-1");

      expect(result).toEqual(
        expect.objectContaining({
          id: "history-1",
          _agentId: "agent-1",
          status: "completed",
          steps: expect.arrayContaining([
            expect.objectContaining({
              type: "tool",
              name: "search",
            }),
          ]),
          events: expect.arrayContaining([
            expect.objectContaining({
              id: "event-1",
              type: "agent",
              name: "agent:start",
            }),
          ]),
        }),
      );
    });

    it("should get all history entries for an agent", async () => {
      const mockHistoryRows = [
        {
          id: "history-1",
          agent_id: "agent-1",
          timestamp: new Date().toISOString(),
          status: "completed",
          input: { message: "test" },
          output: { result: "done" },
          usage: null,
          metadata: null,
        },
      ];

      // Mock queries: history entries, steps for each entry, events for each entry
      mockQuery
        .mockResolvedValueOnce({ rows: mockHistoryRows })
        .mockResolvedValueOnce({ rows: [] }) // steps
        .mockResolvedValueOnce({ rows: [] }); // events

      const result = await storage.getAllHistoryEntriesByAgent("agent-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "history-1",
          _agentId: "agent-1",
          status: "completed",
          steps: [],
          events: [],
        }),
      );
    });
  });

  describe("Timeline Events Operations", () => {
    it("should add a timeline event", async () => {
      const event = createTimelineEvent();

      await storage.addTimelineEvent("event-1", event, "history-1", "agent-1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          "event-1",
          "history-1",
          "agent-1",
          event.type,
          event.name,
          event.startTime,
          event.endTime,
          event.status,
          null, // status_message
          event.level,
          null, // version
          null, // parent_event_id
          null, // tags
          JSON.stringify(event.input),
          JSON.stringify(event.output),
          null, // error
          JSON.stringify(event.metadata),
        ]),
      );
    });

    it("should handle timeline event with all optional fields", async () => {
      const event = createTimelineEvent({
        statusMessage: "Event completed successfully",
        version: "1.0.0",
        parentEventId: "parent-event-1",
        tags: ["test", "agent"],
        error: { message: "Test error" },
      });

      await storage.addTimelineEvent("event-2", event, "history-1", "agent-1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          "event-2",
          "history-1",
          "agent-1",
          event.type,
          event.name,
          event.startTime,
          event.endTime,
          event.status,
          JSON.stringify(event.statusMessage),
          event.level,
          event.version,
          event.parentEventId,
          JSON.stringify(event.tags),
          JSON.stringify(event.input),
          JSON.stringify(event.output),
          JSON.stringify(event.statusMessage),
          JSON.stringify(event.metadata),
        ]),
      );
    });
  });

  describe("History Steps Operations", () => {
    it("should add a history step", async () => {
      const stepData = {
        type: "tool",
        name: "search",
        content: "Searching for information...",
        arguments: { query: "test query" },
      };

      await storage.addHistoryStep("step-1", stepData, "history-1", "agent-1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining(["step-1", JSON.stringify(stepData), "history-1", "agent-1"]),
      );
    });

    it("should get a history step", async () => {
      const stepData = {
        type: "tool",
        name: "search",
        content: "Searching...",
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ value: stepData }],
      });

      const result = await storage.getHistoryStep("step-1");

      expect(result).toEqual(stepData);
    });

    it("should return undefined for non-existent step", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await storage.getHistoryStep("non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      const error = new Error("Database error");
      mockQuery.mockRejectedValueOnce(error);

      await expect(storage.addMessage(createMessage(), "user1")).rejects.toThrow(
        "Failed to add message to PostgreSQL database",
      );
    });

    it("should handle connection errors", async () => {
      // Create a mock client that will throw the wrapped error
      const mockClient = {
        query: jest
          .fn()
          .mockRejectedValue(new Error("Failed to add message to PostgreSQL database")),
        release: vi.fn(),
      };

      // Setup mocks in the correct order
      mockConnect.mockResolvedValueOnce(mockClient);
      mockQuery.mockRejectedValueOnce(new Error("Failed to add message to PostgreSQL database"));

      await expect(storage.addMessage(createMessage(), "user1")).rejects.toThrow(
        "Failed to add message to PostgreSQL database",
      );
    });

    it("should handle timeline event errors", async () => {
      const error = new Error("Timeline event error");
      mockQuery.mockRejectedValueOnce(error);

      const event = createTimelineEvent();
      await expect(
        storage.addTimelineEvent("event-1", event, "history-1", "agent-1"),
      ).rejects.toThrow("Failed to add timeline event to PostgreSQL database");
    });

    it("should handle history entry errors", async () => {
      const error = new Error("History entry error");
      mockQuery.mockRejectedValueOnce(error);

      await expect(storage.addHistoryEntry("history-1", {}, "agent-1")).rejects.toThrow(
        "Failed to add history entry to PostgreSQL database",
      );
    });
  });

  describe("Connection Management", () => {
    it("should close the connection pool", async () => {
      await storage.close();
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
