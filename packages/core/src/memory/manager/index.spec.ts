import { MemoryManager } from ".";
import type { BaseMessage } from "../../agent/providers/base/types";
import type { Memory, MemoryMessage } from "../types";
import type { OperationContext } from "../../agent/types";
import type { AgentHistoryEntry } from "../../agent/history";
import type { NewTimelineEvent } from "../../events/types";
import { AgentEventEmitter } from "../../events";

// Mock the AgentRegistry
jest.mock("../../server/registry", () => {
  const mockAgent = {
    id: "test-agent",
    name: "Test Agent",
    getHistory: jest.fn().mockReturnValue([
      {
        id: "history-1",
        status: "idle",
        events: [],
      },
    ]),
  };

  return {
    AgentRegistry: {
      getInstance: jest.fn().mockReturnValue({
        getAgent: jest.fn().mockReturnValue(mockAgent),
      }),
    },
  };
});

// Mock the AgentEventEmitter
jest.mock("../../events", () => {
  return {
    AgentEventEmitter: {
      getInstance: jest.fn().mockReturnValue({
        publishTimelineEvent: jest.fn(),
        addHistoryEvent: jest.fn(),
        emitHistoryUpdate: jest.fn(),
      }),
    },
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

  async addMessage(
    message: BaseMessage | MemoryMessage,
    userId: string,
    conversationId = "default",
  ): Promise<void> {
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
    const { userId, conversationId = "default", limit = 10 } = options;
    const key = `${userId}:${conversationId}`;
    if (!this.messages[key]) {
      return [];
    }
    return this.messages[key].slice(-limit);
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
}

describe("MemoryManager", () => {
  let memoryManager: MemoryManager;
  let mockMemory: MockMemory;
  let mockContext: OperationContext;

  beforeEach(() => {
    mockMemory = new MockMemory();
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
      await mockMemory.addMessage({ role: "user", content: "Message 1" }, "user1", "conversation1");
      await mockMemory.addMessage(
        { role: "assistant", content: "Response 1" },
        "user1",
        "conversation1",
      );
      await mockMemory.addMessage({ role: "user", content: "Message 2" }, "user1", "conversation1");
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

      // Check that conversation was created
      const conversation = await mockMemory.getConversation("conversation1");
      expect(conversation).not.toBeNull();

      // Check that message was saved
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

      // Check that messages were saved
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

      await mockMemory.addMessage(
        { role: "user", content: "Previous message 1" },
        "user1",
        "existing-conversation",
      );
      await mockMemory.addMessage(
        { role: "assistant", content: "Previous response 1" },
        "user1",
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

      // Check that the new message was saved
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
    memoryManager = new MemoryManager("test-agent", mockMemory);
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
    // Create spy for publishTimelineEvent method
    const publishTimelineEventSpy = jest.spyOn(eventEmitter, "publishTimelineEvent");

    // Trigger memory event creation by calling saveMessage
    await memoryManager.saveMessage(
      mockContext,
      { role: "user", content: "Test message" },
      "test-user",
      "test-conversation",
    );

    // Verify publishTimelineEvent was called
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
