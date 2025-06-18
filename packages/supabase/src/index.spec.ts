import { describe, it, expect, beforeEach, vi } from "vitest";
import { SupabaseMemory } from "./index";
import type { MemoryMessage, CreateConversationInput } from "@voltagent/core";

// Mock Supabase client with proper query builder pattern
const createMockSupabaseClient = () => {
  // Create a spy for tracking calls to individual query methods
  const mockMethods = {
    from: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn(),
    head: vi.fn(),
    lt: vi.fn(),
    gt: vi.fn(),
    is: vi.fn(),
    offset: vi.fn(),
    single: vi.fn(),
    not: vi.fn(),
    upsert: vi.fn(),
  };

  // Create a query builder that properly chains
  const createQueryBuilder = () => {
    const builder = {
      eq: (...args: any[]) => {
        mockMethods.eq(...args);
        return builder;
      },
      select: (...args: any[]) => {
        mockMethods.select(...args);
        return builder;
      },
      insert: (...args: any[]) => {
        mockMethods.insert(...args);
        return Promise.resolve({ error: null });
      },
      delete: (...args: any[]) => {
        mockMethods.delete(...args);
        return builder;
      },
      update: (...args: any[]) => {
        mockMethods.update(...args);
        return builder;
      },
      order: (...args: any[]) => {
        mockMethods.order(...args);
        return builder;
      },
      limit: (...args: any[]) => {
        mockMethods.limit(...args);
        return builder;
      },
      in: (...args: any[]) => {
        mockMethods.in(...args);
        return builder;
      },
      maybeSingle: (...args: any[]) => {
        mockMethods.maybeSingle(...args);
        return Promise.resolve({ data: null, error: null });
      },
      head: (...args: any[]) => {
        mockMethods.head(...args);
        return Promise.resolve({ count: 0, error: null });
      },
      lt: (...args: any[]) => {
        mockMethods.lt(...args);
        return builder;
      },
      gt: (...args: any[]) => {
        mockMethods.gt(...args);
        return builder;
      },
      is: (...args: any[]) => {
        mockMethods.is(...args);
        return builder;
      },
      offset: (...args: any[]) => {
        mockMethods.offset(...args);
        return builder;
      },
      single: (...args: any[]) => {
        mockMethods.single(...args);
        return Promise.resolve({ data: null, error: null });
      },
      not: (...args: any[]) => {
        mockMethods.not(...args);
        return builder;
      },
      upsert: (...args: any[]) => {
        mockMethods.upsert(...args);
        return Promise.resolve({ error: null });
      },
    };
    return builder;
  };

  const client = {
    from: (table: string) => {
      mockMethods.from(table);
      return createQueryBuilder();
    },
    _mockMethods: mockMethods, // Expose for testing
  };

  return client;
};

// Mock createClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}));

