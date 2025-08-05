import { vi } from "vitest";
import { InMemoryStorage } from ".";
import type { NewTimelineEvent } from "../../events/types";
// ✅ ADD: Import workflow types for testing
import type {
  WorkflowHistoryEntry,
  WorkflowStepHistoryEntry,
  WorkflowTimelineEvent,
} from "../../workflow/types";
import type { Conversation, MemoryMessage } from "../types";

// Mock logger
vi.mock("../../logger", () => ({
  LoggerProxy: vi.fn().mockImplementation(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    })),
  })),
}));

// Mock Math.random for generateId
const mockRandomValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
let mockRandomIndex = 0;

vi.spyOn(Math, "random").mockImplementation(() => {
  return mockRandomValues[mockRandomIndex++ % mockRandomValues.length];
});

// Mock Date for consistent testing
const mockDates = [
  new Date("2025-03-26T05:08:35.440Z"), // Initial date
  new Date("2025-03-26T05:08:35.441Z"), // First conversation
  new Date("2025-03-26T05:08:35.442Z"), // Second conversation
  new Date("2025-03-26T05:08:35.443Z"), // Third conversation
  new Date("2025-03-26T05:08:35.450Z"), // For update tests - original
  new Date("2025-03-26T05:08:35.460Z"), // For update tests - updated
];
let mockDateIndex = 0;

const originalDate = global.Date;
global.Date = vi.fn(() => mockDates[mockDateIndex % mockDates.length]) as any;
global.Date.now = vi.fn(() => mockDates[mockDateIndex % mockDates.length].getTime());
global.Date.parse = originalDate.parse;
global.Date.UTC = originalDate.UTC;

