import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryManager } from ".";
import type { AgentHistoryEntry } from "../../agent/history";
import type { BaseMessage } from "../../agent/providers/base/types";
import type { OperationContext } from "../../agent/types";
import { AgentEventEmitter } from "../../events";
import type { NewTimelineEvent } from "../../events/types";
import type { Memory, MemoryMessage } from "../types";

// Mock the AgentRegistry
vi.mock("../../server/registry", () => {
  const mockAgent = {
    id: "test-agent",
    name: "Test Agent",
    getHistory: vi.fn().mockReturnValue([
      {
        id: "history-1",
        status: "idle",
        events: [],
      },
    ]),
  };

  return {
    AgentRegistry: {
      getInstance: vi.fn().mockReturnValue({
        getAgent: vi.fn().mockReturnValue(mockAgent),
        getGlobalLogger: vi.fn().mockReturnValue(undefined),
        setGlobalLogger: vi.fn(),
      }),
    },
  };
});

// Mock the AgentEventEmitter
vi.mock("../../events", () => {
  return {
    AgentEventEmitter: {
      getInstance: vi.fn().mockReturnValue({
        publishTimelineEventAsync: vi.fn(),
        addHistoryEvent: vi.fn(),
        emitHistoryUpdate: vi.fn(),
      }),
    },
  };
});

// Mock the main logger module
vi.mock("../../logger", () => {
  const createMockLogger = () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  });

  return {
    getGlobalLogger: vi.fn(() => createMockLogger()),
    LogEvents: {
      MEMORY_OPERATION_FAILED: "memory.operation.failed",
    },
    LoggerProxy: vi.fn().mockImplementation(() => createMockLogger()),
  };
});

// Mock the console logger
vi.mock("../../logger/console-logger", () => {
  const createMockLogger = () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  });

  const mockLogger = createMockLogger();

  return {
    createConsoleLogger: vi.fn().mockReturnValue(mockLogger),
    getDefaultLogBuffer: vi.fn().mockReturnValue({
      add: vi.fn(),
      push: vi.fn(),
      clear: vi.fn(),
      query: vi.fn().mockReturnValue([]),
      getEntries: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      off: vi.fn(),
    }),
    InMemoryLogBuffer: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      query: vi.fn(() => []),
      clear: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    })),
  };
});

// Create mock OperationContext for tests
const createMockContext = (): OperationContext => {
  const mockHistoryEntry: AgentHistoryEntry = {
    id: "history-1",
    startTime: new Date(),
    input: "test input",
    output: "",
    status: "working",
    steps: [],
  };

  return {
    historyEntry: mockHistoryEntry,
    isActive: true,
    operationId: "test-operation",
    userContext: new Map(),
    logger: {
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
        child: vi.fn(),
      })),
    },
  };
};

// Mock memory implementation for testing
class MockMemory implements Memory {
  private messages: Record<string, MemoryMessage[]> = {};
  private conversations: Record<string, any> = {};
  private historyEntries: Record<string, any> = {};
  private historyEvents: Record<string, any> = {};
  private historySteps: Record<string, any> = {};
  private timelineEvents: Record<string, any> = {};
  public currentUserId: string | undefined;

  async addMessage(
    message: BaseMessage | MemoryMessage,
    conversationId = "default",
  ): Promise<void> {
    // For testing purposes, we need to track which user this message belongs to
    // We'll extract it from the current test context or use a default
    const userId = this.currentUserId || "default-user";
    const key = `${userId}:${conversationId}`;
    if (!this.messages[key]) {
      this.messages[key] = [];
    }

    // Check if message is already a MemoryMessage (has id, type, and createdAt)
    if ("id" in message && "type" in message && "createdAt" in message) {
      this.messages[key].push(message as MemoryMessage);
    } else {
      // Convert BaseMessage to MemoryMessage
      const memoryMessage: MemoryMessage = {
        id: crypto.randomUUID(),
        role: message.role,
        content: message.content,
        type: "text", // Default type
        createdAt: new Date().toISOString(),
      };
      this.messages[key].push(memoryMessage);
    }
  }

  async getMessages(options: any): Promise<MemoryMessage[]> {
    const { userId, conversationId = "default", limit = 10, types } = options;
    const key = `${userId}:${conversationId}`;
    if (!this.messages[key]) {
      return [];
    }

    let filteredMessages = this.messages[key];

    // Apply types filter if specified
    if (types) {
      filteredMessages = filteredMessages.filter((msg) => types.includes(msg.type));
    }

    return filteredMessages.slice(-limit);
  }

  async clearMessages(options: any): Promise<void> {
    const { userId, conversationId = "default" } = options;
    const key = `${userId}:${conversationId}`;
    this.messages[key] = [];
  }

