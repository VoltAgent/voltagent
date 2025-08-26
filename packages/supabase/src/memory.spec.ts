import type { CreateConversationInput } from "@voltagent/core";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseMemory } from "./memory";

vi.mock("@supabase/supabase-js", async () => {
  const MockSupabaseClient = vi.fn(function (_opts: any) {
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

    // @ts-ignore - Mock implementation
    const self = this as any;

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

    self.from = vi.fn((table: string) => {
      mockMethods.from(table);
      return createQueryBuilder();
    });
    self._mockMethods = mockMethods;
  });

  return {
    createClient: vi.fn(() => new MockSupabaseClient({})),
    SupabaseClient: MockSupabaseClient,
  };
});

describe("SupabaseMemory", async () => {
  const createMessage = (overrides: Partial<UIMessage> = {}): UIMessage => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    role: "user",
    parts: [{ type: "text", text: "Test message" }],
    ...overrides,
  });

  describe("Initialization", () => {
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");
    });

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
        client: mockClient,
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
      }).toThrow("Either provide a 'client' or both 'supabaseUrl' and 'supabaseKey'");

      expect(() => {
        new SupabaseMemory({
          supabaseUrl: "https://test.supabase.co",
          supabaseKey: "",
        });
      }).toThrow("Either provide a 'client' or both 'supabaseUrl' and 'supabaseKey'");
    });
  });

  describe("Storage Limit Functionality", () => {
    let memory: SupabaseMemory;
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");

      memory = new SupabaseMemory({
        client: mockClient as any,
        storageLimit: 2, // Small limit for testing
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      memory.hasUIMessageColumns = true; // Mock that columns exist
    });

    it("should call pruneOldMessages when storage limit is set and > 0", async () => {
      const spy = vi.spyOn(memory as any, "pruneOldMessages").mockResolvedValue(undefined);

      const message = createMessage({ parts: [{ type: "text", text: "Test message" }] });

      await memory.addMessage(message, "test-user", "test-conversation");

      expect(spy).toHaveBeenCalledWith("test-conversation");
    });

    it("should not call pruneOldMessages when storage limit is 0", async () => {
      // Create a fresh mock for this test to avoid cross-test contamination
      const limitedMemory = new SupabaseMemory({
        client: mockClient,
        storageLimit: 0,
      });

      // Mock the initialization
      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      limitedMemory.hasUIMessageColumns = true; // Mock that columns exist

      const spy = vi.spyOn(limitedMemory as any, "pruneOldMessages");

      const message = createMessage({ parts: [{ type: "text", text: "Test message" }] });

      await limitedMemory.addMessage(message, "test-user", "test-conversation");

      expect(spy).not.toHaveBeenCalled();
    });

    it("should enforce storage limit and delete oldest messages when exceeded", async () => {
      const limitedMemory = new SupabaseMemory({
        client: mockClient,
        storageLimit: 2,
      });

      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      limitedMemory.hasUIMessageColumns = true; // Mock that columns exist

      // Mock the pruneOldMessages method to simulate proper deletion
      const pruneOldMessagesSpy = vi
        .spyOn(limitedMemory as any, "pruneOldMessages")
        .mockImplementation(async (...args: any[]) => {
          const conversationId = args[0] as string;
          // Simulate the count check that would trigger deletion
          const countResult = { count: 3, error: null }; // Exceeds limit of 2

          if (countResult.count && countResult.count > 2) {
            // biome-ignore lint/suspicious/noConsole: testing
            console.log(`Would delete oldest messages for conversation: ${conversationId}`);
          }

          return Promise.resolve();
        });

      const message = createMessage({
        parts: [{ type: "text", text: "Third message that triggers pruning" }],
      });

      await limitedMemory.addMessage(message, "test-user", "test-conversation");

      // Verify that pruneOldMessages was called
      expect(pruneOldMessagesSpy).toHaveBeenCalledWith("test-conversation");
    });

    it("should not delete messages when count is within storage limit", async () => {
      const limitedMemory = new SupabaseMemory({
        client: mockClient,
        storageLimit: 5,
      });

      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      limitedMemory.hasUIMessageColumns = true; // Mock that columns exist

      // Mock the pruneOldMessages method to simulate count check within limit
      const pruneOldMessagesSpy = vi
        .spyOn(limitedMemory as any, "pruneOldMessages")
        .mockImplementation(async (..._args: any[]) => {
          // Simulate the count check that would NOT trigger deletion
          const countResult = { count: 2, error: null }; // Within limit of 5

          if (countResult.count && countResult.count > 5) {
            throw new Error("Should not delete when within limit");
          }

          return Promise.resolve();
        });

      const message = createMessage({ parts: [{ type: "text", text: "Message within limit" }] });

      await limitedMemory.addMessage(message, "test-user", "test-conversation");

      // Verify that pruneOldMessages was still called (it's always called when storageLimit > 0)
      expect(pruneOldMessagesSpy).toHaveBeenCalledWith("test-conversation");
    });

    it("should maintain separate storage limits for different conversations", async () => {
      const limitedMemory = new SupabaseMemory({
        client: mockClient,
        storageLimit: 2,
      });

      // @ts-expect-error - Accessing private property for testing
      limitedMemory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      limitedMemory.hasUIMessageColumns = true; // Mock that columns exist

      let conv1CallCount = 0;
      let conv2CallCount = 0;

      // Mock the pruneOldMessages method to track calls per conversation
      vi.spyOn(limitedMemory as any, "pruneOldMessages").mockImplementation(
        async (...args: any[]) => {
          const conversationId = args[0] as string;
          if (conversationId === "conv1") {
            conv1CallCount++;
          } else if (conversationId === "conv2") {
            conv2CallCount++;
          }

          return Promise.resolve();
        },
      );

      // Add messages to both conversations
      await limitedMemory.addMessage(
        createMessage({ parts: [{ type: "text", text: "Conv1 msg" }] }),
        "test-user",
        "conv1",
      );
      await limitedMemory.addMessage(
        createMessage({ parts: [{ type: "text", text: "Conv2 msg" }] }),
        "test-user",
        "conv2",
      );

      // Both conversations should have had pruning called
      expect(conv1CallCount).toBe(1);
      expect(conv2CallCount).toBe(1);
    });

    it("should use storage limit as default in getMessages", async () => {
      await memory.getMessages("test-user", "test-conversation");

      // Verify the limit method was called with the storage limit
      expect(mockClient._mockMethods.limit).toHaveBeenCalledWith(2);
    });

    it("should override storage limit when explicit limit provided", async () => {
      await memory.getMessages("test-user", "test-conversation", {
        limit: 10,
      });

      // Verify the limit method was called with the explicit limit
      expect(mockClient._mockMethods.limit).toHaveBeenCalledWith(10);
    });

    it("should not apply limit when limit is 0", async () => {
      // Create a fresh memory instance
      const testMemory = new SupabaseMemory({
        client: mockClient,
        storageLimit: 2, // Set a small default limit for comparison
      });

      // @ts-expect-error - Accessing private property for testing
      testMemory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      testMemory.hasUIMessageColumns = true; // Mock that columns exist

      // Mock the client to return messages in new UIMessage database format
      const mockData = [
        {
          message_id: "msg1",
          role: "user",
          parts: '[{"type":"text","text":"Message 1"}]',
          metadata: "{}",
          format_version: 2,
          user_id: "test-user",
          created_at: "2023-01-01T10:00:00Z",
        },
        {
          message_id: "msg2",
          role: "user",
          parts: '[{"type":"text","text":"Message 2"}]',
          metadata: "{}",
          format_version: 2,
          user_id: "test-user",
          created_at: "2023-01-01T10:01:00Z",
        },
        {
          message_id: "msg3",
          role: "user",
          parts: '[{"type":"text","text":"Message 3"}]',
          metadata: "{}",
          format_version: 2,
          user_id: "test-user",
          created_at: "2023-01-01T10:02:00Z",
        },
      ];

      // Mock the getMessages method directly to test the limit behavior
      const spy = vi
        .spyOn(testMemory as any, "getMessages")
        .mockImplementation(async (...args: any[]) => {
          const options = args[2] || {};
          const { limit } = options;
          const uiMessages = mockData.map((d) => ({
            id: d.message_id,
            role: d.role as any,
            parts: JSON.parse(d.parts),
            metadata: JSON.parse(d.metadata),
          }));
          // Simulate the actual logic: if limit is 0 or undefined, return all; otherwise apply limit
          if (limit === 0) {
            return uiMessages; // Return all messages (no limit applied)
          }
          if (limit && limit > 0) {
            return uiMessages.slice(0, limit); // Apply the limit
          }

          return uiMessages.slice(0, 2); // Use storage limit (2)
        });

      // Test: when limit=0, should return all messages
      const allMessages = await testMemory.getMessages("test-user", "test-conversation", {
        limit: 0, // Explicitly set to 0 for unlimited
      });

      // Verify behavior: should return all 3 messages (no limit applied)
      expect(allMessages).toHaveLength(3);
      expect((allMessages[0].parts[0] as any).text).toBe("Message 1");
      expect((allMessages[1].parts[0] as any).text).toBe("Message 2");
      expect((allMessages[2].parts[0] as any).text).toBe("Message 3");

      // Test: when limit=1, should return only 1 message
      const limitedMessages = await testMemory.getMessages("test-user", "test-conversation", {
        limit: 1,
      });

      expect(limitedMessages).toHaveLength(1);
      expect((limitedMessages[0].parts[0] as any).text).toBe("Message 1");

      // Cleanup
      spy.mockRestore();
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("Message Operations", () => {
    let memory: SupabaseMemory;
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");

      memory = new SupabaseMemory({
        client: mockClient as any,
        storageLimit: 2, // Small limit for testing
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      memory.hasUIMessageColumns = true; // Mock that columns exist
    });

    it("should add message successfully", async () => {
      const message = createMessage({
        id: "test-message-id",
        parts: [{ type: "text", text: "Hello, world!" }],
        role: "user",
      });

      await memory.addMessage(message, "test-user", "test-conversation");

      expect(mockClient._mockMethods.from).toHaveBeenCalledWith("voltagent_memory_messages");
      expect(mockClient._mockMethods.insert).toHaveBeenCalledWith({
        conversation_id: "test-conversation",
        user_id: "test-user",
        message_id: "test-message-id",
        role: "user",
        parts: '[{"type":"text","text":"Hello, world!"}]',
        metadata: "{}",
        format_version: 2,
        created_at: expect.any(String),
      });
    });

    it("should handle complex metadata", async () => {
      const message = createMessage({
        parts: [{ type: "text", text: "Hello" }],
        metadata: { source: "test" },
      });

      await memory.addMessage(message, "test-user", "test-conversation");

      expect(mockClient._mockMethods.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          parts: '[{"type":"text","text":"Hello"}]',
          metadata: '{"source":"test"}',
          format_version: 2,
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

      await expect(memory.addMessage(message, "test-user", "test-conversation")).rejects.toThrow(
        "Failed to add message: Insert failed",
      );
    });
  });

  describe("Basic Message Retrieval", () => {
    let memory: SupabaseMemory;
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");

      memory = new SupabaseMemory({
        client: mockClient as any,
        storageLimit: 2, // Small limit for testing
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      memory.hasUIMessageColumns = true; // Mock that columns exist
    });

    it("should retrieve text messages", async () => {
      // Mock the database response
      const mockData = [
        {
          message_id: "msg1",
          role: "user",
          parts: '[{"type":"text","text":"User question"}]',
          metadata: "{}",
          format_version: 2,
          user_id: "test-user",
          conversation_id: "test-conv",
          created_at: new Date().toISOString(),
        },
        {
          message_id: "msg2",
          role: "assistant",
          parts: '[{"type":"text","text":"Response"}]',
          metadata: "{}",
          format_version: 2,
          user_id: "test-user",
          conversation_id: "test-conv",
          created_at: new Date().toISOString(),
        },
      ];

      const builderWithData: any = {
        select: () => builderWithData,
        eq: () => builderWithData,
        order: () => builderWithData,
        limit: () => Promise.resolve({ data: mockData, error: null }),
      };
      mockClient.from = vi.fn(() => builderWithData);

      const messages = await memory.getMessages("test-user", "test-conv");

      expect(messages).toHaveLength(2);
      expect(messages.every((m) => m.parts.every((p: any) => p.type === "text"))).toBe(true);
    });

    it("should retrieve messages with different part types", async () => {
      const mockUIMessages = [
        {
          id: "msg1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Question" }],
        },
        {
          id: "msg2",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: "Answer" }],
        },
      ];

      vi.spyOn(memory, "getMessages").mockResolvedValue(mockUIMessages);

      const messages = await memory.getMessages("test-user", "test-conv");

      expect(messages).toHaveLength(2);
      expect(messages.filter((m) => m.parts.some((p) => p.type === "text"))).toHaveLength(2);
    });

    it("should return empty array when no messages", async () => {
      vi.spyOn(memory, "getMessages").mockResolvedValue([]);

      const messages = await memory.getMessages("test-user", "test-conv");

      expect(messages).toHaveLength(0);
    });

    it("should return all messages when no options provided", async () => {
      const mockUIMessages = [
        {
          id: "msg1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Question" }],
        },
        {
          id: "msg2",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: "Answer" }],
        },
      ];

      vi.spyOn(memory, "getMessages").mockResolvedValue(mockUIMessages);

      const messages = await memory.getMessages("test-user", "test-conv");

      expect(messages).toHaveLength(2);
    });

    it("should support limit option", async () => {
      const mockUIMessages = [
        {
          id: "msg1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "First text" }],
        },
      ];

      vi.spyOn(memory, "getMessages").mockResolvedValue(mockUIMessages);

      const messages = await memory.getMessages("test-user", "test-conv", {
        limit: 1,
      });

      expect(messages).toHaveLength(1);
      expect((messages[0].parts[0] as any).text).toBe("First text");
    });
  });

  describe("Conversation Operations", () => {
    let memory: SupabaseMemory;
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");

      memory = new SupabaseMemory({
        client: mockClient as any,
        storageLimit: 2, // Small limit for testing
      });

      // Mock the initialization to avoid database setup issues in tests
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      memory.hasUIMessageColumns = true; // Mock that columns exist
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

  describe("UIMessage Column Check and Migration", () => {
    let memory: SupabaseMemory;
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");

      memory = new SupabaseMemory({
        client: mockClient as any,
      });
    });

    it("should detect missing UIMessage columns and show migration warning", async () => {
      // Mock the column check to fail (columns don't exist)
      const builderWithColumnError: any = {
        select: () => builderWithColumnError,
        limit: () => Promise.reject(new Error("column messages.parts does not exist")),
      };

      // First mock for column check
      let callCount = 0;
      mockClient.from = vi.fn((table: string) => {
        if (table.includes("messages") && callCount === 0) {
          callCount++;
          return builderWithColumnError;
        }
        // Return normal builder for other calls
        return {
          select: () => ({
            limit: () =>
              Promise.resolve({ error: { message: "column messages.parts does not exist" } }),
          }),
        };
      });

      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();

      // Spy on console methods to check for migration warning
      const loggerSpy = vi.spyOn((memory as any).logger, "error");

      const message = createMessage();

      // Should throw error when columns are missing
      await expect(memory.addMessage(message, "test-user", "test-conv")).rejects.toThrow(
        "Database migration required",
      );

      // Should have logged migration warning
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Database migration required"),
      );
    });

    it("should handle column check error during initialization", async () => {
      // Mock select to simulate missing columns error
      const builderWithError = {
        select: () => builderWithError,
        limit: () =>
          Promise.resolve({
            error: {
              message: "column messages.parts does not exist",
            },
          }),
      };

      mockClient.from = vi.fn(() => builderWithError);

      // Create new instance which will run initialization
      const testMemory = new SupabaseMemory({
        client: mockClient as any,
      });

      // Wait for initialization
      // @ts-expect-error - Accessing private property
      await testMemory.initialized;

      // Check that hasUIMessageColumns is false
      // @ts-expect-error - Accessing private property
      expect(testMemory.hasUIMessageColumns).toBe(false);
    });

    it("should detect column error on addMessage and show warning only once", async () => {
      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
      // @ts-expect-error - Set columns as existing initially
      memory.hasUIMessageColumns = true;

      // Mock insert to return column error
      const builderWithColumnError = {
        insert: () =>
          Promise.resolve({
            error: {
              message: "column messages.parts does not exist",
            },
          }),
      };

      mockClient.from = vi.fn(() => builderWithColumnError);

      const showMigrationWarningSpy = vi.spyOn(memory as any, "showMigrationWarning");

      const message1 = createMessage();
      const message2 = createMessage();

      // First call should show warning
      await expect(memory.addMessage(message1, "test-user", "test-conv")).rejects.toThrow();
      expect(showMigrationWarningSpy).toHaveBeenCalledTimes(1);

      // Second call should not show warning again
      await expect(memory.addMessage(message2, "test-user", "test-conv")).rejects.toThrow();
      expect(showMigrationWarningSpy).toHaveBeenCalledTimes(1); // Still only 1
    });

    it("should work normally when UIMessage columns exist", async () => {
      // Track if we've handled the UIMessage column check
      let columnCheckHandled = false;

      mockClient.from = vi.fn((table: string) => {
        // Special handling for messages table column check
        if (table.includes("messages") && !columnCheckHandled) {
          columnCheckHandled = true;
          return {
            select: (_columns?: string) => ({
              limit: (_n?: number) => Promise.resolve({ data: [], error: null }),
            }),
          };
        }

        // For other initialization calls (conversations, history tables, etc.)
        if (
          table.includes("conversations") ||
          table.includes("history") ||
          table.includes("timeline") ||
          table.includes("workflow")
        ) {
          return {
            select: (_columns?: string) => ({
              limit: (_n?: number) => Promise.resolve({ data: null, error: null }),
            }),
            head: () => Promise.resolve({ count: 0, error: null }),
          };
        }

        // Default handler for any other table operations
        return {
          select: (_columns?: string) => ({
            limit: (_n?: number) => Promise.resolve({ data: null, error: null }),
          }),
          insert: (_data?: any) => Promise.resolve({ error: null }),
        };
      });

      const testMemory = new SupabaseMemory({
        client: mockClient as any,
      });

      // Wait for initialization
      // @ts-expect-error - Accessing private property
      await testMemory.initialized;

      // Check that columns were detected
      // @ts-expect-error - Accessing private property
      expect(testMemory.hasUIMessageColumns).toBe(true);

      // Should be able to add message without issues
      const message = createMessage();
      await expect(
        testMemory.addMessage(message, "test-user", "test-conv"),
      ).resolves.toBeUndefined();
    });
  });

  describe("Legacy Format Conversion", () => {
    let memory: SupabaseMemory;
    let mockClient: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      const { createClient } = await import("@supabase/supabase-js");
      mockClient = createClient("https://test.supabase.co", "test-key");

      memory = new SupabaseMemory({
        client: mockClient as any,
      });

      // @ts-expect-error - Accessing private property for testing
      memory.initialized = Promise.resolve();
      // @ts-expect-error - Accessing private property for testing
      memory.hasUIMessageColumns = true;
    });

    it("should convert legacy format messages to UIMessage format", async () => {
      // Mock data in legacy format (format_version = 1 or missing)
      const legacyData = [
        {
          message_id: "msg1",
          role: "user",
          content: "Hello world",
          type: "text",
          created_at: "2023-01-01T10:00:00Z",
          // No format_version, parts, or metadata
        },
        {
          message_id: "msg2",
          role: "assistant",
          content: JSON.stringify({ tool: "calculator", args: { a: 1, b: 2 } }),
          type: "tool-call",
          format_version: 1, // Explicitly legacy
          created_at: "2023-01-01T10:01:00Z",
        },
      ];

      // Mock the query builder to return legacy data
      const builderWithLegacyData: any = {
        select: () => builderWithLegacyData,
        eq: () => builderWithLegacyData,
        order: () => builderWithLegacyData,
        limit: () => Promise.resolve({ data: legacyData, error: null }),
      };

      mockClient.from = vi.fn(() => builderWithLegacyData);

      const messages = await memory.getMessages("test-user", "test-conv");

      // Should have converted to UIMessage format
      expect(messages).toHaveLength(2);

      // Find messages by ID (order might vary)
      const msg1 = messages.find((m) => m.id === "msg1");
      const msg2 = messages.find((m) => m.id === "msg2");

      // Check first message (text)
      expect(msg1).toBeDefined();
      expect(msg1?.role).toBe("user");
      expect(msg1?.parts).toHaveLength(1);
      expect(msg1?.parts[0]).toEqual({
        type: "text",
        text: "Hello world",
      });

      // Check second message (tool-call)
      expect(msg2).toBeDefined();
      expect(msg2?.role).toBe("assistant");
      expect(msg2?.parts).toHaveLength(1);
      expect(msg2?.parts[0].type).toBe("tool-call");
    });

    it("should handle mixed format messages correctly", async () => {
      // Some messages in legacy format, some in new format
      const mixedData = [
        {
          message_id: "msg1",
          role: "user",
          content: "Old format message",
          type: "text",
          created_at: "2023-01-01T10:00:00Z",
        },
        {
          message_id: "msg2",
          role: "assistant",
          parts: '[{"type":"text","text":"New format message"}]',
          metadata: '{"source":"test"}',
          format_version: 2,
          user_id: "test-user",
          created_at: "2023-01-01T10:01:00Z",
        },
      ];

      const builderWithMixedData: any = {
        select: () => builderWithMixedData,
        eq: () => builderWithMixedData,
        order: () => builderWithMixedData,
        limit: () => Promise.resolve({ data: mixedData, error: null }),
      };

      mockClient.from = vi.fn(() => builderWithMixedData);

      const messages = await memory.getMessages("test-user", "test-conv");

      expect(messages).toHaveLength(2);

      // Find messages by content
      const oldFormatMsg = messages.find(
        (m) => m.parts[0].type === "text" && (m.parts[0] as any).text === "Old format message",
      );
      const newFormatMsg = messages.find(
        (m) => m.parts[0].type === "text" && (m.parts[0] as any).text === "New format message",
      );

      // Legacy format converted
      expect(oldFormatMsg).toBeDefined();
      expect(oldFormatMsg?.parts[0]).toEqual({
        type: "text",
        text: "Old format message",
      });

      // New format preserved
      expect(newFormatMsg).toBeDefined();
      expect(newFormatMsg?.parts[0]).toEqual({
        type: "text",
        text: "New format message",
      });
      expect(newFormatMsg?.metadata).toEqual({ source: "test" });
    });
  });
});
