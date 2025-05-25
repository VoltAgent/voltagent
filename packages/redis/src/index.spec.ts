import { RedisMemory } from "./index";

// Define test types locally to avoid import issues in test environment
interface MemoryMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  type: "text" | "tool-call" | "tool-result";
  createdAt: string;
}

// Mock node-redis for testing
jest.mock("redis", () => {
  const mockRedis = {
    eval: jest.fn(),
    lRange: jest.fn(),
    keys: jest.fn(),
    multi: jest.fn(),
    hSet: jest.fn(),
    hGetAll: jest.fn(),
    zAdd: jest.fn(),
    zRange: jest.fn(),
    sAdd: jest.fn(),
    sMembers: jest.fn(),
    unlink: jest.fn(),
    zRem: jest.fn(),
    expire: jest.fn(),
    quit: jest.fn(),
    isOpen: true,
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  };

  // Mock multi/pipeline
  const mockMulti = {
    hSet: jest.fn().mockReturnThis(),
    zAdd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    unlink: jest.fn().mockReturnThis(),
    zRem: jest.fn().mockReturnThis(),
    sAdd: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  mockRedis.multi.mockReturnValue(mockMulti);

  return {
    createClient: jest.fn().mockImplementation(() => mockRedis),
  };
});

describe("RedisMemory", () => {
  let redisMemory: RedisMemory;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMemory = new RedisMemory({
      debug: true,
      keyPrefix: "test:",
      compressionThreshold: 100, // Low threshold for testing compression
    });

    // Get the mocked Redis instance
    mockRedis = (redisMemory as any).redis;
  });

  afterEach(async () => {
    await redisMemory.close();
  });

  describe("Message Operations", () => {
    const testMessage: MemoryMessage = {
      id: "msg-1",
      role: "user",
      content: "Hello, world!",
      type: "text",
      createdAt: "2023-01-01T00:00:00Z",
    };

    it("should add a message successfully", async () => {
      mockRedis.eval.mockResolvedValue(1);

      await redisMemory.addMessage(testMessage, "user123", "conv456");

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining("LPUSH"),
        expect.objectContaining({
          keys: ["test:{user123:conv456}:msg", "test:{user123:conv456}:meta"],
          arguments: expect.arrayContaining([
            expect.any(String), // stored message data
            "1000", // storage limit
            expect.any(String), // timestamp
            expect.any(String), // message size
            expect.any(String), // compression ratio
            "0", // TTL
          ]),
        }),
      );
    });

    it("should get messages successfully", async () => {
      const storedMessage = JSON.stringify({
        type: "inline",
        data: testMessage,
      });

      mockRedis.lRange.mockResolvedValue([storedMessage]);

      const messages = await redisMemory.getMessages({
        userId: "user123",
        conversationId: "conv456",
        limit: 10,
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: testMessage.role, content: testMessage.content });
      expect(mockRedis.lRange).toHaveBeenCalledWith("test:{user123:conv456}:msg", 0, 9);
    });

    it("should handle compressed messages", async () => {
      // Create a large message that should be compressed
      const largeMessage: MemoryMessage = {
        ...testMessage,
        content: "x".repeat(200), // Larger than compression threshold
      };

      mockRedis.eval.mockResolvedValue(1);

      await redisMemory.addMessage(largeMessage, "user123", "conv456");

      // Verify compression was applied (message size > threshold)
      const evalCall = mockRedis.eval.mock.calls[0];
      expect(evalCall[1].arguments[0]).toContain("compressed"); // Should contain compressed data
    });

    it("should clear messages for a conversation", async () => {
      await redisMemory.clearMessages({
        userId: "user123",
        conversationId: "conv456",
      });

      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it("should clear all messages for a user", async () => {
      mockRedis.keys.mockResolvedValue(["test:msg:user123:conv1", "test:msg:user123:conv2"]);

      await redisMemory.clearMessages({
        userId: "user123",
      });

      expect(mockRedis.keys).toHaveBeenCalledWith("test:{user123:*}:msg");
    });
  });

  describe("Conversation Operations", () => {
    const testConversation = {
      id: "conv-1",
      resourceId: "agent-1",
      title: "Test Conversation",
      metadata: { key: "value" },
    };

    it("should create a conversation successfully", async () => {
      const result = await redisMemory.createConversation(testConversation);

      expect(result).toMatchObject({
        ...testConversation,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it("should get a conversation by ID", async () => {
      mockRedis.hGetAll.mockResolvedValue({
        id: "conv-1",
        resourceId: "agent-1",
        title: "Test Conversation",
        metadata: '{"key":"value"}',
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      });

      const conversation = await redisMemory.getConversation("conv-1");

      expect(conversation).toEqual({
        id: "conv-1",
        resourceId: "agent-1",
        title: "Test Conversation",
        metadata: { key: "value" },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      });
    });

    it("should return null for non-existent conversation", async () => {
      mockRedis.hGetAll.mockResolvedValue({});

      const conversation = await redisMemory.getConversation("non-existent");

      expect(conversation).toBeNull();
    });

    it("should get conversations for a resource", async () => {
      mockRedis.zRange.mockResolvedValue(["conv-1", "conv-2"]);
      mockRedis.hGetAll
        .mockResolvedValueOnce({
          id: "conv-1",
          resourceId: "agent-1",
          title: "Conversation 1",
          metadata: "{}",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          id: "conv-2",
          resourceId: "agent-1",
          title: "Conversation 2",
          metadata: "{}",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        });

      const conversations = await redisMemory.getConversations("agent-1");

      expect(conversations).toHaveLength(2);
      expect(conversations[0].id).toBe("conv-1");
      expect(conversations[1].id).toBe("conv-2");
    });

    it("should update a conversation", async () => {
      // Mock existing conversation
      mockRedis.hGetAll.mockResolvedValue({
        id: "conv-1",
        resourceId: "agent-1",
        title: "Old Title",
        metadata: "{}",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      });

      const updated = await redisMemory.updateConversation("conv-1", {
        title: "New Title",
      });

      expect(updated.title).toBe("New Title");
      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it("should delete a conversation", async () => {
      // Mock existing conversation
      mockRedis.hGetAll.mockResolvedValue({
        id: "conv-1",
        resourceId: "agent-1",
        title: "Test",
        metadata: "{}",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      });
      mockRedis.keys.mockResolvedValue([]);

      await redisMemory.deleteConversation("conv-1");

      expect(mockRedis.multi).toHaveBeenCalled();
    });
  });

  describe("History Operations", () => {
    const testHistoryEntry = {
      id: "entry-1",
      agentId: "agent-1",
      input: "test input",
      output: "test output",
    };

    it("should add a history entry", async () => {
      await redisMemory.addHistoryEntry("entry-1", testHistoryEntry, "agent-1");

      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it("should update a history entry", async () => {
      await redisMemory.updateHistoryEntry("entry-1", testHistoryEntry, "agent-1");

      expect(mockRedis.hSet).toHaveBeenCalledWith("test:hist:entry-1", {
        value: JSON.stringify(testHistoryEntry),
        agentId: "agent-1",
        updatedAt: expect.any(String),
      });
    });

    it("should get a history entry", async () => {
      mockRedis.hGetAll.mockResolvedValue({
        value: JSON.stringify(testHistoryEntry),
        agentId: "agent-1",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      });

      const entry = await redisMemory.getHistoryEntry("entry-1");

      expect(entry).toMatchObject({
        ...testHistoryEntry,
        _agentId: "agent-1",
      });
    });

    it("should get all history entries for an agent", async () => {
      mockRedis.sMembers.mockResolvedValue(["entry-1", "entry-2"]);
      mockRedis.hGetAll.mockResolvedValue({
        value: JSON.stringify(testHistoryEntry),
        agentId: "agent-1",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      });

      const entries = await redisMemory.getAllHistoryEntriesByAgent("agent-1");

      expect(entries).toHaveLength(2);
    });

    it("should add a history event", async () => {
      const testEvent = { name: "test-event", data: { key: "value" } };

      await redisMemory.addHistoryEvent("event-1", testEvent, "entry-1", "agent-1");

      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it("should add a history step", async () => {
      const testStep = { name: "test-step", content: "step content" };

      await redisMemory.addHistoryStep("step-1", testStep, "entry-1", "agent-1");

      expect(mockRedis.multi).toHaveBeenCalled();
    });
  });

  describe("Utility Methods", () => {
    it("should return Redis status", () => {
      const status = redisMemory.getStatus();
      expect(status).toBe("ready");
    });

    it("should return Redis instance", () => {
      const redis = redisMemory.getRedisInstance();
      expect(redis).toBeDefined();
    });

    it("should close Redis connection", async () => {
      await redisMemory.close();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const memory = new RedisMemory();
      expect(memory).toBeDefined();
    });

    it("should use connection string", () => {
      const memory = new RedisMemory({
        connection: "redis://localhost:6379",
      });
      expect(memory).toBeDefined();
    });

    it("should use connection options", () => {
      const memory = new RedisMemory({
        connection: {
          url: "redis://localhost:6379",
        },
      });
      expect(memory).toBeDefined();
    });
  });
});