  async createConversation(conversation: any): Promise<any> {
    this.conversations[conversation.id] = {
      ...conversation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.conversations[conversation.id];
  }

  async getConversation(id: string): Promise<any> {
    return this.conversations[id] || null;
  }

  async getConversations(resourceId: string): Promise<any[]> {
    return Object.values(this.conversations).filter((c) => c.resourceId === resourceId);
  }

  async updateConversation(id: string, updates: any): Promise<any> {
    if (!this.conversations[id]) {
      return null;
    }
    this.conversations[id] = {
      ...this.conversations[id],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.conversations[id];
  }

  async deleteConversation(id: string): Promise<void> {
    delete this.conversations[id];
  }

  // History management methods
  async addHistoryEntry(id: string, entry: any, agentId: string): Promise<any> {
    this.historyEntries[id] = { ...entry, _agentId: agentId, events: [], steps: [] };
    return this.historyEntries[id];
  }

  async updateHistoryEntry(id: string, updates: any, agentId: string): Promise<any> {
    if (!this.historyEntries[id] || this.historyEntries[id]._agentId !== agentId) {
      return null;
    }
    this.historyEntries[id] = { ...this.historyEntries[id], ...updates };
    return this.historyEntries[id];
  }

  async getHistoryEntry(id: string): Promise<any> {
    return this.historyEntries[id] || null;
  }

  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    return Object.values(this.historyEntries).filter((entry) => entry._agentId === agentId);
  }

  async addHistoryEvent(id: string, event: any, historyId: string, agentId: string): Promise<any> {
    this.historyEvents[id] = { ...event, history_id: historyId, _agentId: agentId };

    // Add event to the history entry's events array
    if (this.historyEntries[historyId]) {
      if (!this.historyEntries[historyId].events) {
        this.historyEntries[historyId].events = [];
      }
      this.historyEntries[historyId].events.push(this.historyEvents[id]);
    }

    return this.historyEvents[id];
  }

  async updateHistoryEvent(
    id: string,
    updates: any,
    historyId: string,
    agentId: string,
  ): Promise<any> {
    if (!this.historyEvents[id] || this.historyEvents[id]._agentId !== agentId) {
      return null;
    }
    this.historyEvents[id] = { ...this.historyEvents[id], ...updates };

    // Update event in the history entry's events array
    if (this.historyEntries[historyId]?.events) {
      const eventIndex = this.historyEntries[historyId].events.findIndex((e: any) => e.id === id);
      if (eventIndex !== -1) {
        this.historyEntries[historyId].events[eventIndex] = this.historyEvents[id];
      }
    }

    return this.historyEvents[id];
  }

  async getHistoryEvent(id: string): Promise<any> {
    return this.historyEvents[id] || null;
  }

  async addHistoryStep(id: string, step: any, historyId: string, agentId: string): Promise<any> {
    this.historySteps[id] = { ...step, history_id: historyId, _agentId: agentId };

    // Add step to the history entry's steps array
    if (this.historyEntries[historyId]) {
      if (!this.historyEntries[historyId].steps) {
        this.historyEntries[historyId].steps = [];
      }
      this.historyEntries[historyId].steps.push(this.historySteps[id]);
    }

    return this.historySteps[id];
  }

  async updateHistoryStep(
    id: string,
    updates: any,
    historyId: string,
    agentId: string,
  ): Promise<any> {
    if (!this.historySteps[id] || this.historySteps[id]._agentId !== agentId) {
      return null;
    }
    this.historySteps[id] = { ...this.historySteps[id], ...updates };

    // Update step in the history entry's steps array
    if (this.historyEntries[historyId]?.steps) {
      const stepIndex = this.historyEntries[historyId].steps.findIndex((s: any) => s.id === id);
      if (stepIndex !== -1) {
        this.historyEntries[historyId].steps[stepIndex] = this.historySteps[id];
      }
    }

    return this.historySteps[id];
  }

  async getHistoryStep(id: string): Promise<any> {
    return this.historySteps[id] || null;
  }

  // Add the missing addTimelineEvent method
  async addTimelineEvent(
    key: string,
    value: NewTimelineEvent,
    historyId: string,
    agentId: string,
  ): Promise<void> {
    this.timelineEvents[key] = { ...value, history_id: historyId, _agentId: agentId };
  }

  // Add the missing user-centric conversation methods
  async getConversationsByUserId(userId: string, _options: any = {}): Promise<any[]> {
    return Object.values(this.conversations).filter((c) => c.userId === userId);
  }

  async queryConversations(options: any): Promise<any[]> {
    let conversations = Object.values(this.conversations);

    if (options.userId) {
      conversations = conversations.filter((c) => c.userId === options.userId);
    }
    if (options.resourceId) {
      conversations = conversations.filter((c) => c.resourceId === options.resourceId);
    }

    return conversations;
  }

  async getConversationMessages(conversationId: string, options: any = {}): Promise<any[]> {
    // Find messages for this conversation across all user-conversation keys
    const allMessages: any[] = [];
    for (const [key, messages] of Object.entries(this.messages)) {
      if (key.endsWith(`:${conversationId}`)) {
        allMessages.push(...messages);
      }
    }

    // Sort by creation time
    allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const { limit = 100, offset = 0 } = options;
    return allMessages.slice(offset, offset + limit);
  }

  // Getter helper functions for tests
  getHistoryEntries(): Record<string, any> {
    return this.historyEntries;
  }

  getHistoryEvents(): Record<string, any> {
    return this.historyEvents;
  }

  getHistorySteps(): Record<string, any> {
    return this.historySteps;
  }

  getTimelineEvents(): Record<string, any> {
    return this.timelineEvents;
  }

  // Helper method for tests to set current user
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  // Workflow History Operations (stub implementations for testing)
  async storeWorkflowHistory(_entry: any): Promise<void> {
    // Stub implementation
  }

  async getWorkflowHistory(_id: string): Promise<any | null> {
    return null;
  }

  async getWorkflowHistoryByWorkflowId(_workflowId: string): Promise<any[]> {
    return [];
  }

  async updateWorkflowHistory(_id: string, _updates: any): Promise<void> {
    // Stub implementation
  }

  async deleteWorkflowHistory(_id: string): Promise<void> {
    // Stub implementation
  }

  // Workflow Steps Operations (stub implementations for testing)
  async storeWorkflowStep(_step: any): Promise<void> {
    // Stub implementation
  }

  async getWorkflowStep(_id: string): Promise<any | null> {
    return null;
  }

  async getWorkflowSteps(_workflowHistoryId: string): Promise<any[]> {
    return [];
  }

  async updateWorkflowStep(_id: string, _updates: any): Promise<void> {
    // Stub implementation
  }

  async deleteWorkflowStep(_id: string): Promise<void> {
    // Stub implementation
  }

  // Workflow Timeline Events Operations (stub implementations for testing)
  async storeWorkflowTimelineEvent(_event: any): Promise<void> {
    // Stub implementation
  }

  async getWorkflowTimelineEvent(_id: string): Promise<any | null> {
    return null;
  }

  async getWorkflowTimelineEvents(_workflowHistoryId: string): Promise<any[]> {
    return [];
  }

  async deleteWorkflowTimelineEvent(_id: string): Promise<void> {
    // Stub implementation
  }

  // Query Operations (stub implementations for testing)
  async getAllWorkflowIds(): Promise<string[]> {
    return [];
  }

  async getWorkflowStats(_workflowId: string): Promise<any> {
    return { totalRuns: 0, successCount: 0, errorCount: 0 };
  }

  // Bulk Operations (stub implementations for testing)
  async getWorkflowHistoryWithStepsAndEvents(_id: string): Promise<any | null> {
    return null;
  }

  async deleteWorkflowHistoryWithRelated(_id: string): Promise<void> {
    // Stub implementation
  }

  // Cleanup Operations (stub implementations for testing)
  async cleanupOldWorkflowHistories(_workflowId: string, _maxEntries: number): Promise<number> {
    return 0;
  }
}

describe("MemoryManager", () => {
  let memoryManager: MemoryManager;
  let mockMemory: MockMemory;
  let mockContext: OperationContext;

  beforeEach(() => {
    mockMemory = new MockMemory();
    mockMemory.setCurrentUserId("user1"); // Set default user for tests
    memoryManager = new MemoryManager("test-agent", mockMemory);
    mockContext = createMockContext();
  });

  describe("saveMessage", () => {
    it("should save a message to memory", async () => {
      const message: BaseMessage = {
        role: "user",
        content: "Hello, world!",
      };

      await memoryManager.saveMessage(mockContext, message, "user1", "conversation1");

      const messages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello, world!");
    });

    it("should not save a message if userId is not provided", async () => {
      const message: BaseMessage = {
        role: "user",
        content: "Hello, world!",
      };

      await memoryManager.saveMessage(mockContext, message, undefined, "conversation1");

      const messages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages.length).toBe(0);
    });
  });

  describe("prepareConversationContext", () => {
    beforeEach(async () => {
      // Add some test messages
      mockMemory.setCurrentUserId("user1");
      await mockMemory.addMessage({ role: "user", content: "Message 1" }, "conversation1");
      await mockMemory.addMessage({ role: "assistant", content: "Response 1" }, "conversation1");
      await mockMemory.addMessage({ role: "user", content: "Message 2" }, "conversation1");
    });

    it("should retrieve messages from memory during context preparation", async () => {
      const { messages } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        "user1",
        "conversation1",
      );

      expect(messages.length).toBe(3);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Message 1");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("Response 1");
      expect(messages[2].role).toBe("user");
      expect(messages[2].content).toBe("Message 2");
    });

    it("should filter out tool-call and tool-result messages from context", async () => {
      // Add messages with different types as MemoryMessages
      await mockMemory.addMessage(
        {
          id: "msg-4",
          role: "assistant",
          content: JSON.stringify({ tool: "calculator", args: { a: 1, b: 2 } }),
          type: "tool-call",
          createdAt: new Date().toISOString(),
        },
        "conversation1",
      );

      await mockMemory.addMessage(
        {
          id: "msg-5",
          role: "tool",
          content: JSON.stringify({ result: 3 }),
          type: "tool-result",
          createdAt: new Date().toISOString(),
        },
        "conversation1",
      );

      await mockMemory.addMessage(
        {
          id: "msg-6",
          role: "assistant",
          content: "The result is 3",
          type: "text",
          createdAt: new Date().toISOString(),
        },
        "conversation1",
      );

      const { messages } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        "user1",
        "conversation1",
      );

      // Should only get text messages
      expect(messages.length).toBe(4); // 3 from beforeEach + 1 new text message
      expect(messages[3].content).toBe("The result is 3");

      // Verify that tool-related messages were not included
      const contents = messages.map((m) => m.content);
      expect(contents).not.toContain(JSON.stringify({ tool: "calculator", args: { a: 1, b: 2 } }));
      expect(contents).not.toContain(JSON.stringify({ result: 3 }));
    });

    it("should respect the limit parameter", async () => {
      const { messages } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        "user1",
        "conversation1",
        2,
      );

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toBe("Response 1");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toBe("Message 2");
    });

