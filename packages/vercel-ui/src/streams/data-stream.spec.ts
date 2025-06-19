import type { StreamPart } from "@voltagent/core";
import { convertReadableStreamToArray } from "@voltagent/internal/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatDataStreamPart,
  isSubAgentStreamPart,
  mergeIntoDataStream,
  toDataStream,
} from "./data-stream";
import type { DataStreamOptions, FullStream, SubAgentStreamPart } from "./data-stream";

// Mock dependencies
vi.mock("@voltagent/internal/dev", () => ({
  devLogger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("ai", () => ({
  formatDataStreamPart: vi.fn((type, value) => `formatted:${type}:${JSON.stringify(value)}`),
}));

function mockFullStream(data: StreamPart[]): FullStream {
  return {
    async *[Symbol.asyncIterator]() {
      yield* data;
    },
  };
}

describe("data-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatDataStreamPart", () => {
    it("should format data stream parts correctly", () => {
      const result = formatDataStreamPart("text", "hello world");
      expect(result).toBe('formatted:text:"hello world"');
    });

    it("should handle different data types", () => {
      const result = formatDataStreamPart("error", "test error");
      expect(result).toBe('formatted:error:"test error"');
    });
  });

  describe("isSubAgentStreamPart", () => {
    it("should return true for valid sub-agent stream parts", () => {
      const subAgentPart: SubAgentStreamPart = {
        type: "text-delta",
        textDelta: "test",
        subAgentId: "agent-1",
        subAgentName: "TestAgent",
      };

      expect(isSubAgentStreamPart(subAgentPart)).toBe(true);
    });

    it("should return false for regular stream parts", () => {
      const regularPart: StreamPart = {
        type: "text-delta",
        textDelta: "test",
      };

      expect(isSubAgentStreamPart(regularPart)).toBe(false);
    });

    it("should return false for stream parts with missing sub-agent properties", () => {
      const incompletePart = {
        type: "text-delta",
        textDelta: "test",
        subAgentId: "agent-1",
        // missing subAgentName
      } as any;

      expect(isSubAgentStreamPart(incompletePart)).toBe(false);
    });

    it("should return false for stream parts with wrong property types", () => {
      const wrongTypePart = {
        type: "text-delta",
        textDelta: "test",
        subAgentId: 123, // should be string
        subAgentName: "TestAgent",
      } as any;

      expect(isSubAgentStreamPart(wrongTypePart)).toBe(false);
    });
  });

  describe("mergeIntoDataStream", () => {
    it("should merge stream into data stream writer", async () => {
      const mockWriter = {
        merge: vi.fn(),
        onError: vi.fn(),
      } as any;

      const mockStream: FullStream = (async function* () {
        yield { type: "text-delta", textDelta: "test" };
      })();

      const options: DataStreamOptions = {
        sendUsage: true,
        sendReasoning: false,
        sendSources: false,
        experimental_sendFinish: true,
      };

      mergeIntoDataStream(mockWriter, mockStream, options);

      expect(mockWriter.merge).toHaveBeenCalled();
    });
  });

  describe("toDataStream", () => {
    it("should convert full stream to data stream", async () => {
      const mockStream = mockFullStream([
        { type: "text-delta", textDelta: "hello" },
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should exclude text-delta by default", async () => {
      const mockStream: FullStream = mockFullStream([
        { type: "text-delta", textDelta: "should be excluded" },
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      // Should not contain text-delta chunks
      const textChunks = chunks.filter((chunk) => chunk.includes("text"));
      expect(textChunks).toHaveLength(0);
    });

    it("should handle custom exclude function", async () => {
      const mockStream = mockFullStream([
        { type: "text-delta", textDelta: "test" },
        { type: "finish", finishReason: "stop" },
      ]);

      const options: DataStreamOptions = {
        exclude: (streamPart) => streamPart.type === "finish",
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      // Should not contain finish chunks
      const finishChunks = chunks.filter((chunk) => chunk.includes("finish"));
      expect(finishChunks).toHaveLength(0);
    });

    it("should handle tool-call stream parts", async () => {
      const mockStream = mockFullStream([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "test:tool",
          args: { param: "value" },
        },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("tool_call"))).toBe(true);
    });

    it("should handle tool-result stream parts", async () => {
      const mockStream: FullStream = mockFullStream([
        {
          type: "tool-result",
          toolCallId: "call-1",
          toolName: "test:tool",
          result: { success: true },
        },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("tool_result"))).toBe(true);
      expect(chunks.some((chunk) => chunk.includes("finish_step"))).toBe(true);
    });

    it("should handle reasoning stream parts when enabled", async () => {
      const mockStream = mockFullStream([{ type: "reasoning", reasoning: "test reasoning" }]);

      const options: DataStreamOptions = {
        sendReasoning: true,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("reasoning"))).toBe(true);
    });

    it("should not handle reasoning stream parts when disabled", async () => {
      const mockStream = mockFullStream([{ type: "reasoning", reasoning: "test reasoning" }]);

      const options: DataStreamOptions = {
        sendReasoning: false,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("reasoning"))).toBe(false);
    });

    it("should handle source stream parts when enabled", async () => {
      const mockStream = mockFullStream([{ type: "source", source: "https://example.com" }]);

      const options: DataStreamOptions = {
        sendSources: true,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("source"))).toBe(true);
    });

    it("should handle finish stream parts with usage", async () => {
      const mockStream = mockFullStream([
        {
          type: "finish",
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        },
      ]);

      const options: DataStreamOptions = {
        sendUsage: true,
        experimental_sendFinish: true,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("finish_message"))).toBe(true);
    });

    it("should handle finish stream parts without usage when disabled", async () => {
      const mockStream = mockFullStream([
        {
          type: "finish",
          finishReason: "stop",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        },
      ]);

      const options: DataStreamOptions = {
        sendUsage: false,
        experimental_sendFinish: true,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      // Should still include finish_message but without usage
      expect(chunks.some((chunk) => chunk.includes("finish_message"))).toBe(true);
    });

    it("should handle error stream parts", async () => {
      const mockStream = mockFullStream([{ type: "error", error: new Error("test error") }]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("error"))).toBe(true);
    });

    it("should handle custom error message function", async () => {
      const mockStream = mockFullStream([{ type: "error", error: new Error("original error") }]);

      const options: DataStreamOptions = {
        getErrorMessage: (_error) => "custom error message",
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("custom error message"))).toBe(true);
    });

    it("should handle sub-agent stream parts", async () => {
      const mockStream = mockFullStream([
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "test:tool",
          args: { param: "value" },
          subAgentId: "agent-1",
          subAgentName: "TestAgent",
        },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("subAgent"))).toBe(true);
    });

    it("should handle stream cancellation", async () => {
      const mockStream = mockFullStream([
        { type: "text-delta", textDelta: "test" },
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const reader = dataStream.getReader();

      // Cancel the stream immediately
      reader.cancel("test cancellation");

      // Should not throw
      expect(() => reader.releaseLock()).not.toThrow();
    });

    it("should handle stream iteration errors", async () => {
      const mockStream: FullStream = (async function* () {
        yield { type: "text-delta", textDelta: "test" };
        throw new Error("iteration error");
      })();

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks.some((chunk) => chunk.includes("error"))).toBe(true);
    });

    it("should handle unknown stream part types gracefully", async () => {
      const mockStream = mockFullStream([
        { type: "unknown-type" as any, data: "test" } as any,
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      // Should complete without throwing
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });
  });
});
