import { convertArrayToReadableStream, convertAsyncIterableToArray } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { ModelMessage } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { VercelAIProvider } from "./provider";
import { createMockModel } from "./testing";

describe("custom", () => {
  let provider: VercelAIProvider;

  beforeEach(() => {
    provider = new VercelAIProvider();
  });

  describe("streamText", () => {
    let mockModel: MockLanguageModelV2;

    beforeEach(() => {
      mockModel = new MockLanguageModelV2({
        doStream: async () => ({
          stream: convertArrayToReadableStream([
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "Hello" },
            { type: "text-delta", id: "text-1", delta: ", " },
            { type: "text-delta", id: "text-1", delta: "world!" },
            { type: "text-end", id: "text-1" },
            {
              type: "finish",
              finishReason: "stop",
              logprobs: undefined,
              usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
            },
          ]),
        }),
      });
    });

    it("should include fullStream", async () => {
      const result = await provider.streamText({
        messages: [{ role: "user", content: "Hello!" }],
        model: mockModel,
      });

      expect(result.fullStream).toBeDefined();
      expect(await convertAsyncIterableToArray(result.fullStream)).toEqual([
        { type: "text-delta", textDelta: "Hello" },
        { type: "text-delta", textDelta: ", " },
        { type: "text-delta", textDelta: "world!" },
        {
          type: "finish",
          finishReason: "stop",
          usage: { promptTokens: 3, completionTokens: 10, totalTokens: 13 },
        },
      ]);
    });

    it("should handle tools in streamText", async () => {
      const toolModel = new MockLanguageModelV2({
        doStream: async () => ({
          stream: convertArrayToReadableStream([
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: "I'll help you with that." },
            { type: "text-end", id: "text-1" },
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              toolCallType: "function",
              input: JSON.stringify({ location: "New York" }),
            },
            {
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 5, outputTokens: 15, totalTokens: 20 },
            },
          ]),
        }),
      });

      const tools = [
        {
          id: "get_weather",
          name: "get_weather",
          description: "Get weather information",
          parameters: z.object({ location: z.string() }),
          execute: vi.fn(() => Promise.resolve({ temperature: 72, condition: "sunny" })),
        },
      ];

      const onStepFinish = vi.fn();

      const result = await provider.streamText({
        messages: [{ role: "user", content: "What's the weather?" }],
        model: toolModel,
        tools,
        onStepFinish,
      });
      await convertAsyncIterableToArray(result.textStream);

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          content: "I'll help you with that.",
        }),
      );

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool_call",
          name: "get_weather",
          arguments: { location: "New York" },
        }),
      );

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool_result",
          name: "get_weather",
          result: { temperature: 72, condition: "sunny" },
        }),
      );
    });

    it("should handle a fatal error", async () => {
      const p = new VercelAIProvider();
      p.toMessage = () => {
        throw new Error("Fatal error");
      };
      const mockModel = new MockLanguageModelV2({
        doStream: async () => {
          throw new Error("Fatal error");
        },
      });

      try {
        await p.streamText({
          messages: [{ role: "user", content: "What's the weather?" }],
          model: mockModel,
        });
      } catch (error) {
        expect(error).toEqual(
          expect.objectContaining({
            message: "Fatal error",
            stage: "llm_stream",
          }),
        );
      }
    });
  });

  describe("generateText", () => {
    it("should handle tools in generateText", async () => {
      const mockModel = new MockLanguageModelV2({
        doGenerate: async () => ({
          content: [
            { type: "text", text: "I'll help you with that." },
            {
              type: "tool-call",
              toolCallType: "function",
              toolCallId: "call_123",
              toolName: "get_weather",
              input: JSON.stringify({ location: "New York" }),
            },
          ],
          finishReason: "stop",
          usage: { inputTokens: 5, outputTokens: 15, totalTokens: 20 },
          warnings: [],
        }),
      });

      const tools = [
        {
          id: "get_weather",
          name: "get_weather",
          description: "Get weather information",
          parameters: z.object({ location: z.string() }),
          execute: vi.fn(() => Promise.resolve({ temperature: 72, condition: "sunny" })),
        },
      ];

      const onStepFinish = vi.fn();

      const result = await provider.generateText({
        messages: [{ role: "user", content: "What's the weather?" }],
        model: mockModel,
        tools,
        onStepFinish,
      });

      expect(result.toolCalls).toEqual([
        {
          toolCallId: "call_123",
          toolName: "get_weather",
          input: { location: "New York" },
          type: "tool-call",
          providerExecuted: undefined,
          providerMetadata: undefined,
        },
      ]);

      expect(result.toolResults).toEqual([
        {
          dynamic: false,
          toolCallId: "call_123",
          toolName: "get_weather",
          input: { location: "New York" },
          output: { temperature: 72, condition: "sunny" },
          type: "tool-result",
        },
      ]);

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          content: "I'll help you with that.",
        }),
      );

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool_call",
          name: "get_weather",
          arguments: { location: "New York" },
        }),
      );

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool_result",
          name: "get_weather",
          result: { temperature: 72, condition: "sunny" },
        }),
      );
    });
  });

  describe("generateObject", () => {
    it("should format object response with JSON format in onStepFinish", async () => {
      const mockModel = new MockLanguageModelV2({
        modelId: "mock-model",
        doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify({ name: "John", age: 30 }) }],
          finishReason: "stop",
          usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
          warnings: [],
        }),
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const onStepFinish = vi.fn();

      await provider.generateObject({
        messages: [{ role: "user", content: "Create a person object" }],
        model: mockModel,
        schema,
        onStepFinish,
      });

      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          content: '{"name":"John","age":30}',
          role: "assistant",
        }),
      );
    });
  });

  describe("streamObject", () => {
    it("should format streamed object with JSON format in onStepFinish", async () => {
      const mockModel = createMockModel({
        name: "John",
        age: 30,
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const onStepFinish = vi.fn();

      const result = await provider.streamObject({
        messages: [{ role: "user", content: "Create a person object" }],
        model: mockModel,
        schema,
        onStepFinish,
      });
      await convertAsyncIterableToArray(result.objectStream);

      // The onStepFinish should be called with the final JSON string
      expect(onStepFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          content: '{"name":"John","age":30}',
          role: "assistant",
        }),
      );
    });
  });

  describe("toMessage", () => {
    it("should convert BaseMessage to ModelMessage", () => {
      const baseMessage = {
        role: "user" as const,
        content: "Hello, world!",
      };

      const result = provider.toMessage(baseMessage);
      expectTypeOf(result).toMatchTypeOf<ModelMessage>();
    });
  });
});