    it("should return an empty array if userId is not provided", async () => {
      const { messages } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        undefined,
        "conversation1",
      );
      expect(messages.length).toBe(0);
    });

    it("should return an empty array if conversationId is not provided", async () => {
      const { messages } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        "user1",
        undefined,
      );
      expect(messages.length).toBe(0);
    });
  });

  describe("createStepFinishHandler", () => {
    it("should return a function that saves step messages", async () => {
      const handler = memoryManager.createStepFinishHandler(mockContext, "user1", "conversation1");

      await handler({
        id: "test-step-id-1",
        type: "tool_call",
        name: "test_tool",
        role: "assistant",
        content: "Tool call content",
      });

      const messages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe("assistant");
      expect(messages[0].content).toBe("Tool call content");
      expect(messages[0].type).toBe("tool-call");
    });

    it("should return an empty function if userId is not provided", async () => {
      const handler = memoryManager.createStepFinishHandler(
        mockContext,
        undefined,
        "conversation1",
      );

      // This should not throw or add a message
      await handler({
        id: "test-step-id-2",
        type: "tool_call",
        name: "test_tool",
        role: "assistant",
        content: "Tool call content",
      });

      const messages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages.length).toBe(0);
    });
  });

  describe("prepareConversationContext", () => {
    it("should prepare context for string input", async () => {
      const { messages, conversationId } = await memoryManager.prepareConversationContext(
        mockContext,
        "Hello, world!",
        "user1",
        "conversation1",
      );

      // Give some time for background operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that conversation was created
      const conversation = await mockMemory.getConversation("conversation1");
      expect(conversation).not.toBeNull();

      // Check that message was saved (background operation)
      const savedMessages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(savedMessages.length).toBe(1);
      expect(savedMessages[0].role).toBe("user");
      expect(savedMessages[0].content).toBe("Hello, world!");

      // Check that correct context is returned
      expect(messages.length).toBe(0); // No prior messages in this test
      expect(conversationId).toBe("conversation1");
    });

    it("should prepare context for message array input", async () => {
      const inputMessages: BaseMessage[] = [
        { role: "user", content: "Message from array" },
        { role: "assistant", content: "Response in array" },
      ];

      const { messages, conversationId } = await memoryManager.prepareConversationContext(
        mockContext,
        inputMessages,
        "user1",
        "conversation1",
      );

      // Give some time for background operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that messages were saved (background operation)
      const savedMessages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(savedMessages.length).toBe(2);
      expect(savedMessages[0].role).toBe("user");
      expect(savedMessages[0].content).toBe("Message from array");
      expect(savedMessages[1].role).toBe("assistant");
      expect(savedMessages[1].content).toBe("Response in array");

      // Check that correct context is returned
      expect(messages.length).toBe(0); // No prior messages in this test
      expect(conversationId).toBe("conversation1");
    });

    it("should generate a new conversationId if none is provided", async () => {
      const { conversationId } = await memoryManager.prepareConversationContext(
        mockContext,
        "Hello, world!",
        "user1",
      );

      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe("string");

      // Give some time for background operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that conversation was created with the generated ID
      const conversation = await mockMemory.getConversation(conversationId);
      expect(conversation).not.toBeNull();
    });

    it("should retrieve previous messages for existing conversations", async () => {
      // Add some messages to an existing conversation
      await mockMemory.createConversation({
        id: "existing-conversation",
        resourceId: "test-agent",
        title: "Test Conversation",
        metadata: {},
      });

      mockMemory.setCurrentUserId("user1");
      await mockMemory.addMessage(
        { role: "user", content: "Previous message 1" },
        "existing-conversation",
      );
      await mockMemory.addMessage(
        { role: "assistant", content: "Previous response 1" },
        "existing-conversation",
      );

      // Now prepare context with the existing conversation
      const { messages, conversationId } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        "user1",
        "existing-conversation",
      );

      expect(conversationId).toBe("existing-conversation");
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Previous message 1");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("Previous response 1");

      // Give some time for background operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that the new message was saved (background operation)
      const savedMessages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "existing-conversation",
      });

      expect(savedMessages.length).toBe(3);
      expect(savedMessages[2].role).toBe("user");
      expect(savedMessages[2].content).toBe("New message");
    });
  });

  describe("getMemory", () => {
    it("should return the memory instance", () => {
      const memory = memoryManager.getMemory();
      expect(memory).toBe(mockMemory);
    });
  });

  describe("getOptions", () => {
    it("should return the memory options", () => {
      const manager = new MemoryManager("test-agent", mockMemory, { storageLimit: 50 });
      const options = manager.getOptions();
      expect(options).toEqual({ storageLimit: 50 });
    });

    it("should return a copy of the options", () => {
      const manager = new MemoryManager("test-agent", mockMemory, { storageLimit: 50 });
      const options1 = manager.getOptions();
      const options2 = manager.getOptions();

      // Options should be equal but not the same object
      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2);
    });
  });
});

