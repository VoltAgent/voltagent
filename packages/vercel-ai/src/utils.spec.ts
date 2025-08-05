import type { BaseTool, StreamPart, VoltAgentError } from "@voltagent/core";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { AISDKError, TextStreamPart, ToolSet } from "ai";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  convertToolsForSDK,
  createMappedFullStream,
  createStepFromChunk,
  createVoltagentErrorFromSdkError,
  mapToStreamPart,
} from "./utils";

// Mock the ai tool and generateId
vi.mock("ai", () => ({
  tool: vi.fn().mockImplementation((config) => config),
  generateId: vi.fn().mockReturnValue("test-id-123"),
}));

describe("convertToolsForSDK", () => {
  it("should convert tools to SDK format", () => {
    const mockTools = [
      {
        id: "getWeather",
        name: "getWeather",
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }: { location: string }) => ({
          location,
          temperature: 72,
        }),
      },
    ];

    const result = convertToolsForSDK(mockTools);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("getWeather");
    expect(result?.getWeather).toEqual(
      expect.objectContaining({
        description: "Get the weather in a location",
        inputSchema: expect.any(Object),
        execute: expect.any(Function),
      }),
    );
  });

  it("should return undefined for empty tools array", () => {
    const result = convertToolsForSDK([]);
    expect(result).toBeUndefined();
  });

  it("should return undefined for null tools array", () => {
    // @ts-expect-error - test null case
    const result = convertToolsForSDK(null);
    expect(result).toBeUndefined();
  });

  it("should handle multiple tools", () => {
    const mockTools = [
      {
        id: "tool1",
        name: "tool1",
        description: "First tool",
        parameters: z.object({}),
        execute: async () => ({}),
      },
      {
        id: "tool2",
        name: "tool2",
        description: "Second tool",
        parameters: z.object({}),
        execute: async () => ({}),
      },
    ];

    const result = convertToolsForSDK(mockTools);

    expect(result).toBeDefined();
    expect(result).toHaveProperty("tool1");
    expect(result).toHaveProperty("tool2");
    expect(Object.keys(result || {})).toHaveLength(2);
  });
});

