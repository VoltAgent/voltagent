import { PostgresStorage } from ".";
import type { Conversation, MemoryMessage } from "../types";

// Mock pg Pool
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockEnd = jest.fn();

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  })),
}));

// Mock Math.random for generateId
const mockRandomValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
let mockRandomIndex = 0;

jest.spyOn(Math, "random").mockImplementation(() => {
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
  title: "Test Conversation",
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("PostgresStorage", () => {
  let storage: PostgresStorage;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockRandomIndex = 0;

    // Setup mock query responses
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockEnd.mockReset();

    // Default successful query response
    mockQuery.mockResolvedValue({ rows: [] });
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
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
    });
  });

  describe("Message Operations", () => {
    it("should add a message", async () => {
      const message = createMessage();
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For message insert
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For cleanup query

      await storage.addMessage(message, "user1", "conversation1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          "user1",
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

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM"), [
        "user1",
        "conversation1",
      ]);
    });

    it("should respect storage limit", async () => {
      const message = createMessage();
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For message insert
      mockQuery.mockResolvedValueOnce({ rows: [] }); // For cleanup query

      const limitedStorage = new PostgresStorage({
        connection: "postgresql://test",
        storageLimit: 1,
      });

      await limitedStorage.addMessage(message, "user1", "conversation1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM"),
        expect.arrayContaining(["user1", "conversation1", 1]),
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
        title: conversation.title,
        metadata: conversation.metadata,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.arrayContaining([
          conversation.id,
          conversation.resourceId,
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
        release: jest.fn(),
      };

      // Setup mocks in the correct order
      mockConnect.mockResolvedValueOnce(mockClient);
      mockQuery.mockRejectedValueOnce(new Error("Failed to add message to PostgreSQL database"));

      await expect(storage.addMessage(createMessage(), "user1")).rejects.toThrow(
        "Failed to add message to PostgreSQL database",
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