// Let's add a new test group
describe("MemoryManager - History Management", () => {
  let memoryManager: MemoryManager;
  let mockMemory: MockMemory;
  let mockContext: OperationContext;

  beforeEach(() => {
    mockMemory = new MockMemory();
    // ✅ Clean approach: Pass historyMemory as constructor parameter instead of using 'any'
    memoryManager = new MemoryManager("test-agent", mockMemory, {}, mockMemory);
    mockContext = createMockContext();
  });

  it("should store history entry", async () => {
    const agentId = "test-agent";
    const entry = {
      id: "test-history-entry",
      timestamp: new Date(),
      status: "completed",
      input: "test input",
      output: "test output",
      usage: { totalTokens: 100 },
      events: [],
      steps: [],
    };

    await memoryManager.storeHistoryEntry(agentId, entry);

    const storedEntry = await mockMemory.getHistoryEntry("test-history-entry");
    expect(storedEntry).toBeDefined();
    expect(storedEntry._agentId).toBe(agentId);
    expect(storedEntry.input).toBe(entry.input);
    expect(storedEntry.output).toBe(entry.output);
  });

  it("should get history entry by ID", async () => {
    const agentId = "test-agent";
    const entryId = "test-history-entry";

    // First store an entry
    await mockMemory.addHistoryEntry(
      entryId,
      {
        id: entryId,
        timestamp: new Date(),
        status: "completed",
        input: "test input",
        output: "test output",
      },
      agentId,
    );

    const retrievedEntry = await memoryManager.getHistoryEntryById(agentId, entryId);

    expect(retrievedEntry).toBeDefined();
    expect(retrievedEntry.id).toBe(entryId);
    expect(retrievedEntry._agentId).toBe(agentId);
  });

  it("should get all history entries for an agent", async () => {
    const agentId = "test-agent";

    // Add a few history entries
    await mockMemory.addHistoryEntry("entry1", { id: "entry1", input: "input1" }, agentId);
    await mockMemory.addHistoryEntry("entry2", { id: "entry2", input: "input2" }, agentId);
    await mockMemory.addHistoryEntry(
      "entry3",
      { id: "entry3", input: "input3" },
      "different-agent",
    );

    const entries = await memoryManager.getAllHistoryEntries(agentId);

    expect(entries.length).toBe(2);
    expect(entries.map((e) => e.id)).toContain("entry1");
    expect(entries.map((e) => e.id)).toContain("entry2");
    expect(entries.map((e) => e.id)).not.toContain("entry3");
  });

  it("should update history entry", async () => {
    const agentId = "test-agent";
    const entryId = "test-history-entry";

    // First store an entry
    await mockMemory.addHistoryEntry(
      entryId,
      {
        id: entryId,
        timestamp: new Date(),
        status: "running",
        input: "test input",
        output: "",
      },
      agentId,
    );

    // Update the entry
    const updates = {
      status: "completed",
      output: "test output",
    };

    await memoryManager.updateHistoryEntry(agentId, entryId, updates);

    const updatedEntry = await mockMemory.getHistoryEntry(entryId);
    expect(updatedEntry.status).toBe("completed");
    expect(updatedEntry.output).toBe("test output");
  });

  it("should add steps to history entry", async () => {
    const agentId = "test-agent";
    const entryId = "test-history-entry";

    // First store an entry
    await mockMemory.addHistoryEntry(
      entryId,
      {
        id: entryId,
        timestamp: new Date(),
        status: "running",
        input: "test input",
        output: "",
      },
      agentId,
    );

    // Add steps
    const steps = [
      {
        type: "tool_call",
        name: "test-tool",
        content: "tool call content",
        arguments: { arg1: "value1" },
      },
      {
        type: "tool_result",
        name: "test-tool",
        content: "tool result content",
        arguments: {},
      },
    ];

    await memoryManager.addStepsToHistoryEntry(agentId, entryId, steps);

    const updatedEntry = await mockMemory.getHistoryEntry(entryId);
    expect(updatedEntry.steps.length).toBe(2);
    expect(updatedEntry.steps[0].type).toBe("tool_call");
    expect(updatedEntry.steps[1].type).toBe("tool_result");
  });

  it("should add timeline event to history entry", async () => {
    const agentId = "test-agent";
    const entryId = "test-history-entry";
    const eventId = "test-timeline-event";

    // First store an entry
    await mockMemory.addHistoryEntry(
      entryId,
      {
        id: entryId,
        timestamp: new Date(),
        status: "running",
        input: "test input",
        output: "",
      },
      agentId,
    );

    // Add a timeline event
    const timelineEvent: NewTimelineEvent = {
      id: eventId,
      name: "memory:write_start",
      type: "memory",
      startTime: new Date().toISOString(),
      status: "running",
      input: { test: "data" },
      output: null,
      metadata: {
        displayName: "Test Event",
        id: "test",
        agentId: agentId,
      },
      traceId: entryId,
    };

    await memoryManager.addTimelineEvent(agentId, entryId, eventId, timelineEvent);

    const timelineEvents = mockMemory.getTimelineEvents();
    expect(timelineEvents[eventId]).toBeDefined();
    expect(timelineEvents[eventId].name).toBe("memory:write_start");
    expect(timelineEvents[eventId]._agentId).toBe(agentId);
  });

  it("should create memory events during operations", async () => {
    const eventEmitter = AgentEventEmitter.getInstance();
    // Create spy for publishTimelineEventAsync method
    const publishTimelineEventSpy = vi.spyOn(eventEmitter, "publishTimelineEventAsync");

    // Trigger memory event creation by calling saveMessage
    await memoryManager.saveMessage(
      mockContext,
      { role: "user", content: "Test message" },
      "test-user",
      "test-conversation",
    );

    // Verify publishTimelineEventAsync was called
    expect(publishTimelineEventSpy).toHaveBeenCalled();

    publishTimelineEventSpy.mockRestore();
  });
});