describe("createStepFromChunk", () => {
  it("should create text step from text chunk", () => {
    const chunk = {
      type: "text",
      text: "Hello, world!",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };

    const result = createStepFromChunk(chunk);

    expect(result).toEqual({
      id: "test-id-123",
      type: "text",
      content: "Hello, world!",
      role: "assistant",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
  });

  it("should create text step without usage", () => {
    const chunk = {
      type: "text",
      text: "Hello, world!",
    };

    const result = createStepFromChunk(chunk);

    expect(result).toEqual({
      id: "test-id-123",
      type: "text",
      content: "Hello, world!",
      role: "assistant",
      usage: undefined,
    });
  });

  it("should create tool-call step", () => {
    const chunk = {
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      input: { location: "New York" },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };

    const result = createStepFromChunk(chunk);

    expect(result).toEqual({
      id: "call-123",
      type: "tool_call",
      name: "getWeather",
      arguments: { location: "New York" },
      content: JSON.stringify([
        {
          type: "tool-call",
          toolCallId: "call-123",
          toolName: "getWeather",
          args: { location: "New York" },
        },
      ]),
      role: "assistant",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
  });

  it("should create tool_call step (alternative format)", () => {
    const chunk = {
      type: "tool_call",
      toolCallId: "call-456",
      toolName: "getTime",
      input: { timezone: "UTC" },
    };

    const result = createStepFromChunk(chunk);

    expect(result).toEqual({
      id: "call-456",
      type: "tool_call",
      name: "getTime",
      arguments: { timezone: "UTC" },
      content: JSON.stringify([
        {
          type: "tool-call",
          toolCallId: "call-456",
          toolName: "getTime",
          args: { timezone: "UTC" },
        },
      ]),
      role: "assistant",
      usage: undefined,
    });
  });

  it("should create tool-result step", () => {
    const chunk = {
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      output: { temperature: 72, location: "New York" },
    };

    const result = createStepFromChunk(chunk);

    expect(result).toEqual({
      id: "call-123",
      type: "tool_result",
      name: "getWeather",
      result: { temperature: 72, location: "New York" },
      content: JSON.stringify([
        {
          type: "tool-result",
          toolCallId: "call-123",
          toolName: "getWeather",
          result: { temperature: 72, location: "New York" },
        },
      ]),
      role: "assistant",
      usage: undefined,
    });
  });

  it("should create tool_result step (alternative format)", () => {
    const chunk = {
      type: "tool_result",
      toolCallId: "call-456",
      toolName: "getTime",
      output: { time: "2024-01-01T00:00:00Z" },
    };

    const result = createStepFromChunk(chunk);

    expect(result).toEqual({
      id: "call-456",
      type: "tool_result",
      name: "getTime",
      result: { time: "2024-01-01T00:00:00Z" },
      content: JSON.stringify([
        {
          type: "tool-result",
          toolCallId: "call-456",
          toolName: "getTime",
          result: { time: "2024-01-01T00:00:00Z" },
        },
      ]),
      role: "assistant",
      usage: undefined,
    });
  });

  it("should return null for unsupported chunk type", () => {
    const chunk = {
      type: "unsupported",
      data: "some data",
    };

    const result = createStepFromChunk(chunk);

    expect(result).toBeNull();
  });

  it("should return null for text chunk without text", () => {
    const chunk = {
      type: "text",
      // missing text property
    };

    const result = createStepFromChunk(chunk);

    expect(result).toBeNull();
  });
});

function createSDKError(payload: {
  message: string;
  code: string;
  [key: string]: DangerouslyAllowAny;
}): AISDKError {
  const { message, ...restData } = payload;
  const error = new Error(message);
  for (const [key, value] of Object.entries(restData)) {
    (error as DangerouslyAllowAny)[key] = value;
  }
  return error as AISDKError;
}

describe("createVoltagentErrorFromSdkError", () => {
  it("should create tool execution error", () => {
    const sdkError = createSDKError({
      message: "API rate limit exceeded",
      code: "RATE_LIMIT",
      toolCallId: "call-123",
      toolName: "getWeather",
      input: { location: "New York" },
    });

    const result = createVoltagentErrorFromSdkError(sdkError);

    expect(result).toEqual({
      message: "Error during Vercel SDK operation (tool 'getWeather'): API rate limit exceeded",
      originalError: sdkError,
      toolError: {
        toolCallId: "call-123",
        toolName: "getWeather",
        toolArguments: { location: "New York" },
        toolExecutionError: sdkError,
      },
      stage: "tool_execution",
      code: "RATE_LIMIT",
    });
  });

  it("should create general error from Error instance", () => {
    const error = new Error("Network timeout");
    (error as any).code = "NETWORK_ERROR";

    const result = createVoltagentErrorFromSdkError(error, "llm_stream");

    expect(result).toEqual({
      message: "Network timeout",
      originalError: error,
      toolError: undefined,
      stage: "llm_stream",
      code: "NETWORK_ERROR",
    });
  });

  it("should create error from SDK error object", () => {
    const sdkError = {
      error: new Error("Invalid response format"),
    };

    const result = createVoltagentErrorFromSdkError(sdkError, "object_stream");

    expect(result).toEqual({
      message: "Invalid response format",
      originalError: expect.any(Error),
      toolError: undefined,
      stage: "object_stream",
      code: undefined,
    });
  });

  it("should create generic error for unknown error type", () => {
    const unknownError = "string error";

    const result = createVoltagentErrorFromSdkError(unknownError, "llm_generate");

    expect(result).toEqual({
      message: "An unknown error occurred during Vercel AI operation (stage: llm_generate)",
      originalError: expect.any(Error),
      toolError: undefined,
      stage: "llm_generate",
      code: undefined,
    });
  });

  it("should use default stage when not provided", () => {
    const error = new Error("Test error");

    const result = createVoltagentErrorFromSdkError(error);

    expect(result.stage).toBe("llm_stream");
  });
});

describe("mapToStreamPart", () => {
  it("should map text-delta part", () => {
    const part = {
      type: "text-delta",
      id: "text-1",
      text: "Hello",
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "text-delta",
      textDelta: "Hello",
    });
  });

  it("should map reasoning part", () => {
    const part = {
      type: "reasoning-delta",
      id: "reasoning-1",
      text: "Let me think about this...",
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "reasoning",
      reasoning: "Let me think about this...",
    });
  });

  it("should map source part", () => {
    const part = {
      type: "source",
      sourceType: "url",
      id: "source-1",
      url: "https://example.com",
      title: "Example",
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "source",
      source: "https://example.com",
    });
  });

  it("should map source part with empty url", () => {
    const part = {
      type: "source",
      sourceType: "url",
      id: "source-2",
      url: "",
      title: "",
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "source",
      source: "",
    });
  });

  it("should map tool-call part", () => {
    const part = {
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      input: { location: "New York" },
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      args: { location: "New York" },
    });
  });

  it("should map tool-result part", () => {
    const part = {
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      output: { temperature: 72 },
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      result: { temperature: 72 },
    });
  });

  it("should map finish part with usage", () => {
    const part = {
      type: "finish",
      finishReason: "stop",
      totalUsage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "finish",
      finishReason: "stop",
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  it("should map finish part without usage", () => {
    const part = {
      type: "finish",
      finishReason: "stop",
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "finish",
      finishReason: "stop",
      usage: undefined,
    });
  });

  it("should map error part", () => {
    const error = new Error("Something went wrong");
    const part = {
      type: "error",
      error,
    } as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toEqual({
      type: "error",
      error,
    });
  });

  it("should return null for unsupported part type", () => {
    const part = {
      type: "unsupported",
      data: "some data",
    } as unknown as TextStreamPart<ToolSet>;

    const result = mapToStreamPart(part);

    expect(result).toBeNull();
  });
});