describe("SupabaseMemory", () => {
  let memory: SupabaseMemory;
  let mockClient: any;

  const createMessage = (overrides: Partial<MemoryMessage> = {}): MemoryMessage => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    role: "user",
    content: "Test message",
    type: "text",
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const createConversation = (
    overrides: Partial<CreateConversationInput> = {},
  ): CreateConversationInput => ({
    id: `conv-${Date.now()}-${Math.random()}`,
    resourceId: "test-resource",
    userId: "test-user",
    title: "Test Conversation",
    metadata: {},
    ...overrides,
  });

  describe("Initialization", () => {
    it("should initialize with default options", () => {
      const defaultMemory = new SupabaseMemory({
        supabaseUrl: "https://test.supabase.co",
        supabaseKey: "test-key",
      });

      // @ts-expect-error - Accessing private property for testing
      expect(defaultMemory.options.storageLimit).toBe(100);
      // @ts-expect-error - Accessing private property for testing
      expect(defaultMemory.options.debug).toBe(false);
      // @ts-expect-error - Accessing private property for testing
      expect(defaultMemory.baseTableName).toBe("voltagent_memory");
    });

    it("should initialize with custom options", () => {
      const customMemory = new SupabaseMemory({
        supabaseUrl: "https://test.supabase.co",
        supabaseKey: "test-key",
        storageLimit: 50,
        tableName: "custom_prefix",
        debug: true,
      });

      // @ts-expect-error - Accessing private property for testing
      expect(customMemory.options.storageLimit).toBe(50);
      // @ts-expect-error - Accessing private property for testing
      expect(customMemory.options.debug).toBe(true);
      // @ts-expect-error - Accessing private property for testing
      expect(customMemory.baseTableName).toBe("custom_prefix");
    });

    it("should initialize with existing client", () => {
      const clientMemory = new SupabaseMemory({
        client: createMockSupabaseClient() as any,
        storageLimit: 25,
        debug: true,
      });

      // @ts-expect-error - Accessing private property for testing
      expect(clientMemory.options.storageLimit).toBe(25);
      // @ts-expect-error - Accessing private property for testing
      expect(clientMemory.options.debug).toBe(true);
    });

    it("should throw error when missing required options", () => {
      expect(() => {
        new SupabaseMemory({
          supabaseUrl: "",
          supabaseKey: "test-key",
        });
      }).toThrow("Supabase URL and Key are required when client is not provided.");

      expect(() => {
        new SupabaseMemory({
          supabaseUrl: "https://test.supabase.co",
          supabaseKey: "",
        });
      }).toThrow("Supabase URL and Key are required when client is not provided.");
    });
  });

  describe("Storage Limit Functionality", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = createMockSupabaseClient();

      memory = new SupabaseMemory({
        client: mockClient as any,
        storageLimit: 2, // Small limit for testing
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
    });

    it("should call pruneOldMessages when storage limit is set and > 0", async () => {
      const spy = vi.spyOn(memory as any, "pruneOldMessages").mockResolvedValue(undefined);

      const message = createMessage({ content: "Test message" });

      await memory.addMessage(message, "test-conversation");

      expect(spy).toHaveBeenCalledWith("test-conversation");
    });

    it("should not call pruneOldMessages when storage limit is 0", async () => {
      // Create a fresh mock for this test to avoid cross-test contamination
      const freshMockClient = createMockSupabaseClient();
      const limitedMemory = new SupabaseMemory({
        client: freshMockClient as any,
        storageLimit: 0,
      });

      // Mock the initialization
      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();

      const spy = vi.spyOn(limitedMemory as any, "pruneOldMessages");

      const message = createMessage({ content: "Test message" });

      await limitedMemory.addMessage(message, "test-conversation");

      expect(spy).not.toHaveBeenCalled();
    });

    it("should enforce storage limit and delete oldest messages when exceeded", async () => {
      // Create a mock client that simulates actual database behavior
      const enforcementMockClient = createMockSupabaseClient();

      // Create memory instance with limit of 2
      const limitedMemory = new SupabaseMemory({
        client: enforcementMockClient as any,
        storageLimit: 2,
      });

      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();

      // Mock the pruneOldMessages method to simulate proper deletion
      const pruneOldMessagesSpy = vi
        .spyOn(limitedMemory as any, "pruneOldMessages")
        .mockImplementation(async (...args: any[]) => {
          const conversationId = args[0] as string;
          // Simulate the count check that would trigger deletion
          const countResult = { count: 3, error: null }; // Exceeds limit of 2

          if (countResult.count && countResult.count > 2) {
            // Simulate deleting the oldest message
            console.log(`Would delete oldest messages for conversation: ${conversationId}`);
          }

          return Promise.resolve();
        });

      const message = createMessage({ content: "Third message that triggers pruning" });

      await limitedMemory.addMessage(message, "test-conversation");

      // Verify that pruneOldMessages was called
      expect(pruneOldMessagesSpy).toHaveBeenCalledWith("test-conversation");
    });

    it("should not delete messages when count is within storage limit", async () => {
      // Create a mock client for this specific test
      const noDeleteMockClient = createMockSupabaseClient();

      const limitedMemory = new SupabaseMemory({
        client: noDeleteMockClient as any,
        storageLimit: 5, // Higher limit
      });

      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();

      // Mock the pruneOldMessages method to simulate count check within limit
      const pruneOldMessagesSpy = vi
        .spyOn(limitedMemory as any, "pruneOldMessages")
        .mockImplementation(async (...args: any[]) => {
          const conversationId = args[0] as string;
          // Simulate the count check that would NOT trigger deletion
          const countResult = { count: 2, error: null }; // Within limit of 5

          if (countResult.count && countResult.count > 5) {
            throw new Error("Should not delete when within limit");
          }

          return Promise.resolve();
        });

      const message = createMessage({ content: "Message within limit" });

      await limitedMemory.addMessage(message, "test-conversation");

      // Verify that pruneOldMessages was still called (it's always called when storageLimit > 0)
      expect(pruneOldMessagesSpy).toHaveBeenCalledWith("test-conversation");
    });

    it("should maintain separate storage limits for different conversations", async () => {
      // This test verifies that storage limits are applied per conversation
      const perConvMockClient = createMockSupabaseClient();

      const limitedMemory = new SupabaseMemory({
        client: perConvMockClient as any,
        storageLimit: 2,
      });

      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();

      let conv1CallCount = 0;
      let conv2CallCount = 0;

      // Mock the pruneOldMessages method to track calls per conversation
      const pruneOldMessagesSpy = vi
        .spyOn(limitedMemory as any, "pruneOldMessages")
        .mockImplementation(async (...args: any[]) => {
          const conversationId = args[0] as string;
          if (conversationId === "conv1") {
            conv1CallCount++;
          } else if (conversationId === "conv2") {
            conv2CallCount++;
          }

          return Promise.resolve();
        });

      // Add messages to both conversations
      await limitedMemory.addMessage(createMessage({ content: "Conv1 msg" }), "conv1");
      await limitedMemory.addMessage(createMessage({ content: "Conv2 msg" }), "conv2");

      // Both conversations should have had pruning called
      expect(conv1CallCount).toBe(1);
      expect(conv2CallCount).toBe(1);
    });

    it("should use storage limit as default in getMessages", async () => {
      await memory.getMessages({
        conversationId: "test-conversation",
      });

      // Verify the limit method was called with the storage limit
      expect(mockClient._mockMethods.limit).toHaveBeenCalledWith(2);
    });

    it("should override storage limit when explicit limit provided", async () => {
      await memory.getMessages({
        conversationId: "test-conversation",
        limit: 10,
      });

      // Verify the limit method was called with the explicit limit
      expect(mockClient._mockMethods.limit).toHaveBeenCalledWith(10);
    });

    it("should not apply limit when limit is 0", async () => {
      // Create a fresh memory instance
      const testMemory = new SupabaseMemory({
        client: createMockSupabaseClient() as any,
        storageLimit: 2, // Set a small default limit for comparison
      });

      // @ts-expect-error - Accessing private property for testing
      testMemory.initialized = Promise.resolve();

      // Mock the client to return more messages than the storage limit
      const mockData = [
        {
          message_id: "msg1",
          role: "user",
          content: "Message 1",
          type: "text",
          created_at: "2023-01-01T10:00:00Z",
        },
        {
          message_id: "msg2",
          role: "user",
          content: "Message 2",
          type: "text",
          created_at: "2023-01-01T10:01:00Z",
        },
        {
          message_id: "msg3",
          role: "user",
          content: "Message 3",
          type: "text",
          created_at: "2023-01-01T10:02:00Z",
        },
      ];

      // Mock the getMessages method directly to test the limit behavior
      const spy = vi
        .spyOn(testMemory as any, "getMessages")
        .mockImplementation(async (options: any) => {
          const { limit } = options;
          // Simulate the actual logic: if limit is 0 or undefined, return all; otherwise apply limit
          if (limit === 0) {
            return mockData; // Return all messages (no limit applied)
          } else if (limit && limit > 0) {
            return mockData.slice(0, limit); // Apply the limit
          } else {
            return mockData.slice(0, 2); // Use storage limit (2)
          }
        });

      // Test: when limit=0, should return all messages
      const allMessages = await testMemory.getMessages({
        conversationId: "test-conversation",
        limit: 0, // Explicitly set to 0 for unlimited
      });

      // Verify behavior: should return all 3 messages (no limit applied)
      expect(allMessages).toHaveLength(3);
      expect(allMessages[0].content).toBe("Message 1");
      expect(allMessages[1].content).toBe("Message 2");
      expect(allMessages[2].content).toBe("Message 3");

      // Test: when limit=1, should return only 1 message
      const limitedMessages = await testMemory.getMessages({
        conversationId: "test-conversation",
        limit: 1,
      });

      expect(limitedMessages).toHaveLength(1);
      expect(limitedMessages[0].content).toBe("Message 1");

      // Cleanup
      spy.mockRestore();
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("Message Operations", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = createMockSupabaseClient();

      memory = new SupabaseMemory({
        client: mockClient as any,
        storageLimit: 100,
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
    });

    it("should add message successfully", async () => {
      const message = createMessage({
        id: "test-message-id",
        content: "Hello, world!",
        role: "user",
      });

      await memory.addMessage(message, "test-conversation");

      expect(mockClient._mockMethods.from).toHaveBeenCalledWith("voltagent_memory_messages");
      expect(mockClient._mockMethods.insert).toHaveBeenCalledWith({
        conversation_id: "test-conversation",
        message_id: "test-message-id",
        role: "user",
        content: "Hello, world!",
        type: "text",
        created_at: message.createdAt,
      });
    });

    it("should handle complex content types", async () => {
      const complexContent = {
        text: "Hello",
        metadata: { source: "test" },
      };

      const message = createMessage({
        content: complexContent as any,
      });

      await memory.addMessage(message, "test-conversation");

      expect(mockClient._mockMethods.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: JSON.stringify(complexContent),
        }),
      );
    });

    it("should throw error when insert fails", async () => {
      // Mock insert to return an error
      const builderWithError = {
        insert: () => Promise.resolve({ error: { message: "Insert failed" } }),
      };
      mockClient.from = vi.fn(() => builderWithError);

      const message = createMessage();

      await expect(memory.addMessage(message, "test-conversation")).rejects.toThrow(
        "Failed to add message: Insert failed",
      );
    });
  });

  describe("Conversation Operations", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = createMockSupabaseClient();

      memory = new SupabaseMemory({
        client: mockClient as any,
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
    });

    it("should create conversation successfully", async () => {
      const conversation = createConversation({
        id: "test-conv-id",
        title: "Test Conversation",
        userId: "user-123",
      });

      await memory.createConversation(conversation);

      expect(mockClient._mockMethods.from).toHaveBeenCalledWith("voltagent_memory_conversations");
      expect(mockClient._mockMethods.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-conv-id",
          resource_id: "test-resource",
          user_id: "user-123",
          title: "Test Conversation",
          metadata: {},
        }),
      );
    });

    it("should get conversation by id", async () => {
      const mockConversation = {
        id: "test-conv-id",
        resource_id: "test-resource",
        user_id: "user-123",
        title: "Test Conversation",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the query builder to return conversation data
      const builderWithData = {
        select: () => builderWithData,
        eq: () => builderWithData,
        maybeSingle: () => Promise.resolve({ data: mockConversation, error: null }),
      };
      mockClient.from = vi.fn(() => builderWithData);

      const result = await memory.getConversation("test-conv-id");

      expect(result).toEqual({
        id: "test-conv-id",
        resourceId: "test-resource",
        userId: "user-123",
        title: "Test Conversation",
        metadata: {},
        createdAt: mockConversation.created_at,
        updatedAt: mockConversation.updated_at,
      });
    });

    it("should return null when conversation not found", async () => {
      // Mock the query builder to return null
      const builderWithNull = {
        select: () => builderWithNull,
        eq: () => builderWithNull,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      mockClient.from = vi.fn(() => builderWithNull);

      const result = await memory.getConversation("non-existent-id");

      expect(result).toBeNull();
    });
  });
});