describe("MemoryManager - Memory State", () => {
  let memoryManager: MemoryManager;
  let mockMemory: MockMemory;

  beforeEach(() => {
    mockMemory = new MockMemory();
    memoryManager = new MemoryManager("test-agent", mockMemory);
  });

  it("should return memory state with correct node_id", () => {
    const state = memoryManager.getMemoryState();

    expect(state).toEqual(
      expect.objectContaining({
        resourceId: "test-agent",
        available: true,
        node_id: "memory_test-agent",
      }),
    );
  });

  it("should return NoMemory state when memory is disabled", () => {
    const managerWithoutMemory = new MemoryManager("test-agent", false);
    const state = managerWithoutMemory.getMemoryState();

    expect(state).toEqual(
      expect.objectContaining({
        type: "NoMemory",
        resourceId: "test-agent",
        available: false,
        node_id: "memory_test-agent",
      }),
    );
  });
});

describe("MemoryManager - ConversationMemory Tests", () => {
  let mockMemory: MockMemory;
  let mockContext: OperationContext;

  beforeEach(() => {
    mockMemory = new MockMemory();
    mockContext = createMockContext();
  });

  describe("when conversationMemory is disabled (false)", () => {
    let memoryManager: MemoryManager;

    beforeEach(() => {
      memoryManager = new MemoryManager("test-agent", false);
    });

    it("should not save messages when conversationMemory is disabled", async () => {
      const message: BaseMessage = { role: "user", content: "Test message" };

      await memoryManager.saveMessage(mockContext, message, "user1", "conversation1");

      // Should not throw error and should not save anything
      expect(memoryManager.getMemory()).toBeUndefined();
    });

    it("should return empty context when conversationMemory is disabled", async () => {
      const { messages, conversationId } = await memoryManager.prepareConversationContext(
        mockContext,
        "Test input",
        "user1",
        "conversation1",
      );

      expect(messages).toEqual([]);
      expect(conversationId).toBe("conversation1");
    });

    it("should return empty step handler when conversationMemory is disabled", async () => {
      const handler = memoryManager.createStepFinishHandler(mockContext, "user1", "conversation1");

      // Should not throw when called
      await handler({
        id: "test-step",
        type: "tool_call",
        name: "test_tool",
        role: "assistant",
        content: "Test content",
      });

      // No error means the empty handler worked correctly
      expect(handler).toBeInstanceOf(Function);
    });

    it("should return NoMemory state when conversationMemory is disabled", () => {
      const state = memoryManager.getMemoryState();

      expect(state.type).toBe("NoMemory");
      expect(state.available).toBe(false);
      expect(state.resourceId).toBe("test-agent");
      expect(state.node_id).toBe("memory_test-agent");
    });

    it("should still have historyMemory available when conversationMemory is disabled", () => {
      const historyMemory = memoryManager.getHistoryMemory();
      expect(historyMemory).toBeDefined();
      expect(historyMemory.constructor.name).toBe("LibSQLStorage");
    });
  });

  describe("when conversationMemory is provided", () => {
    let memoryManager: MemoryManager;

    beforeEach(() => {
      mockMemory.setCurrentUserId("user1");
      memoryManager = new MemoryManager("test-agent", mockMemory);
    });

    it("should use provided conversationMemory instance", () => {
      const memory = memoryManager.getMemory();
      expect(memory).toBe(mockMemory);
    });

    it("should save messages using provided conversationMemory", async () => {
      const message: BaseMessage = { role: "user", content: "Test message" };

      await memoryManager.saveMessage(mockContext, message, "user1", "conversation1");

      // Give time for background operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const messages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Test message");
    });

    it("should prepare context using provided conversationMemory", async () => {
      // Add some test messages first
      await mockMemory.addMessage({ role: "user", content: "Previous message" }, "conversation1");

      const { messages, conversationId } = await memoryManager.prepareConversationContext(
        mockContext,
        "New message",
        "user1",
        "conversation1",
      );

      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Previous message");
      expect(conversationId).toBe("conversation1");
    });

    it("should create functional step handler with provided conversationMemory", async () => {
      const handler = memoryManager.createStepFinishHandler(mockContext, "user1", "conversation1");

      await handler({
        id: "test-step",
        type: "tool_call",
        name: "test_tool",
        role: "assistant",
        content: "Tool call content",
      });

      // Give time for background operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const messages = await mockMemory.getMessages({
        userId: "user1",
        conversationId: "conversation1",
      });

      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Tool call content");
      expect(messages[0].type).toBe("tool-call");
    });

    it("should return proper memory state with provided conversationMemory", () => {
      const state = memoryManager.getMemoryState();

      expect(state.type).toBe("MockMemory");
      expect(state.available).toBe(true);
      expect(state.resourceId).toBe("test-agent");
      expect(state.node_id).toBe("memory_test-agent");
    });
  });

  describe("when conversationMemory is default (undefined)", () => {
    let memoryManager: MemoryManager;

    beforeEach(() => {
      memoryManager = new MemoryManager("test-agent"); // No memory parameter
    });

    it("should create default LibSQLStorage for conversationMemory", () => {
      const memory = memoryManager.getMemory();
      expect(memory).toBeDefined();
      expect(memory?.constructor.name).toBe("LibSQLStorage");
    });

    it("should return LibSQLStorage state when using default conversationMemory", () => {
      const state = memoryManager.getMemoryState();

      expect(state.type).toBe("LibSQLStorage");
      expect(state.available).toBe(true);
      expect(state.resourceId).toBe("test-agent");
      expect(state.node_id).toBe("memory_test-agent");
    });
  });
});

