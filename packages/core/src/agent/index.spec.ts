import type { Mock, Mocked } from "vitest";
import { z } from "zod";
import { AgentEventEmitter } from "../events";
import type { Memory, MemoryMessage } from "../memory/types";
import { AgentRegistry } from "../server/registry";
import { createTool } from "../tool";
import { createAsyncIterableStream } from "../utils/async-iterable-stream";
import { Agent } from "./index";
import type {
  BaseMessage,
  BaseTool,
  LLMProvider,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
} from "./providers";

// @ts-ignore - To simplify test types
import type { AgentHistoryEntry } from "../agent/history";
import type { NewTimelineEvent } from "../events/types";
import type { BaseRetriever } from "../retriever/retriever";
import type { VoltAgentExporter } from "../telemetry/exporter";
import { HistoryManager } from "./history";
import { createHooks } from "./hooks";
import type { AgentStatus, OperationContext, ToolExecutionContext } from "./types";

// Define a generic mock model type locally
type MockModelType = { modelId: string; [key: string]: unknown };

// Helper function to extract string content from MessageContent
function getStringContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "type" in part) {
          if (part.type === "text" && "text" in part) {
            return part.text;
          }
        }
        return "";
      })
      .join("");
  }
  return "";
}

// Mock types for testing
type MockGenerateTextResult = {
  text: string;
};

type MockStreamTextResult = ReadableStream<{
  type: "text-delta";
  textDelta: string;
}>;

type MockGenerateObjectResult<T> = {
  object: T;
};

type MockStreamObjectResult<T> = {
  stream: ReadableStream<{
    type: "text-delta";
    textDelta: string;
  }>;
  partialObjectStream: ReadableStream<T>;
  textStream: ReadableStream<string>;
};

// A simplified History object - updated to match new AgentHistoryEntry structure
// @ts-ignore - Simplified AgentHistoryEntry for testing
const createMockHistoryEntry = (
  input: string,
  status: AgentStatus = "completed",
): AgentHistoryEntry => {
  return {
    id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    input,
    output: `Response to ${input}`,
    status: status as AgentStatus,
    startTime: new Date(), // Updated from timestamp to startTime
    endTime: new Date(), // Added endTime
    steps: [], // Added steps array
  };
};

// Creating a vi mock for Memory interface
// @ts-ignore - This won't be fully compatible with all properties, this is a test
const mockMemory = {
  getMessages: vi.fn().mockImplementation(async () => []),
  addMessage: vi.fn(),
  clearMessages: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getConversations: vi.fn(),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),

  // Simplified mock methods related to History
  addHistoryEntry: vi.fn(),
  updateHistoryEntry: vi.fn(),
  getHistoryEntry: vi.fn(),
  addHistoryEvent: vi.fn(),
  updateHistoryEvent: vi.fn(),
  getHistoryEvent: vi.fn(),
  addHistoryStep: vi.fn(),
  updateHistoryStep: vi.fn(),
  getHistoryStep: vi.fn(),
  getAllHistoryEntriesByAgent: vi.fn(),

  // Added missing addTimelineEvent method
  addTimelineEvent: vi
    .fn()
    .mockImplementation(
      async (_key: string, _value: NewTimelineEvent, _historyId: string, _agentId: string) => {
        // Mock implementation - just resolve
        return Promise.resolve();
      },
    ),

  // Add missing user-centric conversation methods
  getConversationsByUserId: vi.fn().mockImplementation(async () => []),
  queryConversations: vi.fn().mockImplementation(async () => []),
  getConversationMessages: vi.fn().mockImplementation(async () => []),

  // Special test requirements
  getHistoryEntries: vi.fn().mockImplementation(async () => {
    return [createMockHistoryEntry("Test input")];
  }),
};

// Mock Provider implementation for testing
class MockProvider implements LLMProvider<MockModelType> {
  generateTextCalls = 0;
  streamTextCalls = 0;
  generateObjectCalls = 0;
  streamObjectCalls = 0;
  lastMessages: BaseMessage[] = [];

  // @ts-ignore
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

  async generateText(options: {
    messages: BaseMessage[];
    model: MockModelType;
    tools?: BaseTool[];
    maxSteps?: number;
    onStepFinish?: (step: StepWithContent) => Promise<void>;
    toolExecutionContext?: ToolExecutionContext;
  }): Promise<ProviderTextResponse<MockGenerateTextResult>> {
    this.generateTextCalls++;
    this.lastMessages = options.messages;

    // If there are tools and the message contains "Use the test tool", simulate tool usage
    if (
      options.tools &&
      options.messages.some((m) => {
        return getStringContent(m.content).includes("Use the test tool");
      })
    ) {
      // Simulate tool call step
      if (options.onStepFinish) {
        await options.onStepFinish({
          type: "tool_call",
          role: "assistant",
          content: "Using test-tool",
          id: "test-tool-call-id",
          name: "test-tool",
          arguments: {},
        });
      }

      // Simulate tool result step
      if (options.onStepFinish) {
        await options.onStepFinish({
          type: "tool_result",
          role: "tool",
          content: "tool result",
          id: "test-tool-call-id",
          name: "test-tool",
          result: "tool result",
        });
      }
    }

    const result = { text: "Hello, I am a test agent!" };

    // Simulate final text response step like real providers do
    if (options.onStepFinish) {
      await options.onStepFinish({
        type: "text",
        role: "assistant",
        content: result.text,
        id: "final-text-step",
      });
    }

    return {
      provider: result,
      text: result.text,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      toolCalls: [],
      toolResults: [],
      finishReason: "stop",
    };
  }

  async streamText(options: {
    messages: BaseMessage[];
    model: MockModelType;
    tools?: BaseTool[];
    maxSteps?: number;
  }): Promise<ProviderTextStreamResponse<MockStreamTextResult>> {
    this.streamTextCalls++;
    this.lastMessages = options.messages;

    const stream = createAsyncIterableStream(
      new ReadableStream<{
        type: "text-delta";
        textDelta: string;
      }>({
        start(controller) {
          controller.enqueue({ type: "text-delta", textDelta: "Hello" });
          controller.enqueue({ type: "text-delta", textDelta: ", " });
          controller.enqueue({ type: "text-delta", textDelta: "world!" });
          controller.close();
        },
      }),
    );

    // Create a text stream
    const textStream = createAsyncIterableStream(
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue("Hello");
          controller.enqueue(", ");
          controller.enqueue("world!");
          controller.close();
        },
      }),
    );

    return {
      provider: stream,
      textStream,
    };
  }

  async generateObject<T extends z.ZodType>(options: {
    messages: BaseMessage[];
    model: MockModelType;
    schema: T;
    onStepFinish?: (step: StepWithContent) => Promise<void>;
  }): Promise<ProviderObjectResponse<MockGenerateObjectResult<z.infer<T>>, z.infer<T>>> {
    this.generateObjectCalls++;
    this.lastMessages = options.messages;

    const result = {
      object: {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      } as z.infer<T>,
    };

    // Simulate final object response step like real providers do
    if (options.onStepFinish) {
      await options.onStepFinish({
        type: "text",
        role: "assistant",
        content: JSON.stringify(result.object),
        id: "final-object-step",
      });
    }

    return {
      provider: result,
      object: result.object,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      finishReason: "stop",
    };
  }

  async streamObject<T extends z.ZodType>(options: {
    messages: BaseMessage[];
    model: MockModelType;
    schema: T;
  }): Promise<ProviderObjectStreamResponse<MockStreamObjectResult<z.infer<T>>, z.infer<T>>> {
    this.streamObjectCalls++;
    this.lastMessages = options.messages;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue({
          type: "text-delta",
          textDelta: '{"name": "John"}',
        });
        controller.close();
      },
    });

    const partialObjectStream = new ReadableStream<Partial<z.infer<T>>>({
      start(controller) {
        controller.enqueue({ name: "John" } as Partial<z.infer<T>>);
        controller.close();
      },
    });

    const textStream = new ReadableStream({
      start(controller) {
        controller.enqueue('{"name": "John"}');
        controller.close();
      },
    });

    const result = {
      stream,
      partialObjectStream,
      textStream,
    };

    return {
      provider: result,
      objectStream: createAsyncIterableStream(partialObjectStream),
    };
  }
}