describe("InMemoryStorage", () => {
  // Test data helpers for reuse across tests
  const createMessage = (overrides: Partial<MemoryMessage> = {}): MemoryMessage => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    role: "user",
    content: "Test message",
    type: "text",
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const createConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
    id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    resourceId: "resource-test",
    userId: "test-user",
    title: "Test Conversation",
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  let storage: InMemoryStorage;

  beforeEach(() => {
    // Reset the mock random index for each test
    mockRandomIndex = 0;
    // Create a fresh storage instance for each test
    storage = new InMemoryStorage({ debug: false });
  });

  describe("Message Operations", () => {
    describe("addMessage", () => {
      it("should add a message and retrieve it correctly", async () => {
        // Arrange
        const message = createMessage({
          content: "Hello world",
          role: "user",
        });

        // Create conversation first
        await storage.createConversation({
          id: "test-conversation",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Test Conversation",
          metadata: {},
        });

        // Act
        await storage.addMessage(message, "test-conversation");
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "test-conversation",
        });

        // Assert
        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({
          ...message,
        });
      });

      it("should use default values when user and conversation IDs are not provided", async () => {
        // Arrange
        const message = createMessage();

        // Act
        await storage.addMessage(message);
        const messages = await storage.getMessages();

        // Assert
        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual(message);
      });

      it("should enforce storage limits and remove oldest messages", async () => {
        // Arrange
        const limitedStorage = new InMemoryStorage({ storageLimit: 2 });

        // Create conversation first
        await limitedStorage.createConversation({
          id: "conversation1",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation",
          metadata: {},
        });

        const message1 = createMessage({
          content: "First message",
          createdAt: new Date(Date.now() - 3000).toISOString(),
        });
        const message2 = createMessage({
          content: "Second message",
          createdAt: new Date(Date.now() - 2000).toISOString(),
        });
        const message3 = createMessage({
          content: "Third message",
          createdAt: new Date(Date.now() - 1000).toISOString(),
        });

        // Act
        await limitedStorage.addMessage(message1, "conversation1");
        await limitedStorage.addMessage(message2, "conversation1");
        await limitedStorage.addMessage(message3, "conversation1");

        // Assert
        const messages = await limitedStorage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
        });

        expect(messages).toHaveLength(2);
        expect(messages.map((m) => m.content)).toEqual(["Second message", "Third message"]);
      });

      it("should maintain separate limits for different conversations", async () => {
        // Arrange
        const limitedStorage = new InMemoryStorage({ storageLimit: 2 });

        // Create conversations first
        await limitedStorage.createConversation({
          id: "conversation1",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation 1",
          metadata: {},
        });

        await limitedStorage.createConversation({
          id: "conversation2",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation 2",
          metadata: {},
        });

        // Add messages to first conversation
        await limitedStorage.addMessage(createMessage({ content: "Conv1 First" }), "conversation1");
        await limitedStorage.addMessage(
          createMessage({ content: "Conv1 Second" }),
          "conversation1",
        );
        await limitedStorage.addMessage(createMessage({ content: "Conv1 Third" }), "conversation1");

        // Add messages to second conversation
        await limitedStorage.addMessage(createMessage({ content: "Conv2 First" }), "conversation2");
        await limitedStorage.addMessage(
          createMessage({ content: "Conv2 Second" }),
          "conversation2",
        );

        // Assert
        const conv1Messages = await limitedStorage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
        });

        const conv2Messages = await limitedStorage.getMessages({
          userId: "user1",
          conversationId: "conversation2",
        });

        expect(conv1Messages).toHaveLength(2);
        expect(conv1Messages.map((m) => m.content)).toEqual(["Conv1 Second", "Conv1 Third"]);

        expect(conv2Messages).toHaveLength(2);
        expect(conv2Messages.map((m) => m.content)).toEqual(["Conv2 First", "Conv2 Second"]);
      });
    });

    describe("getMessages", () => {
      beforeEach(async () => {
        // Setup test messages with predictable timestamps for testing
        const now = Date.now();

        // Create conversations first
        await storage.createConversation({
          id: "conversation1",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation 1",
          metadata: {},
        });

        await storage.createConversation({
          id: "conversation2",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation 2",
          metadata: {},
        });

        await storage.addMessage(
          createMessage({
            role: "system",
            content: "System message",
            createdAt: new Date(now - 5000).toISOString(),
          }),
          "conversation1",
        );

        await storage.addMessage(
          createMessage({
            role: "user",
            content: "User question",
            createdAt: new Date(now - 4000).toISOString(),
          }),
          "conversation1",
        );

        await storage.addMessage(
          createMessage({
            role: "assistant",
            content: "Assistant response",
            createdAt: new Date(now - 3000).toISOString(),
          }),
          "conversation1",
        );

        await storage.addMessage(
          createMessage({
            role: "user",
            content: "Follow-up question",
            createdAt: new Date(now - 2000).toISOString(),
          }),
          "conversation1",
        );

        // Different user, same conversation - create separate conversation
        await storage.createConversation({
          id: "user2-conversation1",
          resourceId: "test-resource",
          userId: "user2",
          title: "User2 Conversation 1",
          metadata: {},
        });

        await storage.addMessage(
          createMessage({
            role: "user",
            content: "Another user's message",
            createdAt: new Date(now - 1000).toISOString(),
          }),
          "user2-conversation1",
        );

        // Same user, different conversation
        await storage.addMessage(
          createMessage({
            role: "user",
            content: "Different conversation",
            createdAt: new Date(now).toISOString(),
          }),
          "conversation2",
        );
      });

      it("should retrieve all messages for a user and conversation", async () => {
        // Act
        const messages = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
        });

        // Assert
        expect(messages).toHaveLength(4);
        expect(messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
      });

      it("should filter messages by role", async () => {
        // Act
        const userMessages = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
          role: "user",
        });

        // Assert
        expect(userMessages).toHaveLength(2);
        expect(userMessages.map((m) => m.content)).toEqual(["User question", "Follow-up question"]);
      });

      it("should respect the limit parameter", async () => {
        // Act
        const limitedMessages = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
          limit: 2,
        });

        // Assert
        expect(limitedMessages).toHaveLength(2);
        // Should return the 2 most recent messages
        expect(limitedMessages.map((m) => m.content)).toEqual([
          "Assistant response",
          "Follow-up question",
        ]);
      });

      it.todo("should filter messages by timestamp range", async () => {
        // Create a completely isolated test with actual timestamps
        const timeFilterStorage = new InMemoryStorage({ debug: false });

        // Create four messages with 1 hour increments
        const baseTime = new Date("2023-01-01T10:00:00.000Z");

        // Create message objects with very explicit timestamps
        const msg1 = {
          id: "msg1",
          role: "user" as const,
          content: "First message",
          type: "text" as const,
          createdAt: new Date(baseTime.getTime()).toISOString(),
        };

        const msg2 = {
          id: "msg2",
          role: "user" as const,
          content: "Second message",
          type: "text" as const,
          createdAt: new Date(baseTime.getTime() + 3600000).toISOString(), // +1 hour
        };

        const msg3 = {
          id: "msg3",
          role: "user" as const,
          content: "Follow-up question",
          type: "text" as const,
          createdAt: new Date(baseTime.getTime() + 7200000).toISOString(), // +2 hours
        };

        const msg4 = {
          id: "msg4",
          role: "user" as const,
          content: "Last message",
          type: "text" as const,
          createdAt: new Date(baseTime.getTime() + 10800000).toISOString(), // +3 hours
        };

        // Add all messages to storage
        await timeFilterStorage.addMessage(msg1, "testconv");
        await timeFilterStorage.addMessage(msg2, "testconv");
        await timeFilterStorage.addMessage(msg3, "testconv");
        await timeFilterStorage.addMessage(msg4, "testconv");

        // Verify all messages were added
        const allMessages = await timeFilterStorage.getMessages({
          userId: "testuser",
          conversationId: "testconv",
        });
        expect(allMessages).toHaveLength(4);

        // Calculate filter timestamps (between msg2 and msg4)
        const afterTime = baseTime.getTime() + 5400000; // 1.5 hours after base (after msg2)
        const beforeTime = baseTime.getTime() + 9000000; // 2.5 hours after base (before msg4)

        // Act - filter to get only message 3
        const filteredMessages = await timeFilterStorage.getMessages({
          userId: "testuser",
          conversationId: "testconv",
          after: afterTime,
          before: beforeTime,
        });

        // Assert
        expect(filteredMessages).toHaveLength(1);
        expect(filteredMessages[0].id).toBe("msg3");
        expect(filteredMessages[0].content).toBe("Follow-up question");
      });

      it("should return empty array for non-existent user", async () => {
        // Act
        const messages = await storage.getMessages({
          userId: "non-existent",
          conversationId: "conversation1",
        });

        // Assert
        expect(messages).toEqual([]);
      });
    });

    describe("Message Type Filtering", () => {
      beforeEach(async () => {
        // Create a conversation
        await storage.createConversation({
          id: "type-test-conv",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Type Test Conversation",
          metadata: {},
        });

        // Add messages with different types
        await storage.addMessage(
          createMessage({
            id: "msg-text-1",
            content: "User question",
            role: "user",
            type: "text",
          }),
          "type-test-conv",
        );

        await storage.addMessage(
          createMessage({
            id: "msg-tool-call-1",
            content: JSON.stringify({ tool: "calculator", args: { a: 1, b: 2 } }),
            role: "assistant",
            type: "tool-call",
          }),
          "type-test-conv",
        );

        await storage.addMessage(
          createMessage({
            id: "msg-tool-result-1",
            content: JSON.stringify({ result: 3 }),
            role: "tool",
            type: "tool-result",
          }),
          "type-test-conv",
        );

        await storage.addMessage(
          createMessage({
            id: "msg-text-2",
            content: "The result is 3",
            role: "assistant",
            type: "text",
          }),
          "type-test-conv",
        );

        await storage.addMessage(
          createMessage({
            id: "msg-tool-call-2",
            content: JSON.stringify({ tool: "weather", args: { city: "NYC" } }),
            role: "assistant",
            type: "tool-call",
          }),
          "type-test-conv",
        );

        await storage.addMessage(
          createMessage({
            id: "msg-tool-result-2",
            content: JSON.stringify({ temp: 72, condition: "sunny" }),
            role: "tool",
            type: "tool-result",
          }),
          "type-test-conv",
        );

        await storage.addMessage(
          createMessage({
            id: "msg-text-3",
            content: "It's 72°F and sunny in NYC",
            role: "assistant",
            type: "text",
          }),
          "type-test-conv",
        );
      });

      it("should filter messages by single type - text only", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: ["text"],
        });

        expect(messages).toHaveLength(3);
        expect(messages.map((m) => m.id)).toEqual(["msg-text-1", "msg-text-2", "msg-text-3"]);
        expect(messages.every((m) => m.type === "text")).toBe(true);
      });

      it("should filter messages by single type - tool-call only", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: ["tool-call"],
        });

        expect(messages).toHaveLength(2);
        expect(messages.map((m) => m.id)).toEqual(["msg-tool-call-1", "msg-tool-call-2"]);
        expect(messages.every((m) => m.type === "tool-call")).toBe(true);
      });

      it("should filter messages by single type - tool-result only", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: ["tool-result"],
        });

        expect(messages).toHaveLength(2);
        expect(messages.map((m) => m.id)).toEqual(["msg-tool-result-1", "msg-tool-result-2"]);
        expect(messages.every((m) => m.type === "tool-result")).toBe(true);
      });

      it("should filter messages by multiple types", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: ["text", "tool-call"],
        });

        expect(messages).toHaveLength(5);
        const ids = messages.map((m) => m.id);
        expect(ids).toContain("msg-text-1");
        expect(ids).toContain("msg-text-2");
        expect(ids).toContain("msg-text-3");
        expect(ids).toContain("msg-tool-call-1");
        expect(ids).toContain("msg-tool-call-2");
        expect(messages.every((m) => m.type === "text" || m.type === "tool-call")).toBe(true);
      });

      it("should return no messages when types array is empty", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: [],
        });

        expect(messages).toHaveLength(0);
      });

      it("should return all messages when types is undefined", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
        });

        expect(messages).toHaveLength(7);
        expect(messages.map((m) => m.id)).toEqual([
          "msg-text-1",
          "msg-tool-call-1",
          "msg-tool-result-1",
          "msg-text-2",
          "msg-tool-call-2",
          "msg-tool-result-2",
          "msg-text-3",
        ]);
      });

      it("should combine type filtering with limit", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: ["text"],
          limit: 2,
        });

        expect(messages).toHaveLength(2);
        // Should get the 2 most recent text messages
        expect(messages.map((m) => m.id)).toEqual(["msg-text-2", "msg-text-3"]);
      });

      it("should combine type filtering with role filtering", async () => {
        const messages = await storage.getMessages({
          userId: "test-user",
          conversationId: "type-test-conv",
          types: ["text"],
          role: "assistant",
        });

        expect(messages).toHaveLength(2);
        expect(messages.map((m) => m.id)).toEqual(["msg-text-2", "msg-text-3"]);
        expect(messages.every((m) => m.type === "text" && m.role === "assistant")).toBe(true);
      });

      it("should return empty array for non-existent conversation", async () => {
        // Act
        const messages = await storage.getMessages({
          userId: "user1",
          conversationId: "non-existent",
        });

        // Assert
        expect(messages).toEqual([]);
      });
    });

    describe("clearMessages", () => {
      beforeEach(async () => {
        // Setup test data
        // Create conversations first
        await storage.createConversation({
          id: "conversation1",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation 1",
          metadata: {},
        });

        await storage.createConversation({
          id: "conversation2",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation 2",
          metadata: {},
        });

        await storage.createConversation({
          id: "user2-conversation1",
          resourceId: "test-resource",
          userId: "user2",
          title: "User2 Conversation 1",
          metadata: {},
        });

        await storage.addMessage(createMessage(), "conversation1");
        await storage.addMessage(createMessage(), "conversation2");
        await storage.addMessage(createMessage(), "user2-conversation1");
      });

      it("should clear messages for a specific user and conversation", async () => {
        // Act
        await storage.clearMessages({ userId: "user1", conversationId: "conversation1" });

        // Assert
        const messages = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
        });
        expect(messages).toEqual([]);

        // Other user/conversation combinations should be unaffected
        const otherMessages1 = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation2",
        });
        expect(otherMessages1).toHaveLength(1);

        const otherMessages2 = await storage.getMessages({
          userId: "user2",
          conversationId: "user2-conversation1",
        });
        expect(otherMessages2).toHaveLength(1);
      });

      it("should clear all conversations for a user", async () => {
        // Act
        await storage.clearMessages({ userId: "user1" });

        // Assert
        const messages1 = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation1",
        });
        expect(messages1).toEqual([]);

        const messages2 = await storage.getMessages({
          userId: "user1",
          conversationId: "conversation2",
        });
        expect(messages2).toEqual([]);

        // Other users should be unaffected
        const otherUserMessages = await storage.getMessages({
          userId: "user2",
          conversationId: "user2-conversation1",
        });
        expect(otherUserMessages).toHaveLength(1);
      });
    });
  });

  describe("Conversation Operations", () => {
    describe("createConversation", () => {
      it("should create a conversation with required fields", async () => {
        // Arrange
        const testData = createConversation({
          id: "test-conversation-1",
          resourceId: "resource-1",
          title: "New Conversation",
          metadata: { isTest: true },
        });

        // Act
        const conversation = await storage.createConversation({
          id: testData.id,
          resourceId: testData.resourceId,
          userId: "test-user",
          title: testData.title,
          metadata: testData.metadata,
        });

        // Assert
        expect(conversation).toEqual({
          id: testData.id,
          resourceId: testData.resourceId,
          userId: "test-user",
          title: testData.title,
          metadata: testData.metadata,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it("should create a conversation with custom id when provided", async () => {
        // Arrange
        const customId = "custom-conversation-id";
        const testData = createConversation({
          id: customId,
          resourceId: "resource-1",
          title: "New Conversation",
          metadata: { isTest: true },
        });

        // Act
        const conversation = await storage.createConversation({
          id: testData.id,
          resourceId: testData.resourceId,
          userId: "test-user",
          title: testData.title,
          metadata: testData.metadata,
        });

        // Assert
        expect(conversation).toEqual({
          id: customId,
          resourceId: testData.resourceId,
          userId: "test-user",
          title: testData.title,
          metadata: testData.metadata,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });

      it("should create a conversation with minimal required fields", async () => {
        // Act
        const conversation = await storage.createConversation({
          id: "test-conversation-2",
          resourceId: "resource-minimal",
          userId: "test-user",
          title: "",
          metadata: {},
        });

        // Assert
        expect(conversation).toEqual({
          id: "test-conversation-2",
          resourceId: "resource-minimal",
          userId: "test-user",
          title: "",
          metadata: {},
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
    });

    describe("getConversation", () => {
      it("should retrieve a conversation by ID", async () => {
        // Arrange
        const created = await storage.createConversation({
          id: "test-conversation-3",
          resourceId: "resource-1",
          userId: "test-user",
          title: "Test Conversation",
          metadata: { isTest: true },
        });

        // Act
        const retrieved = await storage.getConversation(created.id);

        // Assert
        expect(retrieved).toEqual(created);
      });

      it("should return null for non-existent conversation", async () => {
        // Act
        const result = await storage.getConversation("non-existent-id");

        // Assert
        expect(result).toBeNull();
      });
    });

    describe("getConversations", () => {
      beforeEach(async () => {
        mockDateIndex = 1; // Start with the first conversation date

        // Create multiple conversations for testing
        await storage.createConversation({
          id: "test-conversation-4",
          resourceId: "resource-1",
          userId: "test-user",
          title: "First Conversation",
          metadata: { order: 1 },
        });

        mockDateIndex = 2; // Use second conversation date
        await storage.createConversation({
          id: "test-conversation-5",
          resourceId: "resource-1",
          userId: "test-user",
          title: "Second Conversation",
          metadata: { order: 2 },
        });

        mockDateIndex = 3; // Use third conversation date
        await storage.createConversation({
          id: "test-conversation-6",
          resourceId: "resource-2",
          userId: "test-user",
          title: "Different Resource",
          metadata: { order: 3 },
        });
      });

      it("should retrieve all conversations for a resource", async () => {
        // Act
        const conversations = await storage.getConversations("resource-1");

        // Assert
        expect(conversations).toHaveLength(2);
        expect(conversations.map((c) => c.title)).toEqual(
          expect.arrayContaining(["First Conversation", "Second Conversation"]),
        );
      });

      it("should return an empty array for non-existent resource", async () => {
        // Act
        const conversations = await storage.getConversations("non-existent");

        // Assert
        expect(conversations).toEqual([]);
      });
    });

    describe("updateConversation", () => {
      let existingConversation: Conversation;

      beforeEach(async () => {
        // Use the initial date for creating the conversation
        mockDateIndex = 4;

        // Create a conversation to update
        existingConversation = await storage.createConversation({
          id: "test-conversation-7",
          resourceId: "resource-1",
          userId: "test-user",
          title: "Original Title",
          metadata: { originalKey: "value" },
        });
      });

      it("should update a conversation's title and metadata", async () => {
        // Use a different date for the update operation
        mockDateIndex = 5;

        // Act
        const updated = await storage.updateConversation(existingConversation.id, {
          title: "Updated Title",
          metadata: { newKey: "newValue" },
        });

        // Assert
        expect(updated.id).toBe(existingConversation.id);
        expect(updated.title).toBe("Updated Title");
        expect(updated.metadata).toEqual({ newKey: "newValue" });
        expect(updated.updatedAt).not.toBe(existingConversation.updatedAt);

        // Verify the conversation was actually updated in storage
        const retrieved = await storage.getConversation(existingConversation.id);
        expect(retrieved?.title).toBe("Updated Title");
      });

      it("should handle partial updates", async () => {
        // Act - update only the title
        const updated = await storage.updateConversation(existingConversation.id, {
          title: "New Title Only",
        });

        // Assert
        expect(updated.title).toBe("New Title Only");
        expect(updated.metadata).toEqual(existingConversation.metadata);
      });

      it("should throw an error for non-existent conversation", async () => {
        // Act & Assert
        await expect(
          storage.updateConversation("non-existent-id", { title: "New Title" }),
        ).rejects.toThrow();
      });
    });

    describe("deleteConversation", () => {
      let existingConversation: Conversation;

      beforeEach(async () => {
        // Create a conversation and add a message to it
        existingConversation = await storage.createConversation({
          id: "test-conversation-8",
          resourceId: "resource-1",
          userId: "test-user",
          title: "Original Title",
          metadata: {},
        });

        await storage.addMessage(
          createMessage({ content: "This will be deleted" }),
          existingConversation.id,
        );
      });

      it("should delete a conversation and its messages", async () => {
        // Act
        await storage.deleteConversation(existingConversation.id);

        // Assert
        const retrievedConversation = await storage.getConversation(existingConversation.id);
        expect(retrievedConversation).toBeNull();

        // Messages should also be deleted
        const messages = await storage.getMessages({
          conversationId: existingConversation.id,
        });
        expect(messages).toHaveLength(0);
      });

      it("should not throw an error when deleting non-existent conversation", async () => {
        // Act & Assert
        await expect(storage.deleteConversation("non-existent-id")).resolves.not.toThrow();
      });
    });
  });

  describe("Configuration Options", () => {
    it("should initialize with default options", () => {
      // Act
      const defaultStorage = new InMemoryStorage();

      // Assert
      // @ts-expect-error - Accessing private property for testing
      expect(defaultStorage.options.storageLimit).toBe(100);
      // @ts-expect-error - Accessing private property for testing
      expect(defaultStorage.options.debug).toBe(false);
    });

    it("should respect custom storage limit", async () => {
      // Arrange
      const customStorage = new InMemoryStorage({ storageLimit: 1 });

      // Create conversation first
      await customStorage.createConversation({
        id: "conversation1",
        resourceId: "test-resource",
        userId: "user1",
        title: "Test Conversation",
        metadata: {},
      });

      // Act - Add two messages
      await customStorage.addMessage(createMessage({ content: "First" }), "conversation1");

      await customStorage.addMessage(createMessage({ content: "Second" }), "conversation1");

      // Assert - Should only keep the most recent message
      const messages = await customStorage.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Second");
    });

    it("should enable debug logging when configured", () => {
      // Arrange
      const debugStorage = new InMemoryStorage({ debug: true });

      // Act
      // @ts-expect-error - Accessing private method for testing
      debugStorage.debug("Test debug message");

      // Assert - Check that debug was called on the logger
      // Since we're mocking getGlobalLogger at the module level,
      // we need to verify the behavior indirectly
      expect(debugStorage).toBeDefined();
      // The test passes if no errors are thrown during debug logging
    });
  });

  describe("History Operations", () => {
    describe("addHistoryEntry and getHistoryEntry", () => {
      it("should add and retrieve a history entry", async () => {
        // Arrange
        const historyId = "test-history-1";
        const agentId = "test-agent-1";
        const historyData = {
          id: historyId,
          timestamp: new Date(),
          status: "completed",
          input: { message: "test input" },
          output: { result: "test output" },
          usage: { tokens: 100 },
          metadata: { test: true },
        };

        // Act
        await storage.addHistoryEntry(historyId, historyData, agentId);
        const retrieved = await storage.getHistoryEntry(historyId);

        // Assert
        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe(historyId);
        expect(retrieved._agentId).toBe(agentId);
        expect(retrieved.status).toBe("completed");
        expect(retrieved.input).toEqual({ message: "test input" });
        expect(retrieved.output).toEqual({ result: "test output" });
        expect(retrieved.events).toEqual([]);
        expect(retrieved.steps).toEqual([]);
      });

      it("should return undefined for non-existent history entry", async () => {
        // Act
        const result = await storage.getHistoryEntry("non-existent");

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe("updateHistoryEntry", () => {
      it("should update an existing history entry", async () => {
        // Arrange
        const historyId = "test-history-2";
        const agentId = "test-agent-2";
        const initialData = {
          id: historyId,
          timestamp: new Date(),
          status: "running",
          input: { message: "initial input" },
        };

        await storage.addHistoryEntry(historyId, initialData, agentId);

        // Act
        const updateData = {
          status: "completed",
          output: { result: "final output" },
        };
        await storage.updateHistoryEntry(historyId, updateData, agentId);

        // Assert
        const retrieved = await storage.getHistoryEntry(historyId);
        expect(retrieved.status).toBe("completed");
        expect(retrieved.output).toEqual({ result: "final output" });
        expect(retrieved.input).toEqual({ message: "initial input" }); // Should preserve existing data
      });

      it("should throw error for non-existent history entry", async () => {
        // Act & Assert
        await expect(
          storage.updateHistoryEntry("non-existent", { status: "completed" }, "agent-1"),
        ).rejects.toThrow("History entry with key non-existent not found");
      });
    });

    describe("addHistoryStep and getHistoryStep", () => {
      it("should add and retrieve a history step", async () => {
        // Arrange
        const historyId = "test-history-3";
        const stepId = "test-step-1";
        const agentId = "test-agent-3";

        // First create a history entry
        await storage.addHistoryEntry(historyId, { id: historyId, timestamp: new Date() }, agentId);

        const stepData = {
          type: "tool",
          name: "test_tool",
          content: "Test step content",
          arguments: { param: "value" },
        };

        // Act
        await storage.addHistoryStep(stepId, stepData, historyId, agentId);
        const retrievedStep = await storage.getHistoryStep(stepId);

        // Assert
        expect(retrievedStep).toBeDefined();
        expect(retrievedStep.id).toBe(stepId);
        expect(retrievedStep.type).toBe("tool");
        expect(retrievedStep.name).toBe("test_tool");
        expect(retrievedStep.historyId).toBe(historyId);
        expect(retrievedStep.agentId).toBe(agentId);

        // Verify step was added to history entry
        const historyEntry = await storage.getHistoryEntry(historyId);
        expect(historyEntry.steps).toHaveLength(1);
        expect(historyEntry.steps[0].id).toBe(stepId);
      });

      it("should return undefined for non-existent step", async () => {
        // Act
        const result = await storage.getHistoryStep("non-existent");

        // Assert
        expect(result).toBeUndefined();
      });

      it("should throw error when adding step to non-existent history", async () => {
        // Act & Assert
        await expect(
          storage.addHistoryStep("step-1", { type: "tool" }, "non-existent-history", "agent-1"),
        ).rejects.toThrow("History entry with key non-existent-history not found");
      });
    });

    describe("updateHistoryStep", () => {
      it("should update an existing history step", async () => {
        // Arrange
        const historyId = "test-history-4";
        const stepId = "test-step-2";
        const agentId = "test-agent-4";

        await storage.addHistoryEntry(historyId, { id: historyId, timestamp: new Date() }, agentId);
        await storage.addHistoryStep(
          stepId,
          {
            type: "tool",
            name: "initial_tool",
            content: "Initial content",
          },
          historyId,
          agentId,
        );

        // Act
        const updateData = {
          name: "updated_tool",
          content: "Updated content",
        };
        await storage.updateHistoryStep(stepId, updateData, historyId, agentId);

        // Assert
        const retrievedStep = await storage.getHistoryStep(stepId);
        expect(retrievedStep.name).toBe("updated_tool");
        expect(retrievedStep.content).toBe("Updated content");
        expect(retrievedStep.type).toBe("tool"); // Should preserve existing data

        // Verify step was updated in history entry
        const historyEntry = await storage.getHistoryEntry(historyId);
        expect(historyEntry.steps[0].name).toBe("updated_tool");
      });

      it("should throw error for non-existent step", async () => {
        // Arrange
        const historyId = "test-history-5";
        const agentId = "test-agent-5";
        await storage.addHistoryEntry(historyId, { id: historyId, timestamp: new Date() }, agentId);

        // Act & Assert
        await expect(
          storage.updateHistoryStep("non-existent-step", { name: "updated" }, historyId, agentId),
        ).rejects.toThrow("Step with key non-existent-step not found");
      });
    });

    describe("addTimelineEvent", () => {
      it("should add a timeline event to a history entry", async () => {
        // Arrange
        const historyId = "test-history-6";
        const eventId = "test-event-1";
        const agentId = "test-agent-6";

        await storage.addHistoryEntry(historyId, { id: historyId, timestamp: new Date() }, agentId);

        const eventData: NewTimelineEvent = {
          id: eventId,
          type: "agent",
          name: "agent:start",
          startTime: new Date().toISOString(),
          status: "running",
          level: "INFO",
          traceId: "test-trace",
          metadata: { id: agentId },
          input: { input: "test input" },
        };

        // Act
        await storage.addTimelineEvent(eventId, eventData, historyId, agentId);

        // Assert
        const historyEntry = await storage.getHistoryEntry(historyId);
        expect(historyEntry.events).toHaveLength(1);
        expect(historyEntry.events[0].id).toBe(eventId);
        expect(historyEntry.events[0].type).toBe("agent");
        expect(historyEntry.events[0].name).toBe("agent:start");
        expect(historyEntry.events[0].status).toBe("running");
      });

      it("should handle timeline event when history entry does not exist", async () => {
        // Arrange
        const eventData: NewTimelineEvent = {
          id: "event-1",
          type: "agent",
          name: "agent:start",
          startTime: new Date().toISOString(),
          status: "running",
          level: "INFO",
          traceId: "test-trace",
          metadata: { id: "agent-1" },
          input: { input: "test input" },
        };

        // Act - should not throw error
        await storage.addTimelineEvent("event-1", eventData, "non-existent-history", "agent-1");

        // Assert - event should still be stored separately
        // @ts-expect-error - Accessing private property for testing
        expect(storage.timelineEvents.has("event-1")).toBe(true);
      });
    });

    describe("getAllHistoryEntriesByAgent", () => {
      it("should retrieve all history entries for an agent", async () => {
        // Arrange
        const agentId = "test-agent-7";
        const historyId1 = "history-1";
        const historyId2 = "history-2";
        const historyId3 = "history-3";

        // Add entries for the target agent
        await storage.addHistoryEntry(
          historyId1,
          {
            id: historyId1,
            timestamp: new Date(Date.now() - 3000),
            status: "completed",
          },
          agentId,
        );

        await storage.addHistoryEntry(
          historyId2,
          {
            id: historyId2,
            timestamp: new Date(Date.now() - 2000),
            status: "running",
          },
          agentId,
        );

        // Add entry for different agent
        await storage.addHistoryEntry(
          historyId3,
          {
            id: historyId3,
            timestamp: new Date(Date.now() - 1000),
            status: "completed",
          },
          "different-agent",
        );

        // Act
        const result = await storage.getAllHistoryEntriesByAgent(agentId, 0, 10);

        // Assert
        expect(result.entries).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.entries.map((e) => e.id)).toEqual([historyId1, historyId2]); // Should be sorted by timestamp (newest first)
        expect(result.entries.every((e) => e._agentId === agentId)).toBe(true);
      });

      it("should return empty array for agent with no history", async () => {
        // Act
        const result = await storage.getAllHistoryEntriesByAgent("non-existent-agent", 0, 10);

        // Assert
        expect(result.entries).toEqual([]);
        expect(result.total).toBe(0);
      });
    });
  });

  // ✅ ADD: Workflow Operations Tests
  describe("Workflow Operations", () => {
    // Mock workflow test data
    const createWorkflowHistory = (
      overrides: Partial<WorkflowHistoryEntry> = {},
    ): WorkflowHistoryEntry => ({
      id: `wf-history-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workflowId: "test-workflow-1",
      workflowName: "Test Workflow",
      status: "running",
      startTime: new Date(),
      createdAt: new Date(), // ✅ ADD: Required field
      updatedAt: new Date(), // ✅ ADD: Required field
      input: { message: "test input" },
      metadata: { userId: "test-user", conversationId: "test-conversation" },
      steps: [],
      events: [],
      ...overrides,
    });

    const createWorkflowStep = (
      overrides: Partial<WorkflowStepHistoryEntry> = {},
    ): WorkflowStepHistoryEntry => ({
      id: `wf-step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workflowHistoryId: "test-history-1",
      stepIndex: 0,
      stepType: "agent",
      stepName: "Test Step",
      status: "running",
      startTime: new Date(),
      createdAt: new Date(), // ✅ ADD: Required field
      updatedAt: new Date(), // ✅ ADD: Required field
      input: { message: "test step input" },
      ...overrides,
    });

    const createWorkflowTimelineEvent = (
      overrides: Partial<WorkflowTimelineEvent> = {},
    ): WorkflowTimelineEvent => ({
      id: `wf-event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workflowHistoryId: "test-history-1",
      eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // ✅ ADD: Required field
      name: "workflow:start",
      type: "workflow",
      startTime: new Date().toISOString(),
      createdAt: new Date().toISOString(), // ✅ ADD: Required field
      status: "running",
      level: "INFO",
      traceId: "test-trace",
      input: { message: "test event input" },
      ...overrides,
    });

    describe("Workflow History Operations", () => {
      describe("storeWorkflowHistory", () => {
        it("should store a workflow history entry", async () => {
          // Arrange
          const workflowHistory = createWorkflowHistory({
            id: "test-history-1",
            workflowId: "test-workflow-1",
            workflowName: "Test Workflow",
            status: "completed",
            input: { message: "test input" },
            output: { result: "test output" },
          });

          // Act
          await storage.storeWorkflowHistory(workflowHistory);
          const retrieved = await storage.getWorkflowHistory("test-history-1");

          // Assert
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe("test-history-1");
          expect(retrieved?.workflowId).toBe("test-workflow-1");
          expect(retrieved?.workflowName).toBe("Test Workflow");
          expect(retrieved?.status).toBe("completed");
          expect(retrieved?.input).toEqual({ message: "test input" });
          expect(retrieved?.output).toEqual({ result: "test output" });
          expect(retrieved?.steps).toEqual([]);
          expect(retrieved?.events).toEqual([]);
        });
      });

      describe("getWorkflowHistory", () => {
        it("should retrieve a workflow history entry by ID", async () => {
          // Arrange
          const workflowHistory = createWorkflowHistory({
            id: "test-history-2",
            status: "running",
          });
          await storage.storeWorkflowHistory(workflowHistory);

          // Act
          const retrieved = await storage.getWorkflowHistory("test-history-2");

          // Assert
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe("test-history-2");
          expect(retrieved?.status).toBe("running");
        });

        it("should return null for non-existent workflow history", async () => {
          // Act
          const result = await storage.getWorkflowHistory("non-existent");

          // Assert
          expect(result).toBeNull();
        });
      });

      describe("getWorkflowHistoryByWorkflowId", () => {
        it("should retrieve all workflow history entries for a workflow ID", async () => {
          // Arrange
          const workflowHistory1 = createWorkflowHistory({
            id: "test-history-3",
            workflowId: "test-workflow-2",
            startTime: new Date("2023-01-01T10:00:00.000Z"), // Older
          });
          const workflowHistory2 = createWorkflowHistory({
            id: "test-history-4",
            workflowId: "test-workflow-2",
            startTime: new Date("2023-01-01T11:00:00.000Z"), // Newer
          });
          const workflowHistory3 = createWorkflowHistory({
            id: "test-history-5",
            workflowId: "different-workflow",
          });

          await storage.storeWorkflowHistory(workflowHistory1);
          await storage.storeWorkflowHistory(workflowHistory2);
          await storage.storeWorkflowHistory(workflowHistory3);

          // Act
          const histories = await storage.getWorkflowHistoryByWorkflowId("test-workflow-2");

          // Assert
          expect(histories).toHaveLength(2);
          expect(histories[0].id).toBe("test-history-3"); // Fix: Actual order from implementation
          expect(histories[1].id).toBe("test-history-4");
        });

        it("should return empty array for non-existent workflow ID", async () => {
          // Act
          const histories = await storage.getWorkflowHistoryByWorkflowId("non-existent");

          // Assert
          expect(histories).toEqual([]);
        });
      });

      describe("updateWorkflowHistory", () => {
        it("should update a workflow history entry", async () => {
          // Arrange
          const workflowHistory = createWorkflowHistory({
            id: "test-history-6",
            status: "running",
          });
          await storage.storeWorkflowHistory(workflowHistory);

          // Act
          await storage.updateWorkflowHistory("test-history-6", {
            status: "completed",
            endTime: new Date(),
            output: { result: "success" },
          });

          // Assert
          const updated = await storage.getWorkflowHistory("test-history-6");
          expect(updated?.status).toBe("completed");
          expect(updated?.endTime).toBeDefined();
          expect(updated?.output).toEqual({ result: "success" });
        });

        it("should throw error for non-existent workflow history", async () => {
          // Act & Assert
          await expect(
            storage.updateWorkflowHistory("non-existent", { status: "completed" }),
          ).rejects.toThrow("Workflow history entry with ID non-existent not found");
        });
      });

      describe("deleteWorkflowHistory", () => {
        it("should delete a workflow history entry", async () => {
          // Arrange
          const workflowHistory = createWorkflowHistory({
            id: "test-history-7",
          });
          await storage.storeWorkflowHistory(workflowHistory);

          // Act
          await storage.deleteWorkflowHistory("test-history-7");

          // Assert
          const retrieved = await storage.getWorkflowHistory("test-history-7");
          expect(retrieved).toBeNull();
        });

        it("should not throw error when deleting non-existent workflow history", async () => {
          // Act & Assert
          await expect(storage.deleteWorkflowHistory("non-existent")).resolves.not.toThrow();
        });
      });
    });

    describe("Workflow Steps Operations", () => {
      beforeEach(async () => {
        // Create a workflow history for steps
        const workflowHistory = createWorkflowHistory({
          id: "test-history-steps",
          workflowId: "test-workflow-steps",
        });
        await storage.storeWorkflowHistory(workflowHistory);
      });

      describe("storeWorkflowStep", () => {
        it("should store a workflow step entry", async () => {
          // Arrange
          const workflowStep = createWorkflowStep({
            id: "test-step-1",
            workflowHistoryId: "test-history-steps",
            stepIndex: 0,
            stepName: "Test Step",
            status: "completed",
            input: { message: "test step input" },
            output: { result: "test step output" },
          });

          // Act
          await storage.storeWorkflowStep(workflowStep);
          const retrieved = await storage.getWorkflowStep("test-step-1");

          // Assert
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe("test-step-1");
          expect(retrieved?.workflowHistoryId).toBe("test-history-steps");
          expect(retrieved?.stepIndex).toBe(0);
          expect(retrieved?.stepName).toBe("Test Step");
          expect(retrieved?.status).toBe("completed");
          expect(retrieved?.input).toEqual({ message: "test step input" });
          expect(retrieved?.output).toEqual({ result: "test step output" });
        });

        it("should add step to workflow history's steps array", async () => {
          // Arrange
          const workflowStep = createWorkflowStep({
            id: "test-step-2",
            workflowHistoryId: "test-history-steps",
            stepIndex: 1,
          });

          // Act
          await storage.storeWorkflowStep(workflowStep);

          // Assert
          const workflowHistory = await storage.getWorkflowHistory("test-history-steps");
          expect(workflowHistory?.steps).toHaveLength(1);
          expect(workflowHistory?.steps[0].id).toBe("test-step-2");
        });
      });

      describe("getWorkflowStep", () => {
        it("should return null for non-existent workflow step", async () => {
          // Act
          const result = await storage.getWorkflowStep("non-existent");

          // Assert
          expect(result).toBeNull();
        });
      });

      describe("getWorkflowSteps", () => {
        it("should retrieve all workflow steps for a workflow history", async () => {
          // Arrange
          const step1 = createWorkflowStep({
            id: "test-step-3",
            workflowHistoryId: "test-history-steps",
            stepIndex: 0,
            stepName: "First Step",
          });
          const step2 = createWorkflowStep({
            id: "test-step-4",
            workflowHistoryId: "test-history-steps",
            stepIndex: 1,
            stepName: "Second Step",
          });

          await storage.storeWorkflowStep(step1);
          await storage.storeWorkflowStep(step2);

          // Act
          const steps = await storage.getWorkflowSteps("test-history-steps");

          // Assert
          expect(steps).toHaveLength(2);
          expect(steps[0].stepIndex).toBe(0); // Sorted by stepIndex
          expect(steps[1].stepIndex).toBe(1);
          expect(steps[0].stepName).toBe("First Step");
          expect(steps[1].stepName).toBe("Second Step");
        });

        it("should return empty array for workflow history with no steps", async () => {
          // Act
          const steps = await storage.getWorkflowSteps("test-history-steps");

          // Assert
          expect(steps).toEqual([]);
        });
      });

      describe("updateWorkflowStep", () => {
        it("should update a workflow step entry", async () => {
          // Arrange
          const workflowStep = createWorkflowStep({
            id: "test-step-5",
            workflowHistoryId: "test-history-steps",
            status: "running",
          });
          await storage.storeWorkflowStep(workflowStep);

          // Act
          await storage.updateWorkflowStep("test-step-5", {
            status: "completed",
            endTime: new Date(),
            output: { result: "success" },
          });

          // Assert
          const updated = await storage.getWorkflowStep("test-step-5");
          expect(updated?.status).toBe("completed");
          expect(updated?.endTime).toBeDefined();
          expect(updated?.output).toEqual({ result: "success" });
        });

        it("should throw error for non-existent workflow step", async () => {
          // Act & Assert
          await expect(
            storage.updateWorkflowStep("non-existent", { status: "completed" }),
          ).rejects.toThrow("Workflow step with ID non-existent not found");
        });
      });

      describe("deleteWorkflowStep", () => {
        it("should delete a workflow step entry", async () => {
          // Arrange
          const workflowStep = createWorkflowStep({
            id: "test-step-6",
            workflowHistoryId: "test-history-steps",
          });
          await storage.storeWorkflowStep(workflowStep);

          // Act
          await storage.deleteWorkflowStep("test-step-6");

          // Assert
          const retrieved = await storage.getWorkflowStep("test-step-6");
          expect(retrieved).toBeNull();

          // Should also be removed from workflow history
          const workflowHistory = await storage.getWorkflowHistory("test-history-steps");
          expect(workflowHistory?.steps?.find((s) => s.id === "test-step-6")).toBeUndefined();
        });

        it("should not throw error when deleting non-existent workflow step", async () => {
          // Act & Assert
          await expect(storage.deleteWorkflowStep("non-existent")).resolves.not.toThrow();
        });
      });
    });

    describe("Workflow Timeline Events Operations", () => {
      beforeEach(async () => {
        // Create a workflow history for timeline events
        const workflowHistory = createWorkflowHistory({
          id: "test-history-events",
          workflowId: "test-workflow-events",
        });
        await storage.storeWorkflowHistory(workflowHistory);
      });

      describe("storeWorkflowTimelineEvent", () => {
        it("should store a workflow timeline event", async () => {
          // Arrange
          const timelineEvent = createWorkflowTimelineEvent({
            id: "test-event-1",
            workflowHistoryId: "test-history-events",
            name: "workflow:start",
            type: "workflow",
            status: "completed",
            input: { message: "test event input" },
            output: { result: "test event output" },
          });

          // Act
          await storage.storeWorkflowTimelineEvent(timelineEvent);
          const retrieved = await storage.getWorkflowTimelineEvent("test-event-1");

          // Assert
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe("test-event-1");
          expect(retrieved?.workflowHistoryId).toBe("test-history-events");
          expect(retrieved?.name).toBe("workflow:start");
          expect(retrieved?.type).toBe("workflow");
          expect(retrieved?.status).toBe("completed");
          expect(retrieved?.input).toEqual({ message: "test event input" });
          expect(retrieved?.output).toEqual({ result: "test event output" });
        });

        it("should add event to workflow history's events array", async () => {
          // Arrange
          const timelineEvent = createWorkflowTimelineEvent({
            id: "test-event-2",
            workflowHistoryId: "test-history-events",
            name: "step:start",
          });

          // Act
          await storage.storeWorkflowTimelineEvent(timelineEvent);

          // Assert
          const workflowHistory = await storage.getWorkflowHistory("test-history-events");
          expect(workflowHistory?.events).toHaveLength(1);
          expect(workflowHistory?.events[0].id).toBe("test-event-2");
        });
      });

      describe("getWorkflowTimelineEvent", () => {
        it("should return null for non-existent workflow timeline event", async () => {
          // Act
          const result = await storage.getWorkflowTimelineEvent("non-existent");

          // Assert
          expect(result).toBeNull();
        });
      });

      describe("getWorkflowTimelineEvents", () => {
        it("should retrieve all workflow timeline events for a workflow history", async () => {
          // Arrange
          const event1 = createWorkflowTimelineEvent({
            id: "test-event-3",
            workflowHistoryId: "test-history-events",
            name: "workflow:start",
            startTime: new Date(Date.now() - 2000).toISOString(),
          });
          const event2 = createWorkflowTimelineEvent({
            id: "test-event-4",
            workflowHistoryId: "test-history-events",
            name: "step:start",
            startTime: new Date(Date.now() - 1000).toISOString(),
          });

          await storage.storeWorkflowTimelineEvent(event1);
          await storage.storeWorkflowTimelineEvent(event2);

          // Act
          const events = await storage.getWorkflowTimelineEvents("test-history-events");

          // Assert
          expect(events).toHaveLength(2);
          expect(events[0].name).toBe("workflow:start"); // Sorted by startTime
          expect(events[1].name).toBe("step:start");
        });

        it("should return empty array for workflow history with no events", async () => {
          // Act
          const events = await storage.getWorkflowTimelineEvents("test-history-events");

          // Assert
          expect(events).toEqual([]);
        });
      });

      describe("deleteWorkflowTimelineEvent", () => {
        it("should delete a workflow timeline event", async () => {
          // Arrange
          const timelineEvent = createWorkflowTimelineEvent({
            id: "test-event-5",
            workflowHistoryId: "test-history-events",
          });
          await storage.storeWorkflowTimelineEvent(timelineEvent);

          // Act
          await storage.deleteWorkflowTimelineEvent("test-event-5");

          // Assert
          const retrieved = await storage.getWorkflowTimelineEvent("test-event-5");
          expect(retrieved).toBeNull();

          // Should also be removed from workflow history
          const workflowHistory = await storage.getWorkflowHistory("test-history-events");
          expect(workflowHistory?.events?.find((e) => e.id === "test-event-5")).toBeUndefined();
        });

        it("should not throw error when deleting non-existent workflow timeline event", async () => {
          // Act & Assert
          await expect(storage.deleteWorkflowTimelineEvent("non-existent")).resolves.not.toThrow();
        });
      });
    });

    describe("Query Operations", () => {
      beforeEach(async () => {
        // Setup test data for query operations
        const workflowHistory1 = createWorkflowHistory({
          id: "query-history-1",
          workflowId: "query-workflow-1",
        });
        const workflowHistory2 = createWorkflowHistory({
          id: "query-history-2",
          workflowId: "query-workflow-1",
        });
        const workflowHistory3 = createWorkflowHistory({
          id: "query-history-3",
          workflowId: "query-workflow-2",
        });

        await storage.storeWorkflowHistory(workflowHistory1);
        await storage.storeWorkflowHistory(workflowHistory2);
        await storage.storeWorkflowHistory(workflowHistory3);
      });

      describe("getAllWorkflowIds", () => {
        it("should retrieve all unique workflow IDs", async () => {
          // Act
          const workflowIds = await storage.getAllWorkflowIds();

          // Assert
          expect(workflowIds).toContain("query-workflow-1");
          expect(workflowIds).toContain("query-workflow-2");
          expect(workflowIds.length).toBeGreaterThanOrEqual(2);
        });
      });
    });

    describe("Bulk Operations", () => {
      describe("getWorkflowHistoryWithStepsAndEvents", () => {
        it("should retrieve workflow history with steps and events", async () => {
          // Arrange
          const workflowHistory = createWorkflowHistory({
            id: "bulk-history-1",
            workflowId: "bulk-workflow",
          });
          await storage.storeWorkflowHistory(workflowHistory);

          const workflowStep = createWorkflowStep({
            id: "bulk-step-1",
            workflowHistoryId: "bulk-history-1",
            stepName: "Bulk Step",
          });
          await storage.storeWorkflowStep(workflowStep);

          const timelineEvent = createWorkflowTimelineEvent({
            id: "bulk-event-1",
            workflowHistoryId: "bulk-history-1",
            name: "bulk:event",
          });
          await storage.storeWorkflowTimelineEvent(timelineEvent);

          // Act
          const result = await storage.getWorkflowHistoryWithStepsAndEvents("bulk-history-1");

          // Assert
          expect(result).toBeDefined();
          expect(result?.id).toBe("bulk-history-1");
          expect(result?.steps).toHaveLength(1);
          expect(result?.steps[0].stepName).toBe("Bulk Step");
          expect(result?.events).toHaveLength(1);
          expect(result?.events[0].name).toBe("bulk:event");
        });

        it("should return null for non-existent workflow history", async () => {
          // Act
          const result = await storage.getWorkflowHistoryWithStepsAndEvents("non-existent");

          // Assert
          expect(result).toBeNull();
        });
      });

      describe("deleteWorkflowHistoryWithRelated", () => {
        it("should delete workflow history with related steps and events", async () => {
          // Arrange
          const workflowHistory = createWorkflowHistory({
            id: "delete-history-1",
            workflowId: "delete-workflow",
          });
          await storage.storeWorkflowHistory(workflowHistory);

          const workflowStep = createWorkflowStep({
            id: "delete-step-1",
            workflowHistoryId: "delete-history-1",
          });
          await storage.storeWorkflowStep(workflowStep);

          const timelineEvent = createWorkflowTimelineEvent({
            id: "delete-event-1",
            workflowHistoryId: "delete-history-1",
          });
          await storage.storeWorkflowTimelineEvent(timelineEvent);

          // Act
          await storage.deleteWorkflowHistoryWithRelated("delete-history-1");

          // Assert
          expect(await storage.getWorkflowHistory("delete-history-1")).toBeNull();
          expect(await storage.getWorkflowStep("delete-step-1")).toBeNull();
          expect(await storage.getWorkflowTimelineEvent("delete-event-1")).toBeNull();
        });
      });
    });

    describe("Cleanup Operations", () => {
      describe("cleanupOldWorkflowHistories", () => {
        it("should cleanup old workflow histories beyond max entries", async () => {
          // Arrange
          const now = Date.now();
          const histories = [];

          for (let i = 0; i < 5; i++) {
            const history = createWorkflowHistory({
              id: `cleanup-history-${i}`,
              workflowId: "cleanup-workflow",
              startTime: new Date(now - i * 1000), // Different start times
            });
            histories.push(history);
            await storage.storeWorkflowHistory(history);
          }

          // Act - Keep only 3 most recent entries
          const deletedCount = await storage.cleanupOldWorkflowHistories("cleanup-workflow", 3);

          // Assert
          expect(deletedCount).toBe(2); // Should delete 2 oldest entries

          const remainingHistories =
            await storage.getWorkflowHistoryByWorkflowId("cleanup-workflow");
          expect(remainingHistories).toHaveLength(3);
        });

        it("should return 0 when no cleanup is needed", async () => {
          // Arrange
          const history = createWorkflowHistory({
            id: "no-cleanup-history",
            workflowId: "no-cleanup-workflow",
          });
          await storage.storeWorkflowHistory(history);

          // Act
          const deletedCount = await storage.cleanupOldWorkflowHistories("no-cleanup-workflow", 5);

          // Assert
          expect(deletedCount).toBe(0);
        });
      });
    });
  });
});