describe("MemoryManager - HistoryMemory Tests", () => {
  let memoryManager: MemoryManager;
  let mockMemory: MockMemory;

  beforeEach(() => {
    mockMemory = new MockMemory();
  });

  describe("historyMemory is always available", () => {
    it("should have historyMemory when conversationMemory is disabled", () => {
      memoryManager = new MemoryManager("test-agent", false);

      const historyMemory = memoryManager.getHistoryMemory();
      expect(historyMemory).toBeDefined();
      expect(historyMemory.constructor.name).toBe("LibSQLStorage");
    });

    it("should have historyMemory when conversationMemory is provided", () => {
      memoryManager = new MemoryManager("test-agent", mockMemory);

      const historyMemory = memoryManager.getHistoryMemory();
      expect(historyMemory).toBeDefined();
      expect(historyMemory).toBe(mockMemory); // Should use same instance as conversation memory
    });

    it("should have historyMemory when using default conversationMemory", () => {
      memoryManager = new MemoryManager("test-agent");

      const historyMemory = memoryManager.getHistoryMemory();
      expect(historyMemory).toBeDefined();
      expect(historyMemory.constructor.name).toBe("LibSQLStorage");
    });
  });

  describe("historyMemory operations with mock memory", () => {
    beforeEach(() => {
      // ✅ Clean approach: Pass historyMemory as constructor parameter instead of using 'any'
      memoryManager = new MemoryManager("test-agent", mockMemory, {}, mockMemory);
    });

    it("should store history entry using historyMemory", async () => {
      const agentId = "test-agent";
      const entry = {
        id: "test-history-entry",
        timestamp: new Date(),
        status: "completed",
        input: "test input",
        output: "test output",
        usage: { totalTokens: 100 },
        events: [],
        steps: [],
      };

      await memoryManager.storeHistoryEntry(agentId, entry);

      const historyEntries = mockMemory.getHistoryEntries();
      expect(historyEntries["test-history-entry"]).toBeDefined();
      expect(historyEntries["test-history-entry"]._agentId).toBe(agentId);
      expect(historyEntries["test-history-entry"].input).toBe("test input");
    });

    it("should retrieve history entry by ID using historyMemory", async () => {
      const agentId = "test-agent";
      const entryId = "test-history-entry";

      // Store entry first
      await mockMemory.addHistoryEntry(
        entryId,
        {
          id: entryId,
          timestamp: new Date(),
          status: "completed",
          input: "test input",
          output: "test output",
        },
        agentId,
      );

      const retrievedEntry = await memoryManager.getHistoryEntryById(agentId, entryId);

      expect(retrievedEntry).toBeDefined();
      expect(retrievedEntry.id).toBe(entryId);
      expect(retrievedEntry._agentId).toBe(agentId);
    });

    it("should get all history entries for agent using historyMemory", async () => {
      const agentId = "test-agent";
      const otherAgentId = "other-agent";

      // Add entries for test agent
      await mockMemory.addHistoryEntry("entry1", { id: "entry1", input: "input1" }, agentId);
      await mockMemory.addHistoryEntry("entry2", { id: "entry2", input: "input2" }, agentId);

      // Add entry for other agent
      await mockMemory.addHistoryEntry("entry3", { id: "entry3", input: "input3" }, otherAgentId);

      const entries = await memoryManager.getAllHistoryEntries(agentId);

      expect(entries.length).toBe(2);
      expect(entries.map((e) => e.id)).toContain("entry1");
      expect(entries.map((e) => e.id)).toContain("entry2");
      expect(entries.map((e) => e.id)).not.toContain("entry3");
    });

    it("should update history entry using historyMemory", async () => {
      const agentId = "test-agent";
      const entryId = "test-history-entry";

      // Store entry first
      await mockMemory.addHistoryEntry(
        entryId,
        {
          id: entryId,
          timestamp: new Date(),
          status: "running",
          input: "test input",
          output: "",
        },
        agentId,
      );

      // Update the entry
      const updates = {
        status: "completed",
        output: "test output",
      };

      await memoryManager.updateHistoryEntry(agentId, entryId, updates);

      const historyEntries = mockMemory.getHistoryEntries();
      expect(historyEntries[entryId].status).toBe("completed");
      expect(historyEntries[entryId].output).toBe("test output");
    });

    it("should add steps to history entry using historyMemory", async () => {
      const agentId = "test-agent";
      const entryId = "test-history-entry";

      // Store entry first
      await mockMemory.addHistoryEntry(
        entryId,
        {
          id: entryId,
          timestamp: new Date(),
          status: "running",
          input: "test input",
          output: "",
        },
        agentId,
      );

      // Add steps
      const steps = [
        {
          type: "tool_call",
          name: "test-tool",
          content: "tool call content",
          arguments: { arg1: "value1" },
        },
        {
          type: "tool_result",
          name: "test-tool",
          content: "tool result content",
          arguments: {},
        },
      ];

      await memoryManager.addStepsToHistoryEntry(agentId, entryId, steps);

      const historyEntries = mockMemory.getHistoryEntries();
      expect(historyEntries[entryId].steps.length).toBe(2);
      expect(historyEntries[entryId].steps[0].type).toBe("tool_call");
      expect(historyEntries[entryId].steps[1].type).toBe("tool_result");
    });

    it("should add timeline event to history entry using historyMemory", async () => {
      const agentId = "test-agent";
      const entryId = "test-history-entry";
      const eventId = "test-timeline-event";

      // Store entry first
      await mockMemory.addHistoryEntry(
        entryId,
        {
          id: entryId,
          timestamp: new Date(),
          status: "running",
          input: "test input",
          output: "",
        },
        agentId,
      );

      // Add timeline event
      const timelineEvent: NewTimelineEvent = {
        id: eventId,
        name: "memory:write_start",
        type: "memory",
        startTime: new Date().toISOString(),
        status: "running",
        input: { test: "data" },
        output: null,
        metadata: {
          displayName: "Test Event",
          id: "test",
          agentId: agentId,
        },
        traceId: entryId,
      };

      await memoryManager.addTimelineEvent(agentId, entryId, eventId, timelineEvent);

      const timelineEvents = mockMemory.getTimelineEvents();
      expect(timelineEvents[eventId]).toBeDefined();
      expect(timelineEvents[eventId].name).toBe("memory:write_start");
      expect(timelineEvents[eventId]._agentId).toBe(agentId);
    });

    it("should not allow access to history entries from different agents", async () => {
      const agentId1 = "test-agent-1";
      const agentId2 = "test-agent-2";
      const entryId = "test-history-entry";

      // Store entry for agent1
      await mockMemory.addHistoryEntry(
        entryId,
        {
          id: entryId,
          timestamp: new Date(),
          status: "completed",
          input: "test input",
          output: "test output",
        },
        agentId1,
      );

      // Try to access with agent2 (should return undefined)
      const retrievedEntry = await memoryManager.getHistoryEntryById(agentId2, entryId);
      expect(retrievedEntry).toBeUndefined();
    });

    it("should not allow updating history entries from different agents", async () => {
      const agentId1 = "test-agent-1";
      const agentId2 = "test-agent-2";
      const entryId = "test-history-entry";

      // Store entry for agent1
      await mockMemory.addHistoryEntry(
        entryId,
        {
          id: entryId,
          timestamp: new Date(),
          status: "running",
          input: "test input",
          output: "",
        },
        agentId1,
      );

      // Try to update with agent2 (should return undefined)
      const updates = { status: "completed", output: "test output" };
      const result = await memoryManager.updateHistoryEntry(agentId2, entryId, updates);

      expect(result).toBeUndefined();

      // Verify original entry wasn't modified
      const originalEntry = await memoryManager.getHistoryEntryById(agentId1, entryId);
      expect(originalEntry.status).toBe("running");
      expect(originalEntry.output).toBe("");
    });
  });
});

