import { Agent } from "@voltagent/core";
import type {
  BaseMessage,
  LLMProvider,
  MessageRole,
  OperationContext,
  ProviderTextResponse,
  StepWithContent,
} from "@voltagent/core";
import { z } from "zod";
import { convertToUIMessages } from "./index";
import type { UIMessage } from "./types";

// Mock types for testing
type MockModelType = { modelId: string; [key: string]: unknown };

// Mock Provider implementation for testing
class MockProvider implements LLMProvider<MockModelType> {
  generateTextCalls = 0;
  lastMessages: BaseMessage[] = [];

  constructor(private model: MockModelType) {}

  toMessage(message: BaseMessage): BaseMessage {
    return message;
  }

  fromMessage(message: BaseMessage): BaseMessage {
    return message;
  }

  getModelIdentifier(model: MockModelType): string {
    return model.modelId;
  }

  async generateText(): Promise<
    ProviderTextResponse<unknown> & { operationContext: OperationContext }
  > {
    this.generateTextCalls++;
    return {
      text: "Hello, I am a test agent!",
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      toolCalls: [],
      toolResults: [],
      finishReason: "stop",
      operationContext: {
        historyEntry: {
          input: "Hello!",
          output: "Hello, I am a test agent!",
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          steps: [],
        },
        conversationSteps: [],
        userContext: new Map(),
      },
    };
  }

  async streamText(): Promise<any> {
    throw new Error("Not implemented");
  }

  async generateObject(): Promise<any> {
    throw new Error("Not implemented");
  }

  async streamObject(): Promise<any> {
    throw new Error("Not implemented");
  }
}

describe("convertToUIMessages", () => {
  let agent: Agent<{ llm: LLMProvider<MockModelType> }>;
  let mockModel: MockModelType;
  let mockProvider: LLMProvider<MockModelType>;

  beforeEach(() => {
    mockModel = { modelId: "mock-model-id" };
    mockProvider = new MockProvider(mockModel);

    agent = new Agent({
      id: "test-agent",
      name: "Test Agent",
      description: "A test agent for unit testing",
      model: mockModel,
      llm: mockProvider,
      instructions: "A helpful AI assistant",
    });
  });

  describe("string input", () => {
    it("should convert string input to UI messages", async () => {
      const result = await agent.generateText("Hello!");
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages).toHaveLength(2); // System message + User message
      expect(uiMessages[0].role).toBe("system");
      expect(uiMessages[1].role).toBe("user");
      expect(uiMessages[1].content).toBe("Hello!");
    });
  });

  describe("array input", () => {
    it("should convert array of messages to UI messages", async () => {
      const messages: BaseMessage[] = [
        { role: "user" as MessageRole, content: "Hello!" },
        { role: "assistant" as MessageRole, content: "Hi there!" },
        { role: "user" as MessageRole, content: "How are you?" },
      ];

      const result = await agent.generateText(messages);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages).toHaveLength(4); // System message + 3 input messages
      expect(uiMessages[0].role).toBe("system");
      expect(uiMessages[1].role).toBe("user");
      expect(uiMessages[1].content).toBe("Hello!");
      expect(uiMessages[2].role).toBe("assistant");
      expect(uiMessages[2].content).toBe("Hi there!");
      expect(uiMessages[3].role).toBe("user");
      expect(uiMessages[3].content).toBe("How are you?");
    });
  });

  describe("single message input", () => {
    it("should convert single message to UI messages", async () => {
      const message: BaseMessage = { role: "user" as MessageRole, content: "Hello!" };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages).toHaveLength(2); // System message + User message
      expect(uiMessages[0].role).toBe("system");
      expect(uiMessages[1].role).toBe("user");
      expect(uiMessages[1].content).toBe("Hello!");
    });
  });

  describe("message parts", () => {
    it("should handle text parts correctly", async () => {
      const message: BaseMessage = {
        role: "user" as MessageRole,
        content: [{ type: "text", text: "Hello!" }],
      };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].parts).toHaveLength(1);
      expect(uiMessages[1].parts[0]).toEqual({
        type: "text",
        text: "Hello!",
      });
    });

    it("should handle image parts correctly", async () => {
      const message: BaseMessage = {
        role: "user" as MessageRole,
        content: [
          {
            type: "image",
            image: Buffer.from("test-image"),
            mimeType: "image/png",
          },
        ],
      };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].parts).toHaveLength(1);
      expect(uiMessages[1].parts[0]).toEqual({
        type: "file",
        data: Buffer.from("test-image").toString(),
        mimeType: "image/png",
      });
    });

    it("should handle file parts correctly", async () => {
      const message: BaseMessage = {
        role: "user" as MessageRole,
        content: [
          {
            type: "file",
            data: Buffer.from("test-file"),
            mimeType: "application/pdf",
          },
        ],
      };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].parts).toHaveLength(1);
      expect(uiMessages[1].parts[0]).toEqual({
        type: "file",
        data: Buffer.from("test-file").toString(),
        mimeType: "application/pdf",
      });
    });
  });

  describe("tool calls", () => {
    it("should handle tool calls in steps", async () => {
      const mockTool = {
        id: "test-tool",
        name: "test-tool",
        description: "A test tool",
        parameters: z.object({}),
        execute: async () => "tool result",
      };

      agent.addItems([mockTool]);

      const result = await agent.generateText("Use the test tool");
      const uiMessages = convertToUIMessages(result.operationContext);

      // Find the assistant message with tool calls
      const assistantMessage = uiMessages.find(
        (msg) =>
          msg.role === "assistant" &&
          Array.isArray(msg.content) &&
          msg.content.some((part) => part.type === "tool-call"),
      );

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toContainEqual(
        expect.objectContaining({
          type: "tool-call",
          toolName: "test-tool",
        }),
      );
    });
  });

  describe("version handling", () => {
    it("should throw error for v5 version", () => {
      const result = agent.generateText("Hello!");
      expect(() => convertToUIMessages(result.operationContext, { version: "v5" })).toThrow(
        "V5 is not supported yet",
      );
    });

    it("should use v4 by default", async () => {
      const result = await agent.generateText("Hello!");
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages).toBeInstanceOf(Array);
      expect(uiMessages[0]).toHaveProperty("role");
      expect(uiMessages[0]).toHaveProperty("content");
    });
  });

  describe("message IDs", () => {
    it("should generate IDs for messages without IDs", async () => {
      const message: BaseMessage = { role: "user" as MessageRole, content: "Hello!" };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].id).toBeDefined();
      expect(typeof uiMessages[1].id).toBe("string");
    });

    it("should preserve existing message IDs", async () => {
      const message: BaseMessage = {
        role: "user" as MessageRole,
        content: "Hello!",
        id: "custom-id",
      };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].id).toBe("custom-id");
    });
  });

  describe("createdAt timestamps", () => {
    it("should add createdAt timestamp if not present", async () => {
      const message: BaseMessage = { role: "user" as MessageRole, content: "Hello!" };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].createdAt).toBeInstanceOf(Date);
    });

    it("should preserve existing createdAt timestamp", async () => {
      const customDate = new Date("2024-01-01");
      const message: BaseMessage = {
        role: "user" as MessageRole,
        content: "Hello!",
        createdAt: customDate,
      };
      const result = await agent.generateText([message]);
      const uiMessages = convertToUIMessages(result.operationContext);

      expect(uiMessages[1].createdAt).toEqual(customDate);
    });
  });
});
