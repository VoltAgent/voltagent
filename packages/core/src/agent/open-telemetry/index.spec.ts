import { trace, context, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import type { Span } from "@opentelemetry/api";
import { startOperationSpan, endOperationSpan, startToolSpan, endToolSpan } from "./index"; // Assuming the helper functions are exported from './index'

// Mock the OpenTelemetry API
jest.mock("@opentelemetry/api", () => {
  const originalApi = jest.requireActual("@opentelemetry/api");
  const mockSpan = {
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
    spanContext: jest.fn(() => ({ traceId: "mock-trace-id", spanId: "mock-span-id" })),
    isRecording: jest.fn(() => true), // Default to recording
  };
  const mockTracer = {
    startSpan: jest.fn(() => mockSpan),
  };
  return {
    ...originalApi, // Keep original enums like SpanKind, SpanStatusCode
    trace: {
      getTracer: jest.fn(() => mockTracer),
      setSpan: jest.fn((ctx, span) => ({ ...ctx, span })), // Simple mock context propagation
    },
    context: {
      active: jest.fn(() => ({})), // Mock active context
    },
    // Re-export mockSpan creation for easy access in tests if needed
    _createMockSpan: () => ({ ...mockSpan, isRecording: jest.fn(() => true) }), // Function to get a fresh mock span
  };
});

// Helper function to get the mocked tracer and span functions
const getOtelMocks = () => {
  // Provide dummy name to satisfy the mocked getTracer call
  const mockTracer = trace.getTracer("test-tracer");
  // Import the mockSpan creator from the mocked module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { _createMockSpan } = require("@opentelemetry/api");
  return {
    mockTracer,
    createMockSpan: _createMockSpan,
    mockContextActive: context.active,
    mockTraceSetSpan: trace.setSpan,
  };
};

describe("OpenTelemetry Helpers", () => {
  let otelMocks: ReturnType<typeof getOtelMocks>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    otelMocks = getOtelMocks();
  });

  describe("startOperationSpan", () => {
    it("should start an internal span with correct attributes", () => {
      const options = {
        agentId: "agent-123",
        agentName: "Test Agent",
        operationName: "testOperation",
        userId: "user-456",
        sessionId: "session-789",
        parentAgentId: "parent-agent",
        parentHistoryEntryId: "parent-hist-1",
      };
      startOperationSpan(options);

      expect(otelMocks.mockTracer.startSpan).toHaveBeenCalledWith(
        options.operationName,
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: {
            "agent.id": options.agentId,
            "agent.name": options.agentName,
            "enduser.id": options.userId,
            "session.id": options.sessionId,
            "voltagent.parent.agent.id": options.parentAgentId,
            "voltagent.parent.history.id": options.parentHistoryEntryId,
          },
        }),
        expect.any(Object), // Mocked context
      );
    });

    it("should start a span without optional attributes if not provided", () => {
      const options = {
        agentId: "agent-123",
        agentName: "Test Agent",
        operationName: "testOperation",
      };
      startOperationSpan(options);

      expect(otelMocks.mockTracer.startSpan).toHaveBeenCalledWith(
        options.operationName,
        expect.objectContaining({
          kind: SpanKind.INTERNAL,
          attributes: {
            "agent.id": options.agentId,
            "agent.name": options.agentName,
          },
        }),
        expect.any(Object),
      );
      // Ensure optional attributes are not present
      // Cast to jest.Mock to access .mock property safely
      const calledAttributes = (otelMocks.mockTracer.startSpan as jest.Mock).mock.calls[0][1]
        .attributes;
      expect(calledAttributes).not.toHaveProperty("enduser.id");
      expect(calledAttributes).not.toHaveProperty("session.id");
      expect(calledAttributes).not.toHaveProperty("voltagent.parent.agent.id");
      expect(calledAttributes).not.toHaveProperty("voltagent.parent.history.id");
    });
  });

  describe("endOperationSpan", () => {
    let mockSpan: ReturnType<typeof otelMocks.createMockSpan>;

    beforeEach(() => {
      mockSpan = otelMocks.createMockSpan();
    });

    it("should set attributes, OK status, and end span on completion", () => {
      const options = {
        span: mockSpan as unknown as Span,
        status: "completed" as const,
        data: {
          input: [{ role: "user", content: "Hello" }],
          output: "Hi there!",
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          // Use quotes for the key with a dot
          metadata: { key1: "value1", key2: 123, "internal.key": "ignore" },
        },
      };
      endOperationSpan(options);

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        "ai.prompt.messages": JSON.stringify(options.data.input),
        "ai.response.text": options.data.output,
        "gen_ai.usage.prompt_tokens": 10,
        "gen_ai.usage.completion_tokens": 5,
        "ai.usage.tokens": 15,
        "metadata.key1": "value1",
        "metadata.key2": 123,
        // "metadata.internal.key" should not be added due to filter
      });
      // Explicitly check that the internal key was NOT added
      expect(mockSpan.setAttributes).not.toHaveBeenCalledWith(
        expect.objectContaining({ "metadata.internal.key": "ignore" }),
      );
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.recordException).not.toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should set attributes, ERROR status, record exception, and end span on error", () => {
      const error = new Error("Something failed");
      const options = {
        span: mockSpan as unknown as Span,
        status: "error" as const,
        data: {
          input: "User input",
          error: error,
          errorMessage: error.message,
        },
      };
      endOperationSpan(options);

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        "ai.prompt.messages": options.data.input,
      });
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should record exception from errorMessage if error object is missing", () => {
      const errorMessage = "Failure reason";
      const options = {
        span: mockSpan as unknown as Span,
        status: "error" as const,
        data: {
          errorMessage: errorMessage,
        },
      };
      endOperationSpan(options);

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      // Check if it records an Error object created from the message
      expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockSpan.recordException).toHaveBeenCalledWith(
        expect.objectContaining({ message: errorMessage }),
      );
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should not operate on a non-recording span", () => {
      mockSpan.isRecording.mockReturnValue(false);
      const options = {
        span: mockSpan as unknown as Span,
        status: "completed" as const,
        data: {},
      };
      endOperationSpan(options);

      expect(mockSpan.setAttributes).not.toHaveBeenCalled();
      expect(mockSpan.setStatus).not.toHaveBeenCalled();
      expect(mockSpan.end).not.toHaveBeenCalled();
    });

    it("should handle enrichment errors gracefully and still end the span", () => {
      const enrichError = new Error("Enrichment failed");
      mockSpan.setAttributes.mockImplementation(() => {
        throw enrichError;
      });

      const options = {
        span: mockSpan as unknown as Span,
        status: "completed" as const,
        data: { output: "test" },
      };

      endOperationSpan(options);

      expect(mockSpan.setAttributes).toHaveBeenCalledTimes(1); // It was attempted
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: "Span enrichment failed",
      });
      expect(mockSpan.setAttribute).toHaveBeenCalledWith("otel.enrichment.error", true);
      expect(mockSpan.end).toHaveBeenCalledTimes(1); // Ensure span is always ended
    });
  });

  describe("startToolSpan", () => {
    let parentSpan: ReturnType<typeof otelMocks.createMockSpan>;

    beforeEach(() => {
      parentSpan = otelMocks.createMockSpan();
    });

    it("should start a client span with correct attributes", () => {
      const options = {
        toolName: "get_weather",
        toolCallId: "call-abc",
        toolInput: { location: "London" },
        agentId: "agent-123",
        parentSpan: parentSpan as unknown as Span,
      };
      startToolSpan(options);

      expect(otelMocks.mockTraceSetSpan).toHaveBeenCalledWith(
        expect.any(Object),
        options.parentSpan,
      );
      expect(otelMocks.mockTracer.startSpan).toHaveBeenCalledWith(
        `tool.execution:${options.toolName}`,
        expect.objectContaining({
          kind: SpanKind.CLIENT,
          attributes: {
            "tool.call.id": options.toolCallId,
            "tool.name": options.toolName,
            "tool.arguments": JSON.stringify(options.toolInput),
            "agent.id": options.agentId,
          },
        }),
        expect.any(Object), // Context potentially modified by setSpan
      );
    });

    it("should start span correctly without parent span", () => {
      const options = {
        toolName: "get_weather",
        toolCallId: "call-abc",
        toolInput: { location: "London" },
        agentId: "agent-123",
        parentSpan: undefined, // Explicitly no parent
      };
      startToolSpan(options);

      expect(otelMocks.mockTraceSetSpan).not.toHaveBeenCalled(); // Should not try to set span on context
      expect(otelMocks.mockTracer.startSpan).toHaveBeenCalledWith(
        `tool.execution:${options.toolName}`,
        expect.objectContaining({
          kind: SpanKind.CLIENT,
          attributes: expect.any(Object),
        }),
        expect.any(Object), // Default active context
      );
    });
  });

  describe("endToolSpan", () => {
    let mockSpan: ReturnType<typeof otelMocks.createMockSpan>;

    beforeEach(() => {
      mockSpan = otelMocks.createMockSpan();
    });

    it("should set result attribute, OK status, and end span on success", () => {
      const options = {
        span: mockSpan as unknown as Span,
        resultData: { result: { temperature: 20 } },
      };
      endToolSpan(options);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        "tool.result",
        JSON.stringify(options.resultData.result),
      );
      expect(mockSpan.setAttribute).not.toHaveBeenCalledWith(
        "tool.error.message",
        expect.anything(),
      );
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.recordException).not.toHaveBeenCalled();
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should set result/error attributes, ERROR status, record exception, and end span on error", () => {
      const error = new Error("Tool failed");
      const options = {
        span: mockSpan as unknown as Span,
        resultData: { result: { some_partial_data: 1 }, error: error },
      };
      endToolSpan(options);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        "tool.result",
        JSON.stringify(options.resultData.result),
      );
      expect(mockSpan.setAttribute).toHaveBeenCalledWith("tool.error.message", error.message);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });

    it("should not operate on a non-recording span", () => {
      mockSpan.isRecording.mockReturnValue(false);
      const options = {
        span: mockSpan as unknown as Span,
        resultData: { result: "ok" },
      };
      endToolSpan(options);

      expect(mockSpan.setAttribute).not.toHaveBeenCalled();
      expect(mockSpan.setStatus).not.toHaveBeenCalled();
      expect(mockSpan.end).not.toHaveBeenCalled();
    });

    it("should handle enrichment errors gracefully and still end the span", () => {
      const enrichError = new Error("Tool Enrichment failed");
      // Simulate error on the first call to setAttribute
      mockSpan.setAttribute.mockImplementationOnce(() => {
        throw enrichError;
      });

      const options = {
        span: mockSpan as unknown as Span,
        resultData: { result: "ok" },
      };

      endToolSpan(options);

      // Check that the first call was attempted (even though it threw)
      expect(mockSpan.setAttribute).toHaveBeenCalledWith("tool.result", JSON.stringify("ok"));
      // Check that the second call (in the catch block) set the enrichment error attribute
      expect(mockSpan.setAttribute).toHaveBeenCalledWith("otel.enrichment.error", true);
      // Check the final status set in the catch block
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: "Tool span enrichment failed",
      });
      // Ensure span is always ended
      expect(mockSpan.end).toHaveBeenCalledTimes(1);
    });
  });
});