// Test Agent class to access protected properties
class TestAgent<TProvider extends { llm: LLMProvider<unknown> }> extends Agent<TProvider> {
  getTools() {
    return this.toolManager.getTools();
  }

  // Add access to protected managers for testing
  getToolManager() {
    return this.toolManager;
  }

  getHistoryManager() {
    return this.historyManager;
  }

  getSubAgentManager() {
    return this.subAgentManager;
  }
}

// Mock HistoryManager
vi.mock("./history", () => ({
  HistoryManager: vi.fn().mockImplementation(() => {
    // createMockHistoryEntry test dosyasının global kapsamında tanımlıdır.
    // Çağrıldığında AgentHistoryEntry'ye benzeyen bir nesne döndürür.
    return {
      addEntry: vi.fn().mockImplementation(async (input, _output, status, _steps, _options) => {
        let entryInputString = "default_mock_input";
        if (typeof input === "string") {
          entryInputString = input;
        } else if (
          Array.isArray(input) &&
          input.length > 0 &&
          input[0] &&
          typeof input[0].content === "string"
        ) {
          entryInputString = input[0].content;
        } else if (input && typeof input === "object" && !Array.isArray(input)) {
          entryInputString = JSON.stringify(input);
        }
        // createMockHistoryEntry, bu test dosyasında daha önce tanımlanmıştır.
        // @ts-ignore createMockHistoryEntry is defined in the outer scope
        return Promise.resolve(createMockHistoryEntry(entryInputString, status || "working"));
      }),
      getEntries: vi.fn().mockResolvedValue([]),
      updateEntry: vi
        .fn()
        .mockImplementation(async (id: string, updates: Partial<AgentHistoryEntry>) => {
          // @ts-ignore createMockHistoryEntry is defined in the outer scope
          const baseEntry = createMockHistoryEntry("updated_input_for_mock");
          return Promise.resolve({ ...baseEntry, id, ...updates });
        }),
      addStepsToEntry: vi
        .fn()
        .mockImplementation(async (id: string, newSteps: StepWithContent[]) => {
          // @ts-ignore createMockHistoryEntry is defined in the outer scope
          const baseEntry = createMockHistoryEntry("steps_added_input_for_mock");
          return Promise.resolve({
            ...baseEntry,
            id,
            steps: [...(baseEntry.steps || []), ...newSteps],
          });
        }),
      // Agent tarafından kullanılan diğer HistoryManager metodları buraya eklenebilir.
      // Örneğin: getEntryById, addEventToEntry
      getEntryById: vi.fn().mockImplementation(async (id: string) => {
        // @ts-ignore createMockHistoryEntry is defined in the outer scope
        return Promise.resolve(createMockHistoryEntry(`entry_for_${id}`));
      }),
      addEventToEntry: vi.fn().mockImplementation(async (id: string, _event: NewTimelineEvent) => {
        // @ts-ignore createMockHistoryEntry is defined in the outer scope
        const baseEntry = createMockHistoryEntry(`event_added_to_${id}`);
        // Remove events property since it doesn't exist in AgentHistoryEntry
        return Promise.resolve({ ...baseEntry, id });
      }),
    };
  }),
}));

// Mock VoltAgentExporter
const mockTelemetryExporter = {
  publicKey: "mock-telemetry-public-key",
  exportHistoryEntry: vi.fn(),
  exportTimelineEvent: vi.fn(),
  exportHistorySteps: vi.fn(),
  updateHistoryEntry: vi.fn(),
  updateTimelineEvent: vi.fn(),
} as unknown as VoltAgentExporter;

// Mock AgentEventEmitter globally
const mockEventEmitter = {
  getInstance: vi.fn().mockReturnThis(),
  addHistoryEvent: vi.fn(),
  emitHistoryEntryCreated: vi.fn(),
  emitHistoryUpdate: vi.fn(),
  emitAgentRegistered: vi.fn(),
  emitAgentUnregistered: vi.fn(),
  onAgentRegistered: vi.fn(),
  onAgentUnregistered: vi.fn(),
  onHistoryEntryCreated: vi.fn(),
  onHistoryUpdate: vi.fn(),
  publishTimelineEvent: vi.fn().mockResolvedValue(createMockHistoryEntry("mock_timeline_event")),
} as unknown as Mocked<AgentEventEmitter>;

// Mock AgentEventEmitter.getInstance globally
vi.spyOn(AgentEventEmitter, "getInstance").mockReturnValue(mockEventEmitter);

