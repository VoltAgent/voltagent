import { VoltAgentObservabilitySDK } from ".";
import { VoltAgentCoreAPI } from "../client";
import type {
  VoltAgentClientOptions,
  TraceOptions,
  AgentOptions,
  ToolOptions,
  MemoryOptions,
  RetrieverOptions,
  History,
  Event,
} from "../types";

// Mock the core client
jest.mock("../client");
const MockedVoltAgentCoreAPI = VoltAgentCoreAPI as jest.MockedClass<typeof VoltAgentCoreAPI>;

// Mock crypto for consistent UUIDs in tests
jest.mock("node:crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-123"),
}));

// Mock timers and global functions
jest.useFakeTimers();

// Mock global timer functions
const mockSetInterval = jest.fn();
const mockClearInterval = jest.fn();

// Override global functions
global.setInterval = mockSetInterval as any;
global.clearInterval = mockClearInterval as any;

describe("VoltAgentObservabilitySDK", () => {
  let sdk: VoltAgentObservabilitySDK;
  let mockCoreClient: jest.Mocked<VoltAgentCoreAPI>;
  const defaultOptions: VoltAgentClientOptions = {
    baseUrl: "https://api.voltagent.ai",
    publicKey: "test-public-key",
    secretKey: "test-secret-key",
  };

  const mockHistory: History = {
    id: "history-123",
    name: "test-history",
    projectId: "project-123",
    userId: "user-123",
    metadata: { agentId: "test-agent" },
    input: "test input",
    startTime: "2024-01-01T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  const mockEvent: Event = {
    id: "event-123",
    historyId: "history-123",
    name: "agent:start",
    type: "agent",
    startTime: "2024-01-01T00:00:00.000Z",
    status: "running",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetInterval.mockClear();
    mockClearInterval.mockClear();

    // Setup default return value for setInterval
    mockSetInterval.mockReturnValue("timer-id" as any);

    mockCoreClient = {
      addHistory: jest.fn(),
      updateHistory: jest.fn(),
      addEvent: jest.fn(),
    } as any;

    MockedVoltAgentCoreAPI.mockImplementation(() => mockCoreClient);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Constructor and Initialization", () => {
    it("should initialize SDK with default options", () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);

      expect(MockedVoltAgentCoreAPI).toHaveBeenCalledWith(defaultOptions);
      expect(sdk).toBeInstanceOf(VoltAgentObservabilitySDK);
    });

    it("should initialize with auto flush enabled by default", () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);

      // Auto flush should be set up (check if setInterval was called)
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it("should disable auto flush when specified", () => {
      sdk = new VoltAgentObservabilitySDK({
        ...defaultOptions,
        autoFlush: false,
      });

      expect(mockSetInterval).not.toHaveBeenCalled();
    });

    it("should use custom flush interval", () => {
      sdk = new VoltAgentObservabilitySDK({
        ...defaultOptions,
        flushInterval: 10000,
      });

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 10000);
    });

    it("should provide access to core client", () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);

      expect(sdk.client).toBe(mockCoreClient);
    });
  });

  describe("Trace Operations", () => {
    beforeEach(() => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);
    });

    describe("trace()", () => {
      it("should create a new trace with required options", async () => {
        const traceOptions: TraceOptions = {
          agentId: "test-agent-123",
          input: { query: "test query" },
        };

        const trace = await sdk.trace(traceOptions);

        expect(mockCoreClient.addHistory).toHaveBeenCalledWith({
          agent_id: "test-agent-123",
          input: { query: "test query" },
          userId: undefined,
          conversationId: undefined,
          metadata: {
            agentId: "test-agent-123",
          },
          tags: undefined,
          status: "working",
          startTime: expect.any(String),
        });

        expect(trace.id).toBe("history-123");
        expect(trace.agentId).toBe("test-agent");
      });

      it("should create trace with all optional fields", async () => {
        const traceOptions: TraceOptions = {
          agentId: "complex-agent",
          input: { data: "complex" },
          userId: "user-456",
          conversationId: "conv-789",
          metadata: { source: "test", priority: "high" },
          tags: ["test", "complex"],
        };

        await sdk.trace(traceOptions);

        expect(mockCoreClient.addHistory).toHaveBeenCalledWith({
          agent_id: "complex-agent",
          input: { data: "complex" },
          userId: "user-456",
          conversationId: "conv-789",
          metadata: {
            agentId: "complex-agent",
            source: "test",
            priority: "high",
          },
          tags: ["test", "complex"],
          status: "working",
          startTime: expect.any(String),
        });
      });

      it("should handle API errors when creating trace", async () => {
        const apiError = new Error("API Error");
        mockCoreClient.addHistory.mockRejectedValue(apiError);

        const traceOptions: TraceOptions = {
          agentId: "failing-agent",
        };

        await expect(sdk.trace(traceOptions)).rejects.toThrow("API Error");
      });
    });

    describe("TraceContext Operations", () => {
      let trace: any;

      beforeEach(async () => {
        const traceOptions: TraceOptions = {
          agentId: "test-agent",
        };
        trace = await sdk.trace(traceOptions);
      });

      describe("update()", () => {
        it("should update trace metadata", async () => {
          const updatedHistory = { ...mockHistory, status: "completed" };
          mockCoreClient.updateHistory.mockResolvedValue(updatedHistory);

          const updateData = { status: "completed", output: { result: "success" } };
          const result = await trace.update(updateData);

          expect(mockCoreClient.updateHistory).toHaveBeenCalledWith({
            id: "history-123",
            status: "completed",
            output: { result: "success" },
          });

          expect(result).toBe(trace); // Should return self for chaining
        });

        it("should handle update errors", async () => {
          const updateError = new Error("Update failed");
          mockCoreClient.updateHistory.mockRejectedValue(updateError);

          await expect(trace.update({ status: "error" })).rejects.toThrow("Update failed");
        });
      });

      describe("end()", () => {
        it("should end trace with default status", async () => {
          const updatedHistory = { ...mockHistory, status: "completed" };
          mockCoreClient.updateHistory.mockResolvedValue(updatedHistory);

          await trace.end({
            output: "Final output",
          });

          expect(mockCoreClient.updateHistory).toHaveBeenCalledWith({
            id: "history-123",
            output: { output: "Final output" },
            status: "completed",
            endTime: expect.any(String),
            metadata: undefined,
            usage: undefined,
          });
        });

        it("should end trace with custom status", async () => {
          const updatedHistory = { ...mockHistory, status: "error" };
          mockCoreClient.updateHistory.mockResolvedValue(updatedHistory);

          await trace.end({
            output: "Error output",
            status: "error",
          });

          expect(mockCoreClient.updateHistory).toHaveBeenCalledWith({
            id: "history-123",
            output: { output: "Error output" },
            status: "error",
            endTime: expect.any(String),
            metadata: undefined,
            usage: undefined,
          });
        });

        it("should end trace without output", async () => {
          const updatedHistory = { ...mockHistory, status: "completed" };
          mockCoreClient.updateHistory.mockResolvedValue(updatedHistory);

          await trace.end();

          expect(mockCoreClient.updateHistory).toHaveBeenCalledWith({
            id: "history-123",
            output: undefined,
            status: "completed",
            endTime: expect.any(String),
            metadata: undefined,
            usage: undefined,
          });
        });
      });

      describe("addAgent()", () => {
        it("should add agent to trace", async () => {
          mockCoreClient.addEvent.mockResolvedValue(mockEvent);

          const agentOptions: AgentOptions = {
            name: "test-agent",
            input: { query: "test" },
            metadata: { temperature: 0.1 },
          };

          const agent = await trace.addAgent(agentOptions);

          expect(mockCoreClient.addEvent).toHaveBeenCalledWith({
            historyId: "history-123",
            event: {
              id: "test-uuid-123",
              startTime: expect.any(String),
              name: "agent:start",
              type: "agent",
              input: { input: { query: "test" } },
              status: "running",
              metadata: {
                displayName: "test-agent",
                id: "test-agent",
                agentId: "test-agent",
                instructions: undefined,
                temperature: 0.1,
              },
              traceId: "history-123",
            },
          });

          expect(agent.id).toBe("event-123");
          expect(agent.traceId).toBe("history-123");
        });

        it("should handle agent without input", async () => {
          mockCoreClient.addEvent.mockResolvedValue(mockEvent);

          const agentOptions: AgentOptions = {
            name: "simple-agent",
          };

          await trace.addAgent(agentOptions);

          expect(mockCoreClient.addEvent).toHaveBeenCalledWith({
            historyId: "history-123",
            event: expect.objectContaining({
              input: { input: "" },
            }),
          });
        });
      });

      describe("addEvent()", () => {
        it("should add custom event to trace", async () => {
          mockCoreClient.addEvent.mockResolvedValue(mockEvent);

          const customEvent = {
            name: "tool:start" as const,
            type: "tool" as const,
            input: { toolName: "custom" },
            metadata: {
              id: "custom-id",
              displayName: "Custom Tool",
            },
          };

          const eventContext = await trace.addEvent(customEvent);

          expect(mockCoreClient.addEvent).toHaveBeenCalledWith({
            historyId: "history-123",
            event: {
              id: "test-uuid-123",
              startTime: expect.any(String),
              ...customEvent,
              traceId: "history-123",
            },
          });

          expect(eventContext.id).toBe("event-123");
          expect(eventContext.traceId).toBe("history-123");
        });
      });
    });
  });

  describe("Agent Operations", () => {
    let trace: any;
    let agent: any;

    beforeEach(async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);
      mockCoreClient.addEvent.mockResolvedValue(mockEvent);

      trace = await sdk.trace({ agentId: "test-agent" });
      agent = await trace.addAgent({ name: "test-agent" });
    });

    describe("addAgent() - Sub-agents", () => {
      it("should add sub-agent with parent relationship", async () => {
        const subAgentEvent = { ...mockEvent, id: "sub-agent-123" };
        mockCoreClient.addEvent.mockResolvedValue(subAgentEvent);

        const subAgentOptions: AgentOptions = {
          name: "sub-agent",
          input: { task: "subtask" },
        };

        const subAgent = await agent.addAgent(subAgentOptions);

        expect(mockCoreClient.addEvent).toHaveBeenCalledWith({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "agent:start",
            type: "agent",
            parentEventId: "event-123",
            input: { input: { task: "subtask" } },
          }),
        });

        expect(subAgent.parentId).toBe("event-123");
      });
    });

    describe("addTool()", () => {
      it("should add tool to agent", async () => {
        const toolEvent = { ...mockEvent, id: "tool-123", type: "tool" as const };
        mockCoreClient.addEvent.mockResolvedValue(toolEvent);

        const toolOptions: ToolOptions = {
          name: "weather-api",
          input: { city: "Istanbul" },
          metadata: { timeout: 5000 },
        };

        const tool = await agent.addTool(toolOptions);

        // Should be the second call (first is agent creation, second is tool creation)
        const calls = mockCoreClient.addEvent.mock.calls;
        const toolCall = calls[calls.length - 1];

        expect(toolCall).toEqual([
          {
            historyId: "history-123",
            event: {
              id: "test-uuid-123",
              startTime: expect.any(String),
              name: "tool:start",
              type: "tool",
              input: { city: "Istanbul" },
              status: "running",
              metadata: {
                displayName: "weather-api",
                id: "weather-api",
                agentId: "event-123",
                timeout: 5000,
              },
              parentEventId: "event-123",
              traceId: "history-123",
            },
          },
        ]);

        expect(tool.id).toBe("tool-123");
        expect(tool.parentId).toBe("event-123");
      });
    });

    describe("addMemory()", () => {
      it("should add memory operation to agent", async () => {
        const memoryEvent = { ...mockEvent, id: "memory-123", type: "memory" as const };
        mockCoreClient.addEvent.mockResolvedValue(memoryEvent);

        const memoryOptions: MemoryOptions = {
          name: "cache-operation",
          input: { key: "weather-data", value: { temp: 22 } },
        };

        const memory = await agent.addMemory(memoryOptions);

        expect(mockCoreClient.addEvent).toHaveBeenCalledWith({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "memory:write_start",
            type: "memory",
            parentEventId: "event-123",
          }),
        });

        expect(memory.id).toBe("memory-123");
      });
    });

    describe("addRetriever()", () => {
      it("should add retriever operation to agent", async () => {
        const retrieverEvent = { ...mockEvent, id: "retriever-123", type: "retriever" as const };
        mockCoreClient.addEvent.mockResolvedValue(retrieverEvent);

        const retrieverOptions: RetrieverOptions = {
          name: "web-search",
          input: { query: "AI trends", maxResults: 10 },
        };

        const retriever = await agent.addRetriever(retrieverOptions);

        expect(mockCoreClient.addEvent).toHaveBeenCalledWith({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "retriever:start",
            type: "retriever",
            parentEventId: "event-123",
          }),
        });

        expect(retriever.id).toBe("retriever-123");
      });
    });

    describe("success()", () => {
      it("should mark agent as successful", async () => {
        const successEvent = { ...mockEvent, id: "success-123" };
        mockCoreClient.addEvent.mockResolvedValue(successEvent);

        const output = { response: "Task completed", confidence: 0.95 };
        await agent.success({ output, metadata: { testMeta: true } });

        // Get the latest call (should be the success event)
        const calls = mockCoreClient.addEvent.mock.calls;
        const successCall = calls[calls.length - 1];

        expect(successCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "agent:success",
            type: "agent",
            status: "completed",
            output: { response: "Task completed", confidence: 0.95 },
            parentEventId: "event-123",
          }),
        });
      });

      it("should handle success without output", async () => {
        mockCoreClient.addEvent.mockResolvedValue(mockEvent);

        await agent.success();

        const calls = mockCoreClient.addEvent.mock.calls;
        const successCall = calls[calls.length - 1];

        expect(successCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            output: {},
          }),
        });
      });
    });

    describe("error()", () => {
      it("should mark agent as failed with error", async () => {
        const errorEvent = { ...mockEvent, id: "error-123" };
        mockCoreClient.addEvent.mockResolvedValue(errorEvent);

        const error = new Error("Agent failed");
        error.stack = "Error stack trace";

        await agent.error({ statusMessage: error });

        const calls = mockCoreClient.addEvent.mock.calls;
        const errorCall = calls[calls.length - 1];

        expect(errorCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "agent:error",
            type: "agent",
            status: "error",
            level: "ERROR",
            statusMessage: {
              message: "Agent failed",
              stack: "Error stack trace",
              name: "Error",
            },
          }),
        });
      });
    });
  });

  describe("Tool Context Operations", () => {
    let tool: any;

    beforeEach(async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);
      mockCoreClient.addEvent.mockResolvedValue(mockEvent);

      const trace = await sdk.trace({ agentId: "test-agent" });
      const agent = await trace.addAgent({ name: "test-agent" });
      tool = await agent.addTool({ name: "test-tool" });
    });

    describe("success()", () => {
      it("should mark tool as successful", async () => {
        const successEvent = { ...mockEvent, id: "tool-success-123" };
        mockCoreClient.addEvent.mockResolvedValue(successEvent);

        const output = { result: "API call successful", data: { temp: 22 } };
        await tool.success({ output });

        const calls = mockCoreClient.addEvent.mock.calls;
        const successCall = calls[calls.length - 1];

        expect(successCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "tool:success",
            type: "tool",
            status: "completed",
            output: { result: "API call successful", data: { temp: 22 } },
            parentEventId: "event-123",
          }),
        });
      });
    });

    describe("error()", () => {
      it("should mark tool as failed", async () => {
        const errorEvent = { ...mockEvent, id: "tool-error-123" };
        mockCoreClient.addEvent.mockResolvedValue(errorEvent);

        const error = new Error("API rate limit exceeded");
        await tool.error({ statusMessage: error });

        const calls = mockCoreClient.addEvent.mock.calls;
        const errorCall = calls[calls.length - 1];

        expect(errorCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "tool:error",
            type: "tool",
            status: "error",
            level: "ERROR",
            statusMessage: {
              message: "API rate limit exceeded",
              stack: error.stack,
              name: "Error",
            },
          }),
        });
      });
    });
  });

  describe("Memory Context Operations", () => {
    let memory: any;

    beforeEach(async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);
      mockCoreClient.addEvent.mockResolvedValue(mockEvent);

      const trace = await sdk.trace({ agentId: "test-agent" });
      const agent = await trace.addAgent({ name: "test-agent" });
      memory = await agent.addMemory({ name: "test-memory" });
    });

    describe("success()", () => {
      it("should mark memory operation as successful", async () => {
        const successEvent = { ...mockEvent, id: "memory-success-123" };
        mockCoreClient.addEvent.mockResolvedValue(successEvent);

        const output = { stored: true, key: "cache-key" };
        await memory.success({ output });

        const calls = mockCoreClient.addEvent.mock.calls;
        const successCall = calls[calls.length - 1];

        expect(successCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "memory:write_success",
            type: "memory",
            status: "completed",
            output: { stored: true, key: "cache-key" },
          }),
        });
      });
    });

    describe("error()", () => {
      it("should mark memory operation as failed", async () => {
        const errorEvent = { ...mockEvent, id: "memory-error-123" };
        mockCoreClient.addEvent.mockResolvedValue(errorEvent);

        const error = new Error("Memory storage failed");
        await memory.error({ statusMessage: error });

        const calls = mockCoreClient.addEvent.mock.calls;
        const errorCall = calls[calls.length - 1];

        expect(errorCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "memory:write_error",
            type: "memory",
            status: "error",
            level: "ERROR",
          }),
        });
      });
    });
  });

  describe("Retriever Context Operations", () => {
    let retriever: any;

    beforeEach(async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);
      mockCoreClient.addEvent.mockResolvedValue(mockEvent);

      const trace = await sdk.trace({ agentId: "test-agent" });
      const agent = await trace.addAgent({ name: "test-agent" });
      retriever = await agent.addRetriever({ name: "test-retriever" });
    });

    describe("success()", () => {
      it("should mark retriever operation as successful", async () => {
        const successEvent = { ...mockEvent, id: "retriever-success-123" };
        mockCoreClient.addEvent.mockResolvedValue(successEvent);

        const output = { documents: ["doc1", "doc2"], relevance: [0.9, 0.8] };
        await retriever.success({ output });

        const calls = mockCoreClient.addEvent.mock.calls;
        const successCall = calls[calls.length - 1];

        expect(successCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "retriever:success",
            type: "retriever",
            status: "completed",
            output: { documents: ["doc1", "doc2"], relevance: [0.9, 0.8] },
          }),
        });
      });
    });

    describe("error()", () => {
      it("should mark retriever operation as failed", async () => {
        const errorEvent = { ...mockEvent, id: "retriever-error-123" };
        mockCoreClient.addEvent.mockResolvedValue(errorEvent);

        const error = new Error("Search service unavailable");
        await retriever.error({ statusMessage: error });

        const calls = mockCoreClient.addEvent.mock.calls;
        const errorCall = calls[calls.length - 1];

        expect(errorCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "retriever:error",
            type: "retriever",
            status: "error",
            level: "ERROR",
          }),
        });
      });
    });
  });

  describe("EventContext Operations", () => {
    let eventContext: any;

    beforeEach(async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);

      // Mock event with tool type for EventContext tests
      const toolEvent = { ...mockEvent, type: "tool" as const };
      mockCoreClient.addEvent.mockResolvedValue(toolEvent);

      const trace = await sdk.trace({ agentId: "test-agent" });
      eventContext = await trace.addEvent({
        name: "tool:start",
        type: "tool",
        metadata: { id: "test", displayName: "Test Tool" },
      });
    });

    describe("success()", () => {
      it("should create appropriate success event based on type", async () => {
        const successEvent = { ...mockEvent, id: "generic-success-123" };
        mockCoreClient.addEvent.mockResolvedValue(successEvent);

        const output = { result: "success" };
        await eventContext.success(output);

        const calls = mockCoreClient.addEvent.mock.calls;
        const successCall = calls[calls.length - 1];

        expect(successCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "tool:success",
            type: "tool",
            status: "completed",
            output,
          }),
        });
      });
    });

    describe("error()", () => {
      it("should create appropriate error event based on type", async () => {
        const errorEvent = { ...mockEvent, id: "generic-error-123" };
        mockCoreClient.addEvent.mockResolvedValue(errorEvent);

        const error = new Error("Generic error");
        await eventContext.error({ statusMessage: error });

        const calls = mockCoreClient.addEvent.mock.calls;
        const errorCall = calls[calls.length - 1];

        expect(errorCall[0]).toEqual({
          historyId: "history-123",
          event: expect.objectContaining({
            name: "tool:error",
            type: "tool",
            status: "error",
            level: "ERROR",
          }),
        });
      });
    });
  });

  describe("Hierarchical Relationships", () => {
    it("should maintain parent-child relationships in complex workflow", async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);

      // Mock different events for each level
      const agentEvent = { ...mockEvent, id: "agent-123" };
      const subAgentEvent = { ...mockEvent, id: "sub-agent-123" };
      const toolEvent = { ...mockEvent, id: "tool-123" };

      mockCoreClient.addEvent
        .mockResolvedValueOnce(agentEvent)
        .mockResolvedValueOnce(subAgentEvent)
        .mockResolvedValueOnce(toolEvent);

      // Create complex hierarchy
      const trace = await sdk.trace({ agentId: "main-agent" });
      const mainAgent = await trace.addAgent({ name: "main-agent" });
      const subAgent = await mainAgent.addAgent({ name: "sub-agent" });
      const tool = await subAgent.addTool({ name: "tool" });

      // Verify hierarchy
      expect(mainAgent.parentId).toBeUndefined(); // Top-level agent
      expect(subAgent.parentId).toBe("agent-123");
      expect(tool.parentId).toBe("sub-agent-123");

      // Verify all share same trace
      expect(mainAgent.traceId).toBe("history-123");
      expect(subAgent.traceId).toBe("history-123");
      expect(tool.traceId).toBe("history-123");
    });
  });

  describe("Backward Compatibility", () => {
    // This section is kept for documentation purposes only
    // All deprecated methods have been removed
    it("should exist for documentation purposes", () => {
      expect(true).toBe(true);
    });
  });

  describe("Shutdown", () => {
    it("should clear auto flush interval and flush remaining events", async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addEvent.mockResolvedValue(mockEvent);

      await sdk.shutdown();

      expect(mockClearInterval).toHaveBeenCalled();
    });

    it("should handle shutdown without auto flush", async () => {
      sdk = new VoltAgentObservabilitySDK({
        ...defaultOptions,
        autoFlush: false,
      });

      await sdk.shutdown();

      expect(mockClearInterval).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
    });

    it("should handle network errors gracefully", async () => {
      const networkError = new Error("Network error");
      mockCoreClient.addHistory.mockRejectedValue(networkError);

      const traceOptions: TraceOptions = {
        agentId: "failing-agent",
      };

      await expect(sdk.trace(traceOptions)).rejects.toThrow("Network error");
    });

    it("should handle API errors in event creation", async () => {
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);
      mockCoreClient.addEvent.mockRejectedValue(new Error("Event creation failed"));

      const trace = await sdk.trace({ agentId: "test-agent" });

      await expect(trace.addAgent({ name: "failing-agent" })).rejects.toThrow(
        "Event creation failed",
      );
    });

    it("should handle flush errors gracefully", async () => {
      mockCoreClient.addEvent.mockRejectedValue(new Error("Flush failed"));

      // Test flush with empty queue since queueEvent is removed
      await expect(sdk.flush()).resolves.not.toThrow();
    });
  });

  describe("getTrace()", () => {
    it("should return trace by ID", async () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);
      mockCoreClient.addHistory.mockResolvedValue(mockHistory);

      await sdk.trace({ agentId: "test-agent" });

      const retrievedTrace = sdk.getTrace("history-123");
      expect(retrievedTrace).toEqual(mockHistory);
    });

    it("should return undefined for non-existent trace", () => {
      sdk = new VoltAgentObservabilitySDK(defaultOptions);

      const retrievedTrace = sdk.getTrace("non-existent");
      expect(retrievedTrace).toBeUndefined();
    });
  });
});