describe("createMappedFullStream", () => {
  it("should map stream parts correctly", async () => {
    const originalStream = (async function* () {
      yield { type: "text-delta", id: "text-1", text: "Hello" };
      yield { type: "tool-call", toolCallId: "call-123", toolName: "getWeather", input: {} };
      yield { type: "tool-result", toolCallId: "call-123", toolName: "getWeather", output: {} };
      yield { type: "finish", finishReason: "stop" };
    })() as unknown as AsyncIterable<TextStreamPart<ToolSet>>;

    const mappedStream = createMappedFullStream(originalStream);
    const results: StreamPart[] = [];

    for await (const part of mappedStream) {
      results.push(part);
    }

    expect(results).toHaveLength(4);
    expect(results[0]).toEqual({ type: "text-delta", textDelta: "Hello" });
    expect(results[1]).toEqual({
      type: "tool-call",
      toolCallId: "call-123",
      toolName: "getWeather",
      args: {},
    });
    expect(results[2]).toEqual({
      type: "tool-result",
      toolCallId: "call-123",
      toolName: "getWeather",
      result: {},
    });
    expect(results[3]).toEqual({ type: "finish", finishReason: "stop" });
  });

  it("should filter out unsupported parts", async () => {
    const originalStream = (async function* () {
      yield { type: "text-delta", id: "text-1", text: "Hello" };
      yield { type: "unsupported", data: "should be filtered" };
      yield { type: "finish", finishReason: "stop" };
    })() as unknown as AsyncIterable<TextStreamPart<ToolSet>>;

    const mappedStream = createMappedFullStream(originalStream);
    const results: StreamPart[] = [];

    for await (const part of mappedStream) {
      results.push(part);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ type: "text-delta", textDelta: "Hello" });
    expect(results[1]).toEqual({ type: "finish", finishReason: "stop" });
  });

  it("should handle empty stream", async () => {
    const originalStream = (async function* () {
      // Empty stream
    })();

    const mappedStream = createMappedFullStream(originalStream);
    const results: StreamPart[] = [];

    for await (const part of mappedStream) {
      results.push(part);
    }

    expect(results).toHaveLength(0);
  });
});