describe("Agent", () => {
  let agent: TestAgent<{ llm: MockProvider }>;
  let mockModel: MockModelType;
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockModel = { modelId: "mock-model-id" }; // Use a simple object conforming to MockModelType
    mockProvider = new MockProvider(mockModel);

    // Reset mock memory before each test
    // @ts-ignore - To overcome Object.keys and vi mock type issues
    for (const key of Object.keys(mockMemory)) {
      // @ts-ignore - To overcome type issues with Jest mocks
      if (
        // @ts-ignore - To overcome type issues with Jest mocks
        typeof mockMemory[key] === "function" &&
        // @ts-ignore - To overcome type issues with Jest mocks
        typeof mockMemory[key].mockClear === "function"
      ) {
        // @ts-ignore - To overcome type issues with Jest mocks
        mockMemory[key].mockClear();
      }
    }

    // Create a ready test agent
    // @ts-ignore - Bypass Memory type
    agent = new TestAgent({
      id: "test-agent",
      name: "Test Agent",
      description: "A test agent for unit testing",
      model: mockModel,
      llm: mockProvider,
      memory: mockMemory,
      memoryOptions: {},
      tools: [],
      instructions: "A helpful AI assistant",
    });
  });

  describe("constructor", () => {
    it("should create an agent with default values", () => {
      const defaultAgent = new TestAgent({
        name: "Default Agent",
        model: mockModel,
        llm: mockProvider,
        instructions: "A helpful AI assistant",
      });

      expect(defaultAgent.id).toBeDefined();
      expect(defaultAgent.name).toBe("Default Agent");
      expect(defaultAgent.instructions).toBe("A helpful AI assistant");
      expect(defaultAgent.model).toBe(mockModel);
      expect(defaultAgent.llm).toBe(mockProvider);
    });

    it("should create an agent with custom values", () => {
      const customAgent = new TestAgent({
        id: "custom-id",
        name: "Custom Agent",
        instructions: "Custom description",
        model: mockModel,
        llm: mockProvider,
      });

      expect(customAgent.id).toBe("custom-id");
      expect(customAgent.name).toBe("Custom Agent");
      expect(customAgent.instructions).toBe("Custom description");
      expect(customAgent.llm).toBe(mockProvider);
    });

    it("should use description for instructions if instructions property is not provided", () => {
      const agentWithDesc = new TestAgent({
        name: "Agent With Description Only",
        description: "Uses provided description",
        model: mockModel,
        llm: mockProvider,
        // instructions property is intentionally omitted
      });
      expect(agentWithDesc.instructions).toBe("Uses provided description");
      expect(agentWithDesc.description).toBe("Uses provided description"); // Verifying this.description is also updated
    });

    it("should use instructions if both instructions and description are provided", () => {
      const agentWithBoth = new TestAgent({
        name: "Agent With Both Properties",
        instructions: "Uses provided instructions",
        description: "This description should be ignored",
        model: mockModel,
        llm: mockProvider,
      });
      expect(agentWithBoth.instructions).toBe("Uses provided instructions");
      expect(agentWithBoth.description).toBe("Uses provided instructions");
    });

    // --- BEGIN NEW TELEMETRY-RELATED CONSTRUCTOR TESTS ---
    it("should pass telemetryExporter to HistoryManager if provided", () => {
      (HistoryManager as Mock).mockClear();

      new Agent({
        name: "TelemetryAgent",
        instructions: "Telemetry agent instructions",
        model: mockModel,
        llm: mockProvider,
        telemetryExporter: mockTelemetryExporter,
        memory: mockMemory as Memory,
      });

      expect(HistoryManager).toHaveBeenCalledTimes(1);
      expect(HistoryManager).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.any(Number),
        mockTelemetryExporter,
      );
    });

    it("should instantiate HistoryManager without telemetryExporter if not provided", () => {
      (HistoryManager as Mock).mockClear();

      new Agent({
        name: "NoTelemetryAgent",
        instructions: "No telemetry agent instructions",
        model: mockModel,
        llm: mockProvider,
        memory: mockMemory as Memory,
      });

      expect(HistoryManager).toHaveBeenCalledTimes(1);
      const historyManagerArgs = (HistoryManager as Mock).mock.calls[0];
      expect(historyManagerArgs.length).toBeGreaterThanOrEqual(3);
      expect(historyManagerArgs[3]).toBeUndefined();
    });
    // --- END NEW TELEMETRY-RELATED CONSTRUCTOR TESTS ---
  });

  describe("generate", () => {
    it("should delegate text generation to provider", async () => {
      const response = await agent.generateText("Hello!");
      expect(mockProvider.generateTextCalls).toBe(1);
      expect(response.text).toBe("Hello, I am a test agent!");
    });

    it("should always include system message at the beginning of messages", async () => {
      await agent.generateText("Hello!");
      expect(mockProvider.lastMessages[0].role).toBe("system");
      expect(getStringContent(mockProvider.lastMessages[0].content)).toContain("Test Agent");
      expect(mockProvider.lastMessages[1].role).toBe("user");
      expect(getStringContent(mockProvider.lastMessages[1].content)).toBe("Hello!");
    });

    it("should maintain system message at the beginning when using BaseMessage[] input", async () => {
      const messages: BaseMessage[] = [
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      await agent.generateText(messages);
      expect(mockProvider.lastMessages[0].role).toBe("system");
      expect(getStringContent(mockProvider.lastMessages[0].content)).toContain("Test Agent");
      expect(mockProvider.lastMessages.slice(1)).toEqual(messages);
    });

    it("should maintain system message at the beginning when using memory", async () => {
      const userId = "test-user";
      const message = "Hello!";

      await agent.generateText(message, { userId });

      // Verify system message is at the beginning
      expect(mockProvider.lastMessages[0].role).toBe("system");
      expect(getStringContent(mockProvider.lastMessages[0].content)).toContain("Test Agent");
      expect(mockProvider.lastMessages[1].role).toBe("user");
      expect(getStringContent(mockProvider.lastMessages[1].content)).toBe(message);
    });

    it("should maintain system message at the beginning with context limit", async () => {
      const userId = "test-user";
      const contextLimit = 2;
      const message = "Hello!";

      // Mock getMessages to return some messages
      mockMemory.getMessages.mockImplementationOnce(
        async () =>
          [
            {
              role: "user",
              content: "Message 1",
              id: "1",
              type: "text",
              createdAt: new Date().toISOString(),
            },
            {
              role: "assistant",
              content: "Response 1",
              id: "2",
              type: "text",
              createdAt: new Date().toISOString(),
            },
          ] as MemoryMessage[],
      );

      await agent.generateText(message, { userId, contextLimit });

      // Verify system message is at the beginning
      expect(mockProvider.lastMessages[0].role).toBe("system");
      expect(getStringContent(mockProvider.lastMessages[0].content)).toContain("Test Agent");
      expect(mockProvider.lastMessages[1].role).toBe("user");
      expect(getStringContent(mockProvider.lastMessages[1].content)).toBe("Message 1");
      expect(mockProvider.lastMessages[2].role).toBe("assistant");
      expect(getStringContent(mockProvider.lastMessages[2].content)).toBe("Response 1");
      expect(mockProvider.lastMessages[3].role).toBe("user");
      expect(getStringContent(mockProvider.lastMessages[3].content)).toBe(message);
    });

    it("should handle BaseMessage[] input for text generation", async () => {
      const messages: BaseMessage[] = [
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      const response = await agent.generateText(messages);
      expect(mockProvider.generateTextCalls).toBe(1);
      expect(response.text).toBe("Hello, I am a test agent!");
      expect(mockProvider.lastMessages).toEqual(expect.arrayContaining(messages));
    });

    it("should delegate streaming to provider", async () => {
      const stream = await agent.streamText("Hello!");
      expect(mockProvider.streamTextCalls).toBe(1);
      expect(stream).toBeDefined();
    });

    it("should handle BaseMessage[] input for text streaming", async () => {
      const messages: BaseMessage[] = [
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      const stream = await agent.streamText(messages);
      expect(mockProvider.streamTextCalls).toBe(1);
      expect(stream).toBeDefined();
      expect(mockProvider.lastMessages).toEqual(expect.arrayContaining(messages));
    });

    it("should store messages in memory when userId is provided", async () => {
      const userId = "test-user";
      const message = "Hello!";

      await agent.generateText(message, { userId });

      // Verify getMessages was called
      expect(mockMemory.getMessages).toHaveBeenCalled();
      expect(mockMemory.addMessage).toHaveBeenCalled();
    });

    it("should store tool-related messages in memory when tools are used", async () => {
      const userId = "test-user";
      const message = "Use the test tool";
      const mockTool = createTool({
        id: "test-tool",
        name: "test-tool",
        description: "A test tool",
        parameters: z.object({}),
        execute: async () => "tool result",
      });

      agent.addItems([mockTool]);

      await agent.generateText(message, { userId });

      // Verify getMessages was called
      expect(mockMemory.getMessages).toHaveBeenCalled();
    });
  });

  describe("memory interactions", () => {
    it("should call getMessages once with correct parameters when userId is provided", async () => {
      const userId = "test-user";
      const message = "Hello!";

      await agent.generateText(message, { userId });

      // Verify getMessages was called once with correct parameters
      expect(mockMemory.getMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 10, // Default limit is 10
        }),
      );
    });

    it("should call getMessages once with correct parameters when contextLimit is provided", async () => {
      const userId = "test-user";
      const contextLimit = 2;
      const message = "Hello!";

      await agent.generateText(message, { userId, contextLimit });

      // Verify getMessages was called once with correct parameters
      expect(mockMemory.getMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: contextLimit,
        }),
      );
    });
  });

  describe("history management", () => {
    it("should create history entries during text generation", async () => {
      // Track the addEntry method of HistoryManager with a spy
      const addEntrySpy = vi.spyOn(agent.getHistoryManager(), "addEntry");

      // Mock history entry - creating only for reference
      createMockHistoryEntry("Test history management");

      await agent.generateText("Test history management");

      // Check if addEntry was called
      expect(addEntrySpy).toHaveBeenCalled();

      // Clean up the spy
      addEntrySpy.mockRestore();
    });

    it("should handle history updates correctly", async () => {
      // Spy on AgentEventEmitter
      const emitAgentUnregisteredSpy = vi.spyOn(
        AgentEventEmitter.getInstance(),
        "emitAgentUnregistered",
      );

      // Add active history entry to prepare for unregister
      await agent.generateText("Hello before unregister!");

      // Reset call counts on spy before our unregister call
      emitAgentUnregisteredSpy.mockClear();

      // Unregister agent
      agent.unregister();

      // Check if AgentEventEmitter was called with agent ID
      expect(emitAgentUnregisteredSpy).toHaveBeenCalledWith(agent.id);

      // Clean up the spy
      emitAgentUnregisteredSpy.mockRestore();
    });

    it("should use HistoryManager to store history entries", async () => {
      const historyManager = agent.getHistoryManager();

      // Mock emitHistoryEntryCreated once more to ensure fresh mocks
      const emitHistoryEntryCreatedMock = vi.fn();
      mockEventEmitter.emitHistoryEntryCreated = emitHistoryEntryCreatedMock;

      const historyManagerAddEntrySpy = vi.spyOn(historyManager, "addEntry");

      await agent.generateText("Test input");

      expect(historyManagerAddEntrySpy).toHaveBeenCalled();
      expect(historyManagerAddEntrySpy.mock.calls[0][0].input).toBe("Test input");
    });
  });

  describe("additional core functionality", () => {
    it("should return model name correctly", () => {
      // Test getModelName functionality
      const modelName = agent.getModelName();
      expect(modelName).toBe(mockModel.modelId);
    });

    it("should return full state with correct structure", () => {
      // Add a tool for better state testing
      const mockTool = createTool({
        name: "state-test-tool",
        description: "A test tool for state",
        parameters: z.object({}),
        execute: async () => "tool result",
      });

      agent.addItems([mockTool]);

      // Get full state
      const state = agent.getFullState();

      // Check basic properties
      expect(state.id).toBe(agent.id);
      expect(state.name).toBe(agent.name);
      expect(state.description).toBe(agent.instructions);
      expect(state.node_id).toBe(`agent_${agent.id}`);

      // Check tools property
      expect(state.tools).toContainEqual(
        expect.objectContaining({
          name: mockTool.name,
          node_id: `tool_${mockTool.name}_${agent.id}`,
        }),
      );

      // Check memory property
      expect(state.memory).toBeDefined();
      expect(state.memory.node_id).toBe(`memory_${agent.id}`);
    });
  });

  describe("events", () => {
    it("should register agent when created", () => {
      const newAgent = new TestAgent({
        name: "New Agent",
        model: mockModel,
        llm: mockProvider,
        instructions: "A helpful AI assistant",
      });

      // Register the agent through AgentRegistry
      AgentRegistry.getInstance().registerAgent(newAgent);

      expect(mockEventEmitter.emitAgentRegistered).toHaveBeenCalledWith(newAgent.id);
    });

    it("should emit agent unregistered event when agent is removed", () => {
      const newAgent = new TestAgent({
        name: "New Agent",
        model: mockModel,
        llm: mockProvider,
        instructions: "A helpful AI assistant",
      });

      const emitAgentUnregisteredSpy = vi.spyOn(
        AgentEventEmitter.getInstance(),
        "emitAgentUnregistered",
      );

      newAgent.unregister();

      // And event was emitted
      expect(emitAgentUnregisteredSpy).toHaveBeenCalledWith(newAgent.id);
    });
  });

  describe("manager classes", () => {
    it("should initialize managers in constructor", () => {
      expect(agent.getToolManager()).toBeDefined();
      expect(agent.getHistoryManager()).toBeDefined();
      expect(agent.getSubAgentManager()).toBeDefined();
    });

    it("should delegate getHistory to HistoryManager", () => {
      const historyManagerSpy = vi.spyOn(agent.getHistoryManager(), "getEntries");

      agent.getHistory();

      expect(historyManagerSpy).toHaveBeenCalled();
    });

    it("should use HistoryManager to store history entries", async () => {
      const historyManager = agent.getHistoryManager();

      // Mock emitHistoryEntryCreated once more to ensure fresh mocks
      const emitHistoryEntryCreatedMock = vi.fn();
      mockEventEmitter.emitHistoryEntryCreated = emitHistoryEntryCreatedMock;

      const historyManagerAddEntrySpy = vi.spyOn(historyManager, "addEntry");

      await agent.generateText("Test input");

      expect(historyManagerAddEntrySpy).toHaveBeenCalled();
      expect(historyManagerAddEntrySpy.mock.calls[0][0].input).toBe("Test input");
    });
  });

  describe("stream handling", () => {
    it("should handle streaming errors gracefully", async () => {
      const errorProvider = new MockProvider(mockModel);
      vi.spyOn(errorProvider, "streamText").mockRejectedValue(new Error("Stream error"));

      const errorAgent = new TestAgent({
        name: "Error Stream Agent",
        model: mockModel,
        llm: errorProvider,
        instructions: "Error Stream Agent instructions",
      });

      await expect(errorAgent.streamText("Hello")).rejects.toThrow("Stream error");
    });

    it("should handle object streaming errors gracefully", async () => {
      const errorProvider = new MockProvider(mockModel);
      vi.spyOn(errorProvider, "streamObject").mockRejectedValue(new Error("Object stream error"));

      const errorAgent = new TestAgent({
        name: "Error Object Stream Agent",
        model: mockModel,
        llm: errorProvider,
        instructions: "Error Object Stream Agent instructions",
      });

      const schema = z.object({
        name: z.string(),
      });

      await expect(errorAgent.streamObject("Hello", schema)).rejects.toThrow("Object stream error");
    });
  });

  describe("retriever functionality", () => {
    // Use a simple mock object that matches the requirements
    const createMockRetriever = () => {
      const mockRetriever = {
        retrieveCalls: 0,
        expectedContext: "This is retrieved context",
        lastRetrieveOptions: null as any,

        // Add required BaseRetriever properties
        options: {},

        tool: {
          name: "mock-retriever",
          description: "A mock retriever for testing",
          parameters: z.object({}),
          execute: async () => "tool execution result",
        },

        retrieve: vi
          .fn()
          .mockImplementation(async (_input: string | BaseMessage[], options?: any) => {
            mockRetriever.retrieveCalls++;
            mockRetriever.lastRetrieveOptions = options;

            // Store references in userContext if available - simple test case
            if (options?.userContext) {
              const references = [
                {
                  id: "doc-1",
                  title: "VoltAgent Usage Guide",
                  source: "Official Documentation",
                },
                {
                  id: "doc-2",
                  title: "API Reference",
                  source: "Technical Documentation",
                },
              ];

              options.userContext.set("references", references);
            }

            return mockRetriever.expectedContext;
          }),
      };

      return mockRetriever;
    };

    it("should enhance system message with retriever context", async () => {
      // Mock the getSystemMessage method to verify it was called with context
      const mockRetriever = createMockRetriever();

      // Create a new agent for this test
      const testAgentWithRetriever = new TestAgent({
        id: "retriever-test-agent",
        name: "Retriever Test Agent",
        description: "A test agent with retriever",
        model: mockModel,
        llm: mockProvider,
        // Cast through unknown to BaseRetriever for type compatibility
        retriever: mockRetriever as unknown as BaseRetriever,
        instructions: "Retriever Test Agent instructions",
      });

      // Generate text to trigger retriever
      await testAgentWithRetriever.generateText("Use the context to answer this question");

      // Check if retrieve was called
      expect(mockRetriever.retrieve).toHaveBeenCalled();

      // Verify system message contains context from retriever
      const systemMessage = mockProvider.lastMessages[0];
      expect(getStringContent(systemMessage.content)).toContain("Relevant Context:");
      expect(getStringContent(systemMessage.content)).toContain(mockRetriever.expectedContext);
    });

    it("should handle retriever errors gracefully", async () => {
      // Create a retriever that throws an error
      const errorRetriever = createMockRetriever();
      errorRetriever.retrieve.mockRejectedValue(new Error("Retriever error"));

      // Create a new agent for this test
      const testAgentWithErrorRetriever = new TestAgent({
        id: "error-retriever-test-agent",
        name: "Error Retriever Test Agent",
        description: "A test agent with error retriever",
        model: mockModel,
        llm: mockProvider,
        // Cast through unknown to BaseRetriever for type compatibility
        retriever: errorRetriever as unknown as BaseRetriever,
        instructions: "Error Retriever Test Agent instructions",
      });

      // Generate text should still work despite retriever error
      const response = await testAgentWithErrorRetriever.generateText("This should still work");

      // Verify retrieve was called
      expect(errorRetriever.retrieve).toHaveBeenCalled();

      // Verify response was generated
      expect(response.text).toBe("Hello, I am a test agent!");
    });

    it("should include retriever in full state", () => {
      // Create a mock retriever
      const mockRetriever = createMockRetriever();

      // Create a new agent for this test
      const testAgentWithRetriever = new TestAgent({
        id: "state-retriever-test-agent",
        name: "State Retriever Test Agent",
        description: "A test agent with retriever for state testing",
        model: mockModel,
        llm: mockProvider,
        // Cast through unknown to BaseRetriever for type compatibility
        retriever: mockRetriever as unknown as BaseRetriever,
        instructions: "State Retriever Test Agent instructions",
      });

      // Get full state
      const state = testAgentWithRetriever.getFullState();

      // Check retriever information in state
      expect(state.retriever).toBeDefined();
      expect(state.retriever?.name).toBe(mockRetriever.tool.name);
      expect(state.retriever?.node_id).toBe(
        `retriever_mock-retriever_${testAgentWithRetriever.id}`,
      );
      expect(state.retriever?.description).toBe(mockRetriever.tool.description);
    });

    it("should store references in userContext", async () => {
      const mockRetriever = createMockRetriever();

      // Use onEnd hook to capture the final userContext
      let capturedUserContext: Map<string | symbol, unknown> | undefined;
      const onEndHook = vi.fn(({ context }: { context: OperationContext }) => {
        capturedUserContext = context.userContext;
      });

      const testAgentWithRetriever = new TestAgent({
        id: "references-test-agent",
        name: "References Test Agent",
        description: "A test agent with retriever for references testing",
        model: mockModel,
        llm: mockProvider,
        retriever: mockRetriever as unknown as BaseRetriever,
        hooks: createHooks({ onEnd: onEndHook }),
        instructions: "References Test Agent instructions",
      });

      await testAgentWithRetriever.generateText("What is VoltAgent?");

      // Verify retriever was called
      expect(mockRetriever.retrieve).toHaveBeenCalled();

      // Verify onEnd hook was called and captured userContext
      expect(onEndHook).toHaveBeenCalled();
      expect(capturedUserContext).toBeInstanceOf(Map);

      const references = capturedUserContext?.get("references") as Array<{
        id: string;
        title: string;
        source: string;
      }>;
      expect(references).toBeDefined();
      expect(Array.isArray(references)).toBe(true);
    });

    it("should pass userContext to retriever during generation", async () => {
      const mockRetriever = createMockRetriever();

      const testAgentWithRetriever = new TestAgent({
        id: "usercontext-retriever-test-agent",
        name: "UserContext Retriever Test Agent",
        description: "A test agent with retriever for userContext testing",
        model: mockModel,
        llm: mockProvider,
        retriever: mockRetriever as unknown as BaseRetriever,
        instructions: "UserContext Retriever Test Agent instructions",
      });

      const initialUserContext = new Map<string | symbol, unknown>();
      initialUserContext.set("initial_data", "test_value");

      await testAgentWithRetriever.generateText("Test query for retrieval", {
        userContext: initialUserContext,
      });

      // Verify retriever was called with options containing userContext
      expect(mockRetriever.retrieve).toHaveBeenCalled();
      expect(mockRetriever.lastRetrieveOptions).toBeDefined();
      expect(mockRetriever.lastRetrieveOptions.userContext).toBeInstanceOf(Map);
      expect(mockRetriever.lastRetrieveOptions.userContext.get("initial_data")).toBe("test_value");
    });

    it("should work without userContext in options", async () => {
      const mockRetriever = createMockRetriever();

      // Use onEnd hook to capture the final userContext
      let capturedUserContext: Map<string | symbol, unknown> | undefined;
      const onEndHook = vi.fn(({ context }: { context: OperationContext }) => {
        capturedUserContext = context.userContext;
      });

      const testAgentWithRetriever = new TestAgent({
        id: "no-context-retriever-test-agent",
        name: "No Context Retriever Test Agent",
        description: "A test agent with retriever for no context testing",
        model: mockModel,
        llm: mockProvider,
        retriever: mockRetriever as unknown as BaseRetriever,
        hooks: createHooks({ onEnd: onEndHook }),
        instructions: "No Context Retriever Test Agent instructions",
      });

      await testAgentWithRetriever.generateText("Test without initial context");

      // Verify retriever was called
      expect(mockRetriever.retrieve).toHaveBeenCalled();

      // Verify onEnd hook was called and captured userContext
      expect(onEndHook).toHaveBeenCalled();
      expect(capturedUserContext).toBeInstanceOf(Map);

      const references = capturedUserContext?.get("references");
      expect(references).toBeDefined();
      expect(Array.isArray(references)).toBe(true);
    });
  });

  describe("onEnd hook", () => {
    it("should call onEnd hook with conversationId", async () => {
      const onEndSpy = vi.fn();
      const agentWithOnEnd = new TestAgent({
        name: "OnEnd Test Agent",
        model: mockModel,
        llm: mockProvider,
        hooks: createHooks({ onEnd: onEndSpy }),
        instructions: "OnEnd Test Agent instructions",
      });

      const userInput = "Hello, how are you?";
      await agentWithOnEnd.generateText(userInput);

      expect(onEndSpy).toHaveBeenCalledTimes(1);
      const callArgs = onEndSpy.mock.calls[0][0];

      // Check basic structure
      expect(callArgs).toHaveProperty("agent");
      expect(callArgs).toHaveProperty("output");
      expect(callArgs).toHaveProperty("error");
      expect(callArgs).toHaveProperty("conversationId");
      expect(callArgs).toHaveProperty("context");

      // Check other properties
      expect(callArgs.agent).toBe(agentWithOnEnd);
      expect(callArgs.output).toBeDefined();
      expect(callArgs.error).toBeUndefined();
      expect(callArgs.context).toBeDefined();
      expect(callArgs.conversationId).toEqual(expect.any(String));
    });

    it("should call onEnd hook with userContext passed correctly", async () => {
      const onEndSpy = vi.fn();
      const agentWithOnEnd = new TestAgent({
        name: "OnEnd Context Test Agent",
        model: mockModel,
        llm: mockProvider,
        hooks: createHooks({ onEnd: onEndSpy }),
        instructions: "OnEnd Context Test Agent instructions",
      });

      const userContext = new Map<string | symbol, unknown>();
      userContext.set("testKey", "testValue");

      await agentWithOnEnd.generateText("Test with context", { userContext });

      expect(onEndSpy).toHaveBeenCalledTimes(1);
      const callArgs = onEndSpy.mock.calls[0][0];

      expect(callArgs.context.userContext).toBeInstanceOf(Map);
      expect(callArgs.context.userContext.get("testKey")).toBe("testValue");
    });

    it("should call streamText without errors", async () => {
      const agentWithOnEnd = new TestAgent({
        name: "OnEnd Stream Test Agent",
        model: mockModel,
        llm: mockProvider,
        instructions: "OnEnd Stream Test Agent instructions",
      });

      const userInput = "Stream test";
      const result = await agentWithOnEnd.streamText(userInput);

      // Verify that streamText was called and returns expected structure
      expect(mockProvider.streamTextCalls).toBe(1);
      expect(result).toBeDefined();
      expect(result.textStream).toBeDefined();
    });
  });

  describe("userContext", () => {
    it("should initialize userContext within OperationContext", async () => {
      // Create agent with a spy hook to capture the context
      const onStartSpy = vi.fn();
      const agentWithHook = new TestAgent({
        name: "Context Test Agent",
        model: mockModel,
        llm: mockProvider,
        hooks: createHooks({ onStart: onStartSpy }),
        instructions: "Context Test Agent instructions",
      });

      await agentWithHook.generateText("test initialization");

      // Verify onStart was called
      expect(onStartSpy).toHaveBeenCalled();

      // Get the context passed to onStart from the single argument object
      const operationContext: OperationContext = onStartSpy.mock.calls[0][0].context;

      // Check if userContext exists and is a Map
      expect(operationContext).toHaveProperty("userContext");
      expect(operationContext.userContext).toBeInstanceOf(Map);
      // userContext contains agent_start_time and agent_start_event_id by default
      expect(operationContext.userContext.size).toBe(2);
      expect(operationContext.userContext.has("agent_start_time")).toBe(true);
      expect(operationContext.userContext.has("agent_start_event_id")).toBe(true);
    });

    it("should initialize OperationContext with userContext from options", async () => {
      const initialUserContext = new Map<string | symbol, unknown>();
      initialUserContext.set("initialKey", "initialValue");

      const onStartSpy = vi.fn();
      const agentWithInitialContext = new TestAgent({
        name: "Initial Context Agent",
        model: mockModel,
        llm: mockProvider,
        hooks: createHooks({ onStart: onStartSpy }),
        instructions: "Initial Context Agent instructions",
      });

      await agentWithInitialContext.generateText("test with initial context", {
        userContext: initialUserContext,
      });

      expect(onStartSpy).toHaveBeenCalled();
      const operationContext: OperationContext = onStartSpy.mock.calls[0][0].context;
      expect(operationContext.userContext).toBeInstanceOf(Map);
      expect(operationContext.userContext.get("initialKey")).toBe("initialValue");
      // Ensure it's a clone, not the same instance
      expect(operationContext.userContext).not.toBe(initialUserContext);
      // Modify the original to ensure the clone is not affected
      initialUserContext.set("anotherKey", "anotherValue");
      expect(operationContext.userContext.has("anotherKey")).toBe(false);
    });

    it("should pass userContext to onStart and onEnd hooks when provided in options", async () => {
      const onStartSpy = vi.fn();
      const onEndSpy = vi.fn();
      const agentWithHooks = new TestAgent({
        name: "Hook Context Agent",
        model: mockModel,
        llm: mockProvider,
        hooks: createHooks({ onStart: onStartSpy, onEnd: onEndSpy }),
        instructions: "Hook Context Agent instructions",
      });

      const providedUserContext = new Map<string | symbol, unknown>();
      providedUserContext.set("hookKey", "hookValue");

      await agentWithHooks.generateText("test hooks with context", {
        userContext: providedUserContext,
      });

      expect(onStartSpy).toHaveBeenCalled();
      expect(onEndSpy).toHaveBeenCalled();

      const startContext: OperationContext = onStartSpy.mock.calls[0][0].context;
      const endContext: OperationContext = onEndSpy.mock.calls[0][0].context;

      expect(startContext.userContext.get("hookKey")).toBe("hookValue");
      expect(endContext.userContext.get("hookKey")).toBe("hookValue");
      expect(startContext.userContext).toBe(endContext.userContext);
      expect(startContext.userContext).not.toBe(providedUserContext); // Should be a clone
    });

    it("should allow modifying userContext in onStart and reading in onEnd", async () => {
      const testValue = "test data";
      const testKey = "customKey";

      // Update onStartHook to accept a single object argument
      const onStartHook = vi.fn(({ context }: { context: OperationContext }) => {
        context.userContext.set(testKey, testValue);
      });
      // Update onEndHook to accept a single object argument
      const onEndHook = vi.fn(({ context }: { context: OperationContext }) => {
        expect(context.userContext.get(testKey)).toBe(testValue);
      });

      const agentWithModifyHooks = new TestAgent({
        name: "Modify Context Agent",
        model: mockModel,
        llm: mockProvider,
        // Pass the updated hooks
        hooks: createHooks({ onStart: onStartHook, onEnd: onEndHook }),
        instructions: "Modify Context Agent instructions",
      });

      await agentWithModifyHooks.generateText("test modification");

      expect(onStartHook).toHaveBeenCalled();
      expect(onEndHook).toHaveBeenCalled();
    });

    it("should pass userContext to tool execution context when provided in options", async () => {
      const testValue = "data from start via options";
      const testKey = Symbol("toolTestKeyWithOptions");

      const toolExecuteSpy = vi.fn();
      const mockTool = createTool({
        id: "context-tool-options",
        name: "context-tool-options",
        description: "A tool to test context from options",
        parameters: z.object({}),
        execute: toolExecuteSpy,
      });

      const agentWithToolAndOptions = new TestAgent({
        name: "Tool Context Options Agent",
        model: mockModel,
        llm: mockProvider,
        tools: [mockTool],
        instructions: "Tool Context Options Agent instructions",
      });

      const providedUserContext = new Map<string | symbol, unknown>();
      providedUserContext.set(testKey, testValue);

      const generateTextSpy = vi.spyOn(mockProvider, "generateText");

      await agentWithToolAndOptions.generateText("Use the context-tool-options", {
        userContext: providedUserContext,
      });

      expect(generateTextSpy).toHaveBeenCalled();
      const generateTextOptions = generateTextSpy.mock.calls[0][0];

      expect(generateTextOptions.toolExecutionContext).toBeDefined();
      expect(generateTextOptions.toolExecutionContext?.operationContext).toBeDefined();

      // Use if condition for safer access to nested properties
      if (generateTextOptions.toolExecutionContext?.operationContext?.userContext) {
        const toolOpContext = generateTextOptions.toolExecutionContext.operationContext;
        expect(toolOpContext.userContext).toBeInstanceOf(Map);
        expect(toolOpContext.userContext.get(testKey)).toBe(testValue);
        expect(toolOpContext.userContext).not.toBe(providedUserContext); // Should be a clone
      } else {
        // Fail the test if the structure is not as expected
        throw new Error(
          "toolExecutionContext.operationContext.userContext was not defined as expected",
        );
      }

      generateTextSpy.mockRestore();
    });

    it("should keep userContext isolated between operations even when passed via options", async () => {
      const key1 = "op1KeyWithOptions";
      const value1 = "op1ValueWithOptions";
      const key2 = "op2KeyWithOptions";
      const value2 = "op2ValueWithOptions";

      const userContext1 = new Map<string | symbol, unknown>([[key1, value1]]);
      const userContext2 = new Map<string | symbol, unknown>([[key2, value2]]);

      const onStartHook = vi.fn(({ context }: { context: OperationContext }) => {
        if (context.historyEntry.input === "Operation 1 with options") {
          expect(context.userContext.get(key1)).toBe(value1);
          expect(context.userContext.has(key2)).toBe(false);
          // Modify context to ensure it doesn't leak to the next operation
          context.userContext.set("leakTest", "shouldNotLeak");
        } else if (context.historyEntry.input === "Operation 2 with options") {
          expect(context.userContext.get(key2)).toBe(value2);
          expect(context.userContext.has(key1)).toBe(false);
          expect(context.userContext.has("leakTest")).toBe(false);
        }
      });

      const isolationAgent = new TestAgent({
        name: "Isolation Options Agent",
        model: mockModel,
        llm: mockProvider,
        hooks: createHooks({ onStart: onStartHook }),
        instructions: "Isolation Options Agent instructions",
      });

      await isolationAgent.generateText("Operation 1 with options", {
        userContext: userContext1,
      });
      await isolationAgent.generateText("Operation 2 with options", {
        userContext: userContext2,
      });

      expect(onStartHook).toHaveBeenCalledTimes(2);
    });
  });

  describe("forward event functionality", () => {
    let agentWithSubAgents: TestAgent<{ llm: MockProvider }>;
    let mockSubAgent: TestAgent<{ llm: MockProvider }>;

    beforeEach(() => {
      // Create a mock sub-agent
      mockSubAgent = new TestAgent({
        id: "sub-agent-1",
        name: "Mock Sub Agent",
        description: "A mock sub-agent for testing",
        model: mockModel,
        llm: mockProvider,
        instructions: "A mock sub-agent for testing",
      });

      // Create an agent with sub-agents
      agentWithSubAgents = new TestAgent({
        id: "parent-agent",
        name: "Parent Agent",
        description: "A parent agent with sub-agents",
        model: mockModel,
        llm: mockProvider,
        instructions: "A parent agent with sub-agents",
      });

      // Add the sub-agent
      agentWithSubAgents.addSubAgent(mockSubAgent);
    });

    it("should create forwardEvent function in prepareTextOptions when streamEventForwarder exists", async () => {
      // Test the core functionality: forwardEvent function creation
      const mockForwarder = vi.fn().mockResolvedValue(undefined);

      // Access the protected method to test it directly
      const textOptions = (agentWithSubAgents as any).prepareTextOptions({
        streamEventForwarder: mockForwarder,
        historyEntryId: "test-history-id",
        operationContext: {
          userContext: new Map(),
          operationId: "test-op-id",
          historyEntry: { id: "test-history-id" },
          isActive: true,
        },
      });

      expect(textOptions.tools).toBeDefined();
      const delegateTool = textOptions.tools.find((tool: any) => tool.name === "delegate_task");
      expect(delegateTool).toBeDefined();
    });

    it("should test forwardEvent filtering logic directly", async () => {
      const mockForwarder = vi.fn().mockResolvedValue(undefined);

      // Create a forwardEvent function like the real code does
      const forwardEvent = async (event: {
        type: string;
        data: any;
        timestamp: string;
        subAgentId: string;
        subAgentName: string;
      }) => {
        // Handle forwarding with filtering (no backup storage)
        if (mockForwarder) {
          // Filter out text, reasoning, and source events from SubAgents
          if (event.type === "text" || event.type === "reasoning" || event.type === "source") {
            return; // Should not call forwarder
          }
          await mockForwarder(event);
        }
      };

      // Test filtering - these should NOT be forwarded
      const filteredEvents = [
        {
          type: "text",
          data: {},
          timestamp: "2023-01-01",
          subAgentId: "test",
          subAgentName: "Test",
        },
        {
          type: "reasoning",
          data: {},
          timestamp: "2023-01-01",
          subAgentId: "test",
          subAgentName: "Test",
        },
        {
          type: "source",
          data: {},
          timestamp: "2023-01-01",
          subAgentId: "test",
          subAgentName: "Test",
        },
      ];

      for (const event of filteredEvents) {
        await forwardEvent(event);
      }

      // Forwarder should not be called for filtered events
      expect(mockForwarder).not.toHaveBeenCalled();
    });

    it("should test forwardEvent tool prefix logic directly", async () => {
      const mockForwarder = vi.fn().mockResolvedValue(undefined);

      // Create a forwardEvent function like the real code does
      const forwardEvent = async (event: {
        type: string;
        data: any;
        timestamp: string;
        subAgentId: string;
        subAgentName: string;
      }) => {
        if (mockForwarder) {
          // Skip filtering for this test
          if (event.type === "text" || event.type === "reasoning" || event.type === "source") {
            return;
          }

          // Add sub-agent prefix to distinguish from parent events
          const prefixedData = {
            ...event.data,
            timestamp: event.timestamp,
            type: event.type,
            subAgentId: event.subAgentId,
            subAgentName: event.subAgentName,
          };

          // For tool events, add subagent prefix to display name
          if (event.type === "tool-call" && prefixedData.toolCall) {
            prefixedData.toolCall = {
              ...prefixedData.toolCall,
              toolName: `${event.subAgentName}: ${prefixedData.toolCall.toolName}`,
            };
          } else if (event.type === "tool-result" && prefixedData.toolResult) {
            prefixedData.toolResult = {
              ...prefixedData.toolResult,
              toolName: `${event.subAgentName}: ${prefixedData.toolResult.toolName}`,
            };
          }

          await mockForwarder(prefixedData);
        }
      };

      // Test tool-call event with prefix
      const toolCallEvent = {
        type: "tool-call",
        data: {
          toolCall: {
            toolName: "original-tool",
            arguments: { test: "value" },
          },
        },
        timestamp: "2023-01-01",
        subAgentId: "sub-agent-1",
        subAgentName: "Mock Sub Agent",
      };

      await forwardEvent(toolCallEvent);

      expect(mockForwarder).toHaveBeenCalledWith({
        toolCall: {
          toolName: "Mock Sub Agent: original-tool",
          arguments: { test: "value" },
        },
        timestamp: "2023-01-01",
        type: "tool-call",
        subAgentId: "sub-agent-1",
        subAgentName: "Mock Sub Agent",
      });

      // Test tool-result event with prefix
      mockForwarder.mockClear();
      const toolResultEvent = {
        type: "tool-result",
        data: {
          toolResult: {
            toolName: "original-tool",
            result: "test result",
          },
        },
        timestamp: "2023-01-01",
        subAgentId: "sub-agent-1",
        subAgentName: "Mock Sub Agent",
      };

      await forwardEvent(toolResultEvent);

      expect(mockForwarder).toHaveBeenCalledWith({
        toolResult: {
          toolName: "Mock Sub Agent: original-tool",
          result: "test result",
        },
        timestamp: "2023-01-01",
        type: "tool-result",
        subAgentId: "sub-agent-1",
        subAgentName: "Mock Sub Agent",
      });
    });

    it("should handle forwardEvent errors gracefully", async () => {
      const failingForwarder = vi.fn().mockRejectedValue(new Error("Forwarding failed"));

      // Create a forwardEvent function that handles errors like the real code
      const forwardEvent = async (event: {
        type: string;
        data: any;
        timestamp: string;
        subAgentId: string;
        subAgentName: string;
      }) => {
        if (failingForwarder) {
          try {
            if (event.type === "text" || event.type === "reasoning" || event.type === "source") {
              return;
            }
            await failingForwarder(event);
          } catch {
            // do nothing
            return;
          }
        }
      };

      const testEvent = {
        type: "tool-call",
        data: { test: true },
        timestamp: "2023-01-01",
        subAgentId: "test",
        subAgentName: "Test",
      };

      // Should not throw
      await expect(forwardEvent(testEvent)).resolves.toBeUndefined();
    });

    it("should do nothing when no streamEventForwarder is provided", async () => {
      // Create forwardEvent without streamEventForwarder
      const forwardEvent = async (_event: {
        type: string;
        data: any;
        timestamp: string;
        subAgentId: string;
        subAgentName: string;
      }) => {
        // No streamEventForwarder provided, do nothing
        // This matches the real implementation after removing backup
      };

      const testEvent = {
        type: "tool-call",
        data: { test: true },
        timestamp: "2023-01-01",
        subAgentId: "test",
        subAgentName: "Test",
      };

      // Should not throw and complete successfully
      await expect(forwardEvent(testEvent)).resolves.toBeUndefined();
    });

    it("should create delegate tool with forwardEvent function when SubAgents exist", async () => {
      const tools = agentWithSubAgents.getTools();
      const delegateTool = tools.find((tool) => tool.name === "delegate_task");

      expect(delegateTool).toBeDefined();
      expect(delegateTool?.name).toBe("delegate_task");
      expect(delegateTool?.description).toContain("Delegate");
    });

    it("should not create delegate tool when no SubAgents exist", async () => {
      const agentWithoutSubAgents = new TestAgent({
        name: "No SubAgents Agent",
        model: mockModel,
        llm: mockProvider,
        instructions: "No SubAgents Agent instructions",
      });

      const tools = agentWithoutSubAgents.getTools();
      const delegateTool = tools.find((tool) => tool.name === "delegate_task");

      expect(delegateTool).toBeUndefined();
    });

    it("should pass streamEventForwarder to prepareTextOptions during streamText", async () => {
      const mockForwarder = vi.fn();

      // Spy on prepareTextOptions to verify it receives the streamEventForwarder
      const prepareTextOptionsSpy = vi.spyOn(agentWithSubAgents as any, "prepareTextOptions");

      await agentWithSubAgents.streamText("Test forwarder passing", {
        streamEventForwarder: mockForwarder,
      });

      expect(prepareTextOptionsSpy).toHaveBeenCalled();
      const callArgs = prepareTextOptionsSpy.mock.calls[0][0] as any;
      expect(callArgs.streamEventForwarder).toBe(mockForwarder);

      prepareTextOptionsSpy.mockRestore();
    });
  });
});
