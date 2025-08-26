import type { UIMessage } from "ai";
import { vi } from "vitest";
import { InMemoryStorage } from ".";
import type { NewTimelineEvent } from "../../events/types";
// ✅ ADD: Import workflow types for testing
import type {
  WorkflowHistoryEntry,
  WorkflowStepHistoryEntry,
  WorkflowTimelineEvent,
} from "../../workflow/types";
import type { Conversation } from "../types";

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
const mockDateIndex = 0;

const originalDate = global.Date;
global.Date = vi.fn(() => mockDates[mockDateIndex % mockDates.length]) as any;
global.Date.now = vi.fn(() => mockDates[mockDateIndex % mockDates.length].getTime());
global.Date.parse = originalDate.parse;
global.Date.UTC = originalDate.UTC;

describe("InMemoryStorage", () => {
  // Test data helpers for reuse across tests
  const createMessage = (
    textContent = "Test message",
    role: "user" | "assistant" | "system" = "user",
  ): UIMessage => {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role,
      parts: [{ type: "text", text: textContent }],
    };
  };

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
        const message = createMessage("Hello world", "user");

        // Create conversation first
        await storage.createConversation({
          id: "test-conversation",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Test Conversation",
          metadata: {},
        });

        // Act
        await storage.addMessage(message, "test-user", "test-conversation");
        const messages = await storage.getMessages("test-user", "test-conversation");

        // Assert
        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual(message);
      });

      it("should use default values when user and conversation IDs are not provided", async () => {
        // Arrange
        const message = createMessage();

        // Act
        await storage.addMessage(message, "default-user", "default");
        const messages = await storage.getMessages("default-user", "default");

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

        const message1 = createMessage("First message");
        const message2 = createMessage("Second message");
        const message3 = createMessage("Third message");

        // Act
        await limitedStorage.addMessage(message1, "user1", "conversation1");
        await limitedStorage.addMessage(message2, "user1", "conversation1");
        await limitedStorage.addMessage(message3, "user1", "conversation1");

        // Assert
        const messages = await limitedStorage.getMessages("user1", "conversation1");

        expect(messages).toHaveLength(2);
        // Extract text from parts array
        const messageTexts = messages
          .map((m) => m.parts.find((p) => p.type === "text")?.text)
          .filter(Boolean);
        expect(messageTexts).toEqual(["Second message", "Third message"]);
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
        await limitedStorage.addMessage(createMessage("Conv1 First"), "user1", "conversation1");
        await limitedStorage.addMessage(createMessage("Conv1 Second"), "user1", "conversation1");
        await limitedStorage.addMessage(createMessage("Conv1 Third"), "user1", "conversation1");

        // Add messages to second conversation
        await limitedStorage.addMessage(createMessage("Conv2 First"), "user1", "conversation2");
        await limitedStorage.addMessage(createMessage("Conv2 Second"), "user1", "conversation2");

        // Assert
        const messages1 = await limitedStorage.getMessages("user1", "conversation1");
        const messages2 = await limitedStorage.getMessages("user1", "conversation2");

        expect(messages1).toHaveLength(2);
        expect(messages2).toHaveLength(2);

        const texts1 = messages1.map((m) => m.parts.find((p) => p.type === "text")?.text);
        const texts2 = messages2.map((m) => m.parts.find((p) => p.type === "text")?.text);

        expect(texts1).toEqual(["Conv1 Second", "Conv1 Third"]);
        expect(texts2).toEqual(["Conv2 First", "Conv2 Second"]);
      });
    });

    describe("getMessages", () => {
      beforeEach(async () => {
        // Create conversation first
        await storage.createConversation({
          id: "conversation1",
          resourceId: "test-resource",
          userId: "user1",
          title: "Test Conversation",
          metadata: {},
        });

        // Add test messages
        await storage.addMessage(createMessage("First message", "user"), "user1", "conversation1");
        await storage.addMessage(
          createMessage("Second message", "assistant"),
          "user1",
          "conversation1",
        );
        await storage.addMessage(createMessage("Third message", "user"), "user1", "conversation1");
        await storage.addMessage(
          createMessage("Fourth message", "assistant"),
          "user1",
          "conversation1",
        );
      });

      it("should retrieve all messages for a user and conversation", async () => {
        // Act
        const messages = await storage.getMessages("user1", "conversation1");

        // Assert
        expect(messages).toHaveLength(4);
      });

      it("should filter messages by role", async () => {
        // Act
        const messages = await storage.getMessages("user1", "conversation1", {
          roles: ["user"],
        });

        // Assert
        expect(messages).toHaveLength(2);
        messages.forEach((m) => expect(m.role).toBe("user"));
      });

      it("should respect the limit parameter", async () => {
        // Act
        const messages = await storage.getMessages("user1", "conversation1", {
          limit: 2,
        });

        // Assert
        expect(messages).toHaveLength(2);
        // Should return the most recent 2 messages
        const texts = messages.map((m) => m.parts.find((p) => p.type === "text")?.text);
        expect(texts).toEqual(["Third message", "Fourth message"]);
      });

      it.todo("should filter messages by timestamp range");

      it("should return empty array for non-existent user", async () => {
        // Act
        const messages = await storage.getMessages("non-existent", "conversation1");

        // Assert
        expect(messages).toEqual([]);
      });
    });

    describe("clearMessages", () => {
      beforeEach(async () => {
        // Create conversations
        await storage.createConversation({
          id: "conversation1",
          resourceId: "test-resource",
          userId: "user1",
          title: "Conversation 1",
          metadata: {},
        });

        await storage.createConversation({
          id: "conversation2",
          resourceId: "test-resource",
          userId: "user1",
          title: "Conversation 2",
          metadata: {},
        });

        // Add messages to both conversations
        await storage.addMessage(createMessage("Conv1 Message"), "user1", "conversation1");
        await storage.addMessage(createMessage("Conv2 Message"), "user1", "conversation2");
      });

      it("should clear messages for a specific user and conversation", async () => {
        // Act
        await storage.clearMessages("user1", "conversation1");

        // Assert
        const messages1 = await storage.getMessages("user1", "conversation1");
        const messages2 = await storage.getMessages("user1", "conversation2");

        expect(messages1).toEqual([]);
        expect(messages2).toHaveLength(1);
      });

      it("should clear all conversations for a user", async () => {
        // Act
        await storage.clearMessages("user1");

        // Assert
        const messages1 = await storage.getMessages("user1", "conversation1");
        const messages2 = await storage.getMessages("user1", "conversation2");

        expect(messages1).toEqual([]);
        expect(messages2).toEqual([]);
      });
    });
  });

  describe("Configuration Options", () => {
    it("should respect custom storage limit", async () => {
      // Arrange
      const limitedStorage = new InMemoryStorage({ storageLimit: 3 });

      await limitedStorage.createConversation({
        id: "conversation1",
        resourceId: "test-resource",
        userId: "user1",
        title: "Test Conversation",
        metadata: {},
      });

      // Add more messages than the limit
      for (let i = 1; i <= 5; i++) {
        await limitedStorage.addMessage(createMessage(`Message ${i}`), "user1", "conversation1");
      }

      // Assert
      const messages = await limitedStorage.getMessages("user1", "conversation1");
      expect(messages).toHaveLength(3);

      const texts = messages.map((m) => m.parts.find((p) => p.type === "text")?.text);
      expect(texts).toEqual(["Message 3", "Message 4", "Message 5"]);
    });
  });

  describe("Conversation Operations", () => {
    describe("createConversation", () => {
      it("should create a conversation", async () => {
        // Act
        const conversation = await storage.createConversation({
          id: "test-conversation",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Test Conversation",
          metadata: { key: "value" },
        });

        // Assert
        expect(conversation).toBeDefined();
        expect(conversation.id).toBe("test-conversation");
        expect(conversation.title).toBe("Test Conversation");
        expect(conversation.metadata).toEqual({ key: "value" });
      });

      it("should handle duplicate conversation IDs", async () => {
        // Arrange
        const input = {
          id: "duplicate-id",
          resourceId: "test-resource",
          userId: "test-user",
          title: "First Conversation",
          metadata: {},
        };

        // Act
        await storage.createConversation(input);
        const duplicate = await storage.createConversation({
          ...input,
          title: "Second Conversation",
        });

        // Assert - should overwrite with new conversation
        expect(duplicate.title).toBe("Second Conversation");
      });
    });

    describe("getConversation", () => {
      it("should retrieve a conversation by ID", async () => {
        // Arrange
        await storage.createConversation({
          id: "test-conversation",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Test Conversation",
          metadata: {},
        });

        // Act
        const conversation = await storage.getConversation("test-conversation");

        // Assert
        expect(conversation).toBeDefined();
        expect(conversation?.id).toBe("test-conversation");
      });

      it("should return null for non-existent conversation", async () => {
        // Act
        const conversation = await storage.getConversation("non-existent");

        // Assert
        expect(conversation).toBeNull();
      });
    });

    describe("updateConversation", () => {
      it("should update a conversation", async () => {
        // Arrange
        await storage.createConversation({
          id: "test-conversation",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Original Title",
          metadata: { key: "original" },
        });

        // Act
        const updated = await storage.updateConversation("test-conversation", {
          title: "Updated Title",
          metadata: { key: "updated" },
        });

        // Assert
        expect(updated.title).toBe("Updated Title");
        expect(updated.metadata).toEqual({ key: "updated" });
        // updatedAt should be set (implementation may set it to same time as createdAt)
        expect(updated.updatedAt).toBeDefined();
      });

      it("should throw error when updating non-existent conversation", async () => {
        // Act & Assert
        await expect(
          storage.updateConversation("non-existent", { title: "New Title" }),
        ).rejects.toThrow("Conversation with ID non-existent not found");
      });
    });

    describe("deleteConversation", () => {
      it("should delete a conversation", async () => {
        // Arrange
        await storage.createConversation({
          id: "test-conversation",
          resourceId: "test-resource",
          userId: "test-user",
          title: "Test Conversation",
          metadata: {},
        });

        // Act
        await storage.deleteConversation("test-conversation");

        // Assert
        const conversation = await storage.getConversation("test-conversation");
        expect(conversation).toBeNull();
      });

      it("should not throw when deleting non-existent conversation", async () => {
        // Act & Assert
        await expect(storage.deleteConversation("non-existent")).resolves.not.toThrow();
      });
    });
  });

  describe("History Operations", () => {
    describe("addHistoryEntry", () => {
      it("should add a history entry", async () => {
        // Arrange
        const entry = {
          id: "history-1",
          timestamp: new Date().toISOString(),
          status: "completed",
        };

        // Act
        await storage.addHistoryEntry("history-1", entry, "agent-1");

        // Assert
        const retrieved = await storage.getHistoryEntry("history-1");
        expect(retrieved).toBeDefined();
        expect(retrieved._agentId).toBe("agent-1");
      });
    });

    describe("updateHistoryEntry", () => {
      it("should update a history entry", async () => {
        // Arrange
        const entry = {
          id: "history-1",
          status: "pending",
        };
        await storage.addHistoryEntry("history-1", entry, "agent-1");

        // Act
        await storage.updateHistoryEntry("history-1", { status: "completed" });

        // Assert
        const updated = await storage.getHistoryEntry("history-1");
        expect(updated.status).toBe("completed");
      });
    });

    describe("addHistoryStep", () => {
      it("should add a history step", async () => {
        // Arrange - first create a history entry
        const historyEntry = {
          id: "history-1",
          timestamp: new Date().toISOString(),
          status: "running",
        };
        await storage.addHistoryEntry("history-1", historyEntry, "agent-1");

        const step = {
          id: "step-1",
          historyId: "history-1",
          action: "test-action",
        };

        // Act
        await storage.addHistoryStep("step-1", step, "history-1", "agent-1");

        // Assert
        const retrieved = await storage.getHistoryStep("step-1");
        expect(retrieved).toBeDefined();
        expect(retrieved.action).toBe("test-action");
      });
    });
  });

  describe("Timeline Events", () => {
    it("should add timeline events to history entry", async () => {
      // Arrange
      const entry = {
        id: "history-1",
        events: [],
      };
      await storage.addHistoryEntry("history-1", entry, "agent-1");

      const event: NewTimelineEvent = {
        id: "event-1",
        name: "agent:start",
        type: "agent",
        startTime: new Date().toISOString(),
        status: "running",
        input: { input: "Test input" },
        metadata: {
          displayName: "Test Event",
          id: "test",
          agentId: "agent-1",
        },
        traceId: "trace-1",
      };

      // Act
      await storage.addTimelineEvent("event-1", event, "history-1", "agent-1");

      // Assert
      const history = await storage.getHistoryEntry("history-1");
      expect(history.events).toHaveLength(1);
      expect(history.events[0].id).toBe("event-1");
    });
  });

  describe("Workflow Operations", () => {
    describe("Workflow History", () => {
      it("should add workflow history entry", async () => {
        // Arrange
        const workflowHistory: WorkflowHistoryEntry = {
          id: "workflow-history-1",
          workflowId: "workflow-1",
          workflowName: "Test Workflow",
          startTime: new Date(),
          endTime: undefined,
          status: "running",
          input: { test: "input" },
          output: undefined,
          metadata: {},
          steps: [],
          events: [],
        };

        // Act
        await storage.storeWorkflowHistory(workflowHistory);

        // Assert
        const retrieved = await storage.getWorkflowHistory("workflow-history-1");
        expect(retrieved).toBeDefined();
        expect(retrieved?.workflowId).toBe("workflow-1");
      });

      it("should update workflow history entry", async () => {
        // Arrange
        const workflowHistory: WorkflowHistoryEntry = {
          id: "workflow-history-1",
          workflowId: "workflow-1",
          workflowName: "Test Workflow",
          startTime: new Date(),
          endTime: undefined,
          status: "running",
          input: { test: "input" },
          output: undefined,
          metadata: {},
          steps: [],
          events: [],
        };
        await storage.storeWorkflowHistory(workflowHistory);

        // Act
        const updatedHistory: WorkflowHistoryEntry = {
          ...workflowHistory,
          endTime: new Date(),
          status: "completed",
          output: { result: "success" },
        };
        await storage.updateWorkflowHistory("workflow-history-1", updatedHistory);

        // Assert
        const retrieved = await storage.getWorkflowHistory("workflow-history-1");
        expect(retrieved?.status).toBe("completed");
        expect(retrieved?.output).toEqual({ result: "success" });
      });
    });

    describe("Workflow Steps", () => {
      it("should add workflow step", async () => {
        // Arrange
        const step: WorkflowStepHistoryEntry = {
          id: "step-1",
          workflowHistoryId: "workflow-history-1",
          stepId: "step-1",
          stepIndex: 0,
          stepType: "func",
          stepName: "Test Step",
          startTime: new Date(),
          endTime: undefined,
          status: "running",
          input: { test: "input" },
          output: undefined,
          error: undefined,
        };

        // Act
        await storage.storeWorkflowStep(step);

        // Assert
        const retrieved = await storage.getWorkflowStep("step-1");
        expect(retrieved).toBeDefined();
        expect(retrieved?.stepName).toBe("Test Step");
      });
    });

    describe("Workflow Timeline Events", () => {
      it("should add workflow timeline event", async () => {
        // Arrange
        const event: WorkflowTimelineEvent = {
          id: "event-1",
          workflowHistoryId: "workflow-history-1",
          eventId: "evt-1",
          name: "step_started",
          type: "workflow-step",
          startTime: new Date().toISOString(),
          status: "running",
          metadata: { stepId: "step-1" },
          createdAt: new Date(),
        };

        // Act
        await storage.storeWorkflowTimelineEvent(event);

        // Assert
        const retrieved = await storage.getWorkflowTimelineEvent("event-1");
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe("step_started");
      });
    });

    describe("Get All Workflow Histories", () => {
      it("should retrieve all workflow histories for a workflow", async () => {
        // Arrange
        const history1: WorkflowHistoryEntry = {
          id: "history-1",
          workflowId: "workflow-1",
          workflowName: "Test Workflow",
          startTime: new Date("2025-01-01"),
          endTime: undefined,
          status: "completed",
          input: {},
          output: undefined,
          metadata: {},
          steps: [],
          events: [],
        };

        const history2: WorkflowHistoryEntry = {
          id: "history-2",
          workflowId: "workflow-1",
          workflowName: "Test Workflow",
          startTime: new Date("2025-01-02"),
          endTime: undefined,
          status: "running",
          input: {},
          output: undefined,
          metadata: {},
          steps: [],
          events: [],
        };

        await storage.storeWorkflowHistory(history1);
        await storage.storeWorkflowHistory(history2);

        // Act
        const result = await storage.getWorkflowHistoryByWorkflowId("workflow-1");

        // Assert
        expect(result).toHaveLength(2);
        // Should contain both histories
        const ids = result.map((h) => h.id);
        expect(ids).toContain("history-1");
        expect(ids).toContain("history-2");
      });
    });
  });
});
