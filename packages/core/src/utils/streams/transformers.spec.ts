import { describe, expect, it } from "vitest";
import { transformStreamEventToStreamPart } from "./transformers";
import type { StreamEvent } from "./types";

describe("transformStreamEventToStreamPart", () => {
  const baseEventData = {
    timestamp: "2024-01-01T00:00:00.000Z",
    subAgentId: "agent-123",
    subAgentName: "test-agent",
  };

  describe("tool-call events", () => {
    it("should transform tool-call event correctly", () => {
      const event: StreamEvent = {
        type: "tool-call",
        data: {
          toolCallId: "call-123",
          toolName: "test-tool",
          args: { param1: "value1" },
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "tool-call",
        toolCallId: "call-123",
        toolName: "test-tool",
        args: { param1: "value1" },
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle tool-call event with missing data properties", () => {
      const event = {
        type: "tool-call" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "tool-call",
        toolCallId: undefined,
        toolName: undefined,
        args: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("tool-result events", () => {
    it("should transform tool-result event correctly", () => {
      const event: StreamEvent = {
        type: "tool-result",
        data: {
          toolCallId: "call-123",
          toolName: "test-tool",
          result: { success: true, data: "result-data" },
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "tool-result",
        toolCallId: "call-123",
        toolName: "test-tool",
        result: { success: true, data: "result-data" },
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle tool-result event with missing data properties", () => {
      const event = {
        type: "tool-result" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "tool-result",
        toolCallId: undefined,
        toolName: undefined,
        result: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("text-delta events", () => {
    it("should transform text-delta event correctly", () => {
      const event: StreamEvent = {
        type: "text-delta",
        data: {
          textDelta: "Hello, world!",
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "text-delta",
        textDelta: "Hello, world!",
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle text-delta event with missing data properties", () => {
      const event = {
        type: "text-delta" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "text-delta",
        textDelta: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("reasoning events", () => {
    it("should transform reasoning event correctly", () => {
      const event: StreamEvent = {
        type: "reasoning",
        data: {
          reasoning: "I need to analyze this step by step...",
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "reasoning",
        reasoning: "I need to analyze this step by step...",
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle reasoning event with missing data properties", () => {
      const event = {
        type: "reasoning" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "reasoning",
        reasoning: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("source events", () => {
    it("should transform source event correctly", () => {
      const event: StreamEvent = {
        type: "source",
        data: {
          source: "https://example.com/document.pdf",
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "source",
        source: "https://example.com/document.pdf",
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle source event with missing data properties", () => {
      const event = {
        type: "source" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "source",
        source: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("finish events", () => {
    it("should transform finish event correctly", () => {
      const event: StreamEvent = {
        type: "finish",
        data: {
          finishReason: "stop",
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle finish event with missing data properties", () => {
      const event = {
        type: "finish" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "finish",
        finishReason: undefined,
        usage: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("error events", () => {
    it("should transform error event correctly", () => {
      const error = new Error("Something went wrong");
      const event: StreamEvent = {
        type: "error",
        data: {
          error,
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "error",
        error,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle error event with missing data properties", () => {
      const event = {
        type: "error" as const,
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "error",
        error: undefined,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("unknown events", () => {
    it("should handle unknown event types by flattening the data", () => {
      const event = {
        type: "unknown-event",
        data: {
          customField: "custom-value",
          nestedData: { key: "value" },
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "unknown-event",
        customField: "custom-value",
        nestedData: { key: "value" },
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle unknown event with empty data", () => {
      const event = {
        type: "unknown-event",
        data: {},
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "unknown-event",
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle events with empty subAgentId and subAgentName", () => {
      const event: StreamEvent = {
        type: "text-delta",
        data: {
          textDelta: "Hello",
        },
        timestamp: "2024-01-01T00:00:00.000Z",
        subAgentId: "",
        subAgentName: "",
      };

      const result = transformStreamEventToStreamPart(event);

      expect(result).toEqual({
        type: "text-delta",
        textDelta: "Hello",
        subAgentId: "",
        subAgentName: "",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle events with null data values", () => {
      const event = {
        type: "tool-call" as const,
        data: {
          toolCallId: null,
          toolName: null,
          args: null,
        },
        ...baseEventData,
      };

      const result = transformStreamEventToStreamPart(event as any);

      expect(result).toEqual({
        type: "tool-call",
        toolCallId: null,
        toolName: null,
        args: null,
        subAgentId: "agent-123",
        subAgentName: "test-agent",
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });
  });
});