describe("MemoryManager - Memory Separation Tests", () => {
  let memoryManager: MemoryManager;
  let mockConversationMemory: MockMemory;
  let mockHistoryMemory: MockMemory;
  let mockContext: OperationContext;

  beforeEach(() => {
    mockConversationMemory = new MockMemory();
    mockHistoryMemory = new MockMemory();
    mockContext = createMockContext();

    mockConversationMemory.setCurrentUserId("user1");

    // ✅ Clean approach: Pass both memories as constructor parameters instead of using 'any'
    memoryManager = new MemoryManager("test-agent", mockConversationMemory, {}, mockHistoryMemory);
  });

  it("should use separate memory instances for conversations and history", () => {
    const conversationMemory = memoryManager.getMemory();
    const historyMemory = memoryManager.getHistoryMemory();

    expect(conversationMemory).toBe(mockConversationMemory);
    expect(historyMemory).toBe(mockHistoryMemory);
    expect(conversationMemory).not.toBe(historyMemory);
  });

  it("should store conversation messages in conversationMemory only", async () => {
    const message: BaseMessage = { role: "user", content: "Conversation message" };

    await memoryManager.saveMessage(mockContext, message, "user1", "conversation1");

    // Give time for background operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check conversationMemory has the message
    const conversationMessages = await mockConversationMemory.getMessages({
      userId: "user1",
      conversationId: "conversation1",
    });
    expect(conversationMessages.length).toBe(1);
    expect(conversationMessages[0].content).toBe("Conversation message");

    // Check historyMemory doesn't have the message
    const historyMessages = await mockHistoryMemory.getMessages({
      userId: "user1",
      conversationId: "conversation1",
    });
    expect(historyMessages.length).toBe(0);
  });

  it("should store history entries in historyMemory only", async () => {
    const agentId = "test-agent";
    const entry = {
      id: "test-history-entry",
      timestamp: new Date(),
      status: "completed",
      input: "test input",
      output: "test output",
      usage: { totalTokens: 100 },
      events: [],
      steps: [],
    };

    await memoryManager.storeHistoryEntry(agentId, entry);

    // Check historyMemory has the entry
    const historyEntries = mockHistoryMemory.getHistoryEntries();
    expect(historyEntries["test-history-entry"]).toBeDefined();
    expect(historyEntries["test-history-entry"]._agentId).toBe(agentId);

    // Check conversationMemory doesn't have the entry
    const conversationEntries = mockConversationMemory.getHistoryEntries();
    expect(conversationEntries["test-history-entry"]).toBeUndefined();
  });

  it("should isolate conversation and history operations", async () => {
    const agentId = "test-agent";

    // Store a conversation message
    const message: BaseMessage = { role: "user", content: "Conversation message" };
    await memoryManager.saveMessage(mockContext, message, "user1", "conversation1");

    // Store a history entry
    const entry = {
      id: "test-history-entry",
      timestamp: new Date(),
      status: "completed",
      input: "test input",
      output: "test output",
      usage: { totalTokens: 100 },
      events: [],
      steps: [],
    };
    await memoryManager.storeHistoryEntry(agentId, entry);

    // Give time for background operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify conversation memory only has conversation data
    const conversationMessages = await mockConversationMemory.getMessages({
      userId: "user1",
      conversationId: "conversation1",
    });
    expect(conversationMessages.length).toBe(1);
    expect(conversationMessages[0].content).toBe("Conversation message");

    const conversationHistoryEntries = mockConversationMemory.getHistoryEntries();
    expect(Object.keys(conversationHistoryEntries)).toHaveLength(0);

    // Verify history memory only has history data
    const historyEntries = mockHistoryMemory.getHistoryEntries();
    expect(historyEntries["test-history-entry"]).toBeDefined();
    expect(historyEntries["test-history-entry"]._agentId).toBe(agentId);

    const historyMessages = await mockHistoryMemory.getMessages({
      userId: "user1",
      conversationId: "conversation1",
    });
    expect(historyMessages.length).toBe(0);
  });
});
