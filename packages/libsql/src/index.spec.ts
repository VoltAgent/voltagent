import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LibSQLStorage } from ".";
import { generateTestTablePrefix } from "./test-helpers";

describe.sequential("LibSQLStorage", () => {
  let storage: LibSQLStorage;
  let testPrefix: string;

  beforeEach(async () => {
    // Generate unique table prefix for test isolation
    testPrefix = generateTestTablePrefix();

    // Create real LibSQL instance with memory database
    storage = new LibSQLStorage({
      url: ":memory:",
      tablePrefix: testPrefix,
      debug: true,
    });

    // Wait for initialization
    // @ts-expect-error - Accessing private property for testing
    await storage.initialized;

    // Setup test data
    await setupTestData();
  });

  afterEach(async () => {
    // Close the database connection
    await storage.close();
  });

  async function setupTestData() {
    // Create test conversations
    await storage.createConversation({
      id: "conversation-1",
      resourceId: "resource-1",
      userId: "user-1",
      title: "First Conversation",
      metadata: { isImportant: true },
    });

    await storage.createConversation({
      id: "conversation-2",
      resourceId: "resource-1",
      userId: "user-2",
      title: "Second Conversation",
      metadata: { isImportant: false },
    });

    // Add test messages
    await storage.addMessage(
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
        metadata: {},
      },
      "user-1",
      "conversation-1",
    );

    await storage.addMessage(
      {
        id: "msg-2",
        role: "assistant",
        parts: [{ type: "text", text: "Hi there!" }],
        metadata: {},
      },
      "user-1",
      "conversation-1",
    );

    await storage.addMessage(
      {
        id: "msg-3",
        role: "user",
        parts: [{ type: "text", text: "Different user" }],
        metadata: {},
      },
      "user-2",
      "conversation-2",
    );

    // Add test workflow data
    await storage.storeWorkflowHistory({
      id: "workflow-history-1",
      workflowName: "Test Workflow",
      workflowId: "workflow-1",
      status: "completed",
      startTime: new Date("2023-01-01T10:00:00.000Z"),
      endTime: new Date("2023-01-01T10:05:00.000Z"),
      input: { param: "value" },
      output: { result: "success" },
      metadata: { userId: "user-1" },
      userId: "user-1",
      conversationId: "conversation-1",
      createdAt: new Date("2023-01-01T10:00:00.000Z"),
      updatedAt: new Date("2023-01-01T10:05:00.000Z"),
      steps: [],
      events: [],
    });

    await storage.storeWorkflowStep({
      id: "step-1",
      workflowHistoryId: "workflow-history-1",
      stepIndex: 0,
      stepType: "agent",
      stepName: "First Step",
      stepId: "step-id-1",
      status: "completed",
      startTime: new Date("2023-01-01T10:00:00.000Z"),
      endTime: new Date("2023-01-01T10:02:00.000Z"),
      input: { step: "input" },
      output: { step: "output" },
      error: null,
      agentExecutionId: null,
      parallelIndex: null,
      parallelParentStepId: null,
      metadata: null,
      createdAt: new Date("2023-01-01T10:00:00.000Z"),
      updatedAt: new Date("2023-01-01T10:02:00.000Z"),
    });

    await storage.storeWorkflowStep({
      id: "step-2",
      workflowHistoryId: "workflow-history-1",
      stepIndex: 1,
      stepType: "func",
      stepName: "Second Step",
      stepId: "step-id-2",
      status: "completed",
      startTime: new Date("2023-01-01T10:02:00.000Z"),
      endTime: new Date("2023-01-01T10:05:00.000Z"),
      input: { step: "input2" },
      output: { step: "output2" },
      error: null,
      agentExecutionId: null,
      parallelIndex: null,
      parallelParentStepId: null,
      metadata: null,
      createdAt: new Date("2023-01-01T10:02:00.000Z"),
      updatedAt: new Date("2023-01-01T10:05:00.000Z"),
    });

    await storage.storeWorkflowTimelineEvent({
      id: "event-1",
      workflowHistoryId: "workflow-history-1",
      eventId: "event-1",
      name: "workflow_start",
      type: "workflow",
      startTime: "2023-01-01T10:00:00.000Z",
      endTime: "2023-01-01T10:00:01.000Z",
      status: "completed",
      level: "INFO",
      input: null,
      output: null,
      statusMessage: null,
      metadata: null,
      traceId: null,
      parentEventId: null,
      eventSequence: null,
      createdAt: new Date("2023-01-01T10:00:00.000Z"),
    });

    await storage.storeWorkflowTimelineEvent({
      id: "event-2",
      workflowHistoryId: "workflow-history-1",
      eventId: "event-2",
      name: "step_execution",
      type: "workflow-step",
      startTime: "2023-01-01T10:01:00.000Z",
      endTime: "2023-01-01T10:03:00.000Z",
      status: "completed",
      level: "INFO",
      input: null,
      output: null,
      statusMessage: null,
      metadata: null,
      traceId: null,
      parentEventId: null,
      eventSequence: null,
      createdAt: new Date("2023-01-01T10:01:00.000Z"),
    });
  }

  describe("Message Operations", () => {
    describe("addMessage", () => {
      it("should add a message and return void", async () => {
        const message: UIMessage = {
          id: "new-message-id",
          role: "user",
          parts: [{ type: "text", text: "Test message" }],
          metadata: {},
        };

        const result = await storage.addMessage(message, "user-1", "conversation-1");
        expect(result).toBeUndefined();

        // Verify message was added
        const messages = await storage.getConversationMessages("conversation-1");
        expect(messages).toContainEqual(
          expect.objectContaining({
            id: "new-message-id",
            parts: expect.arrayContaining([
              expect.objectContaining({
                type: "text",
                text: "Test message",
              }),
            ]),
          }),
        );
      });

      it("should handle messages without explicit user or conversation IDs", async () => {
        const message: UIMessage = {
          id: "another-message-id",
          role: "user",
          parts: [{ type: "text", text: "Default IDs" }],
          metadata: {},
        };

        await expect(
          storage.addMessage(message, "user-1", "conversation-1"),
        ).resolves.not.toThrow();
      });
    });

    describe("getMessages", () => {
      it("should retrieve messages for a specific user and conversation", async () => {
        const messages = await storage.getMessages("user-1", "conversation-1");

        expect(messages).toHaveLength(2);
        expect(messages).toEqual([
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({ type: "text", text: "Hello" }),
            ]),
          }),
          expect.objectContaining({
            role: "assistant",
            parts: expect.arrayContaining([
              expect.objectContaining({ type: "text", text: "Hi there!" }),
            ]),
          }),
        ]);
      });

      it("should filter messages by role", async () => {
        const userMessages = await storage.getMessages("user-1", "conversation-1", {
          roles: ["user"],
        });

        expect(userMessages).toHaveLength(1);
        expect(userMessages[0].role).toBe("user");
        expect(userMessages[0].parts[0]).toEqual(
          expect.objectContaining({ type: "text", text: "Hello" }),
        );
      });

      it("should return empty array for unknown user or conversation", async () => {
        const messages = await storage.getMessages("unknown-user", "conversation-1");

        expect(messages).toEqual([]);
      });
    });

    describe("clearMessages", () => {
      it("should clear messages for a specific conversation", async () => {
        await storage.clearMessages("user-1", "conversation-1");

        const messages = await storage.getMessages("user-1", "conversation-1");

        expect(messages).toEqual([]);
      });

      it("should handle clearing messages for a specific user", async () => {
        await storage.clearMessages("user-1");

        const messages1 = await storage.getMessages("user-1", "conversation-1");
        const messages2 = await storage.getMessages("user-1", "conversation-2");

        expect(messages1).toEqual([]);
        expect(messages2).toEqual([]);
      });
    });

    describe("Message Filtering", () => {
      it("should retrieve all messages when no filter", async () => {
        const messages = await storage.getMessages("user-1", "conversation-1");

        expect(messages).toHaveLength(2);
        expect(messages.every((m) => m.parts.length > 0)).toBe(true);
      });

      it("should filter messages by role", async () => {
        const messages = await storage.getMessages("user-1", "conversation-1", {
          roles: ["assistant"],
        });

        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe("assistant");
      });

      it("should handle limit option", async () => {
        const messages = await storage.getMessages("user-1", "conversation-1", {
          limit: 1,
        });

        expect(messages).toHaveLength(1);
      });

      it("should return all messages when limit is undefined", async () => {
        const messages = await storage.getMessages("user-1", "conversation-1");

        expect(messages.length).toBeGreaterThan(0);
      });
    });

    describe("getConversationMessages", () => {
      it("should retrieve messages for a specific conversation", async () => {
        const messages = await storage.getConversationMessages("conversation-1");

        expect(messages).toHaveLength(2);
        expect(messages).toEqual([
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({ type: "text", text: "Hello" }),
            ]),
          }),
          expect.objectContaining({
            role: "assistant",
            parts: expect.arrayContaining([
              expect.objectContaining({ type: "text", text: "Hi there!" }),
            ]),
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
        const conversation = await storage.createConversation({
          id: "new-conv",
          resourceId: "resource-1",
          userId: "user-1",
          title: "New Conversation",
          metadata: {},
        });

        expect(conversation).toEqual(
          expect.objectContaining({
            id: "new-conv",
            resourceId: "resource-1",
            userId: "user-1",
            title: "New Conversation",
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
        expect(conversations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: "conversation-1",
              resourceId: "resource-1",
              title: "First Conversation",
            }),
            expect.objectContaining({
              id: "conversation-2",
              resourceId: "resource-1",
              title: "Second Conversation",
            }),
          ]),
        );
      });

      it("should return empty array for resource with no conversations", async () => {
        const conversations = await storage.getConversations("non-existent-resource");
        expect(conversations).toEqual([]);
      });
    });

    describe("updateConversation", () => {
      it("should update conversation metadata", async () => {
        const updated = await storage.updateConversation("conversation-1", {
          metadata: { isImportant: false, newField: "value" },
        });

        expect(updated.metadata).toEqual({
          isImportant: false,
          newField: "value",
        });
      });

      it("should update conversation title", async () => {
        const updated = await storage.updateConversation("conversation-1", {
          title: "Updated Title",
        });

        expect(updated.title).toBe("Updated Title");
      });
    });

    describe("deleteConversation", () => {
      it("should delete a conversation", async () => {
        await storage.deleteConversation("conversation-1");

        const conversation = await storage.getConversation("conversation-1");
        expect(conversation).toBeNull();
      });
    });
  });

  describe("User-Specific Conversation Operations", () => {
    describe("queryConversations", () => {
      it("should query conversations by user ID", async () => {
        const conversations = await storage.queryConversations({
          userId: "user-1",
        });

        expect(conversations).toHaveLength(1);
        expect(conversations[0].userId).toBe("user-1");
      });

      it("should query conversations by user ID and resource ID", async () => {
        const conversations = await storage.queryConversations({
          userId: "user-1",
          resourceId: "resource-1",
        });

        expect(conversations).toHaveLength(1);
        expect(conversations[0].userId).toBe("user-1");
        expect(conversations[0].resourceId).toBe("resource-1");
      });

      it("should handle pagination in query", async () => {
        const conversations = await storage.queryConversations({
          userId: "user-1",
          limit: 1,
          offset: 0,
        });

        expect(conversations).toHaveLength(1);
      });
    });
  });

  describe("Workflow Operations", () => {
    describe("Workflow History Operations", () => {
      it("should store a workflow history entry", async () => {
        const entry = {
          id: "new-workflow-history",
          workflowName: "New Workflow",
          workflowId: "workflow-2",
          status: "running" as const,
          startTime: new Date(),
          input: { test: "data" },
          metadata: { custom: "value" },
          steps: [],
          events: [],
        };

        await expect(storage.storeWorkflowHistory(entry)).resolves.not.toThrow();

        const stored = await storage.getWorkflowHistory("new-workflow-history");
        expect(stored).toEqual(
          expect.objectContaining({
            id: "new-workflow-history",
            workflowName: "New Workflow",
            status: "running",
          }),
        );
      });

      it("should retrieve a workflow history entry by ID", async () => {
        const history = await storage.getWorkflowHistory("workflow-history-1");

        expect(history).toEqual(
          expect.objectContaining({
            id: "workflow-history-1",
            workflowName: "Test Workflow",
            workflowId: "workflow-1",
            status: "completed",
          }),
        );
      });

      it("should retrieve workflow histories for a specific workflow ID", async () => {
        const histories = await storage.getWorkflowHistoryByWorkflowId("workflow-1");

        expect(histories).toHaveLength(1);
        expect(histories[0].workflowId).toBe("workflow-1");
      });
    });

    describe("Workflow Steps Operations", () => {
      it("should retrieve a workflow step by ID", async () => {
        const step = await storage.getWorkflowStep("step-1");

        expect(step).toEqual(
          expect.objectContaining({
            id: "step-1",
            workflowHistoryId: "workflow-history-1",
            stepIndex: 0,
            stepName: "First Step",
          }),
        );
      });

      it("should retrieve workflow steps for a workflow history", async () => {
        const steps = await storage.getWorkflowSteps("workflow-history-1");

        expect(steps).toHaveLength(2);
        expect(steps[0].stepIndex).toBe(0);
        expect(steps[1].stepIndex).toBe(1);
      });
    });

    describe("Workflow Timeline Events Operations", () => {
      it("should retrieve a workflow timeline event by ID", async () => {
        const event = await storage.getWorkflowTimelineEvent("event-1");

        expect(event).toEqual(
          expect.objectContaining({
            id: "event-1",
            name: "workflow_start",
            type: "workflow",
          }),
        );
      });

      it("should retrieve timeline events for a workflow history", async () => {
        const events = await storage.getWorkflowTimelineEvents("workflow-history-1");

        expect(events).toHaveLength(2);
        expect(events[0].name).toBe("workflow_start");
        expect(events[1].name).toBe("step_execution");
      });
    });

    describe("Query Operations", () => {
      it("should retrieve all workflow IDs", async () => {
        const workflowIds = await storage.getAllWorkflowIds();

        expect(workflowIds).toEqual(expect.arrayContaining(["workflow-1"]));
      });
    });

    describe("Cleanup Operations", () => {
      it("should cleanup old workflow histories beyond limit", async () => {
        const deletedCount = await storage.cleanupOldWorkflowHistories("workflow-1", 0);
        expect(deletedCount).toBe(1);

        // Verify cleanup worked
        const histories = await storage.getWorkflowHistoryByWorkflowId("workflow-1");
        expect(histories).toHaveLength(0);
      });

      it("should return 0 when no cleanup needed", async () => {
        const deletedCount = await storage.cleanupOldWorkflowHistories("workflow-1", 10);
        expect(deletedCount).toBe(0);

        // Verify nothing was deleted
        const histories = await storage.getWorkflowHistoryByWorkflowId("workflow-1");
        expect(histories).toHaveLength(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // Force an error by closing the connection
      await storage.close();

      await expect(storage.getConversation("any-id")).rejects.toThrow();
    });

    it("should close the database connection", async () => {
      await expect(storage.close()).resolves.not.toThrow();
    });
  });
});
