import type { StreamPart } from "@voltagent/core";
import { convertReadableStreamToArray } from "@voltagent/internal/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDataStreamPart, mergeIntoDataStream, toDataStream } from "./data-stream";
import type { DataStreamOptions, FullStream, SubAgentStreamPart } from "./data-stream";

// Mock dependencies
vi.mock("ai", () => ({
  formatDataStreamPart: vi.fn((type, value) => `formatted:${type}:${JSON.stringify(value)}`),
}));

// Spy on console methods
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

describe("data-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

  describe("mergeIntoDataStream", () => {
    it("should merge stream into data stream writer", async () => {
      const mockWriter = {
        merge: vi.fn(),
        onError: vi.fn(),
      } as any;

      const mockStream: FullStream = (async function* () {
        yield { type: "text-delta", textDelta: "test" } as const;
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

      expect(chunks).toEqual([
        'formatted:text:"hello"',
        'formatted:finish_message:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}',
      ]);
    });

    it("should exclude text-delta by default", async () => {
      const mockStream: FullStream = mockFullStream([
        { type: "text-delta", textDelta: "should be excluded" },
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual([
        'formatted:text:"should be excluded"',
        'formatted:finish_message:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}',
      ]);
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

      expect(chunks).toEqual(['formatted:text:"test"']);
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

      expect(chunks).toEqual([
        'formatted:tool_call:{"toolCallId":"call-1","toolName":"tool","args":{"param":"value"},"subAgent":false}',
      ]);
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

      expect(chunks).toEqual([
        'formatted:tool_result:{"toolCallId":"call-1","result":{"success":true},"subAgent":false}',
        'formatted:finish_step:{"isContinued":false,"finishReason":"tool-calls"}',
      ]);
    });

    it("should handle reasoning stream parts when enabled", async () => {
      const mockStream = mockFullStream([{ type: "reasoning", reasoning: "test reasoning" }]);

      const options: DataStreamOptions = {
        sendReasoning: true,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual(['formatted:reasoning:"test reasoning"']);
    });

    it("should not handle reasoning stream parts when disabled", async () => {
      const mockStream = mockFullStream([{ type: "reasoning", reasoning: "test reasoning" }]);

      const options: DataStreamOptions = {
        sendReasoning: false,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual([]);
    });

    it("should handle source stream parts when enabled", async () => {
      const mockStream = mockFullStream([{ type: "source", source: "https://example.com" }]);

      const options: DataStreamOptions = {
        sendSources: true,
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual([
        'formatted:source:{"sourceType":"url","id":"https://example.com","url":"https://example.com"}',
      ]);
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

      expect(chunks).toEqual([
        'formatted:finish_message:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":20,"totalTokens":30}}',
      ]);
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

      expect(chunks).toEqual(['formatted:finish_message:{"finishReason":"stop"}']);
    });

    it("should handle error stream parts", async () => {
      const mockStream = mockFullStream([{ type: "error", error: new Error("test error") }]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual(['formatted:error:"An error occurred."']);
    });

    it("should handle custom error message function", async () => {
      const mockStream = mockFullStream([{ type: "error", error: new Error("original error") }]);

      const options: DataStreamOptions = {
        getErrorMessage: (_error) => "custom error message",
      };

      const dataStream = toDataStream(mockStream, options);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual(['formatted:error:"custom error message"']);
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

      expect(chunks).toEqual([
        'formatted:tool_call:{"toolCallId":"call-1","toolName":"tool","args":{"param":"value"},"subAgentName":"TestAgent","subAgentId":"agent-1","subAgent":true}',
      ]);
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
      const mockStream = mockFullStream([
        { type: "text-delta", textDelta: "test" },
        { type: "error", error: new Error("iteration error") },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual(['formatted:text:"test"', 'formatted:error:"An error occurred."']);
    });

    it("should handle unknown stream part types gracefully", async () => {
      const mockStream = mockFullStream([
        { type: "unknown-type" as any, data: "test" } as any,
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual([
        'formatted:finish_message:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}',
      ]);
    });

    it("should ignore sub-agent text-delta stream parts", async () => {
      const mockStream = mockFullStream([
        {
          type: "text-delta",
          textDelta: "should be ignored",
          subAgentId: "agent-1",
          subAgentName: "TestAgent",
        },
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual([
        'formatted:finish_message:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}',
      ]);
    });

    it("should process regular text-delta stream parts (not from sub-agents)", async () => {
      const mockStream = mockFullStream([
        {
          type: "text-delta",
          textDelta: "should be processed",
          // No subAgentId or subAgentName
        },
        { type: "finish", finishReason: "stop" },
      ]);

      const dataStream = toDataStream(mockStream);
      const chunks = await convertReadableStreamToArray(dataStream);

      expect(chunks).toEqual([
        'formatted:text:"should be processed"',
        'formatted:finish_message:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}',
      ]);
    });

    describe("error handling", () => {
      it("should handle error thrown during stream iteration in toDataStream", async () => {
        const dataStream = toDataStream(null as any);
        const chunks = await convertReadableStreamToArray(dataStream);
        expect(chunks).toEqual(['formatted:error:"An error occurred."']);
      });

      it("should handle error thrown in start of ReadableStream", async () => {
        const dataStream = toDataStream(null as any, {
          getErrorMessage: (x) => {
            const msg = (x as Error).message;
            if (msg.includes("Cannot read properties of null")) {
              throw new Error("A Test Error");
            }
            return msg;
          },
        });
        const chunks = await convertReadableStreamToArray(dataStream);
        expect(chunks).toEqual(['formatted:error:"A Test Error"']);
      });
    });
  });
});

function mockFullStream(data: StreamPart[]): FullStream {
  return {
    async *[Symbol.asyncIterator]() {
      yield* data;
    },
  };
}
