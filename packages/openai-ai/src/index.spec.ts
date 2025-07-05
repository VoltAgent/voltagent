import OpenAI from "openai";
import { createTool } from "@voltagent/core";
import type { BaseMessage } from "@voltagent/core";
import type { MockedClass } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAIProvider } from ".";

vi.mock("openai");

describe("OpenAIProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateText", () => {
    it("should generate text", async () => {
      const mockOpenAIClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: "Hello, I am a test response!",
                  },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
              },
            }),
          },
        },
      };

      (OpenAI as MockedClass<typeof OpenAI>).mockImplementation(() => {
        return mockOpenAIClient as unknown as OpenAI;
      });

      const provider = new OpenAIProvider("test-api-key");

      const result = await provider.generateText({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello!" },
        ],
        model: "gpt-4o",
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("Hello, I am a test response!");
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello!" },
          ],
        }),
      );
    });

    it("should handle tool calls", async () => {
      const mockOpenAIClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: "test_tool",
                          arguments: JSON.stringify({ arg1: "value1" }),
                        },
                      },
                    ],
                  },
                  finish_reason: "tool_calls",
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
              },
            }),
          },
        },
      };

      (OpenAI as MockedClass<typeof OpenAI>).mockImplementation(() => {
        return mockOpenAIClient as unknown as OpenAI;
      });

      const provider = new OpenAIProvider("test-api-key");
      const tool = createTool({
        name: "test_tool",
        description: "A test tool",
        parameters: z.object({ arg1: z.string() }),
        execute: vi.fn(),
      });

      const result = await provider.generateText({
        messages: [{ role: "user", content: "Use tool" }],
        model: "gpt-4o",
        tools: [tool],
      });

      expect(result).toBeDefined();
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls?.[0].name).toBe("test_tool");
      expect(result.toolCalls?.[0].arguments).toEqual({ arg1: "value1" });
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array),
          tool_choice: "auto",
        }),
      );
    });
  });

  describe("streamText", () => {
    it("should stream text", async () => {
      const mockStream = {
        [Symbol.asyncIterator]() {
          let i = 0;
          const chunks = [
            { choices: [{ delta: { content: "Hello" } }] },
            { choices: [{ delta: { content: ", " } }] },
            { choices: [{ delta: { content: "world!" } }] },
            { choices: [{ delta: {} }] }, // End of stream
          ];
          return {
            async next() {
              if (i < chunks.length) {
                return { value: chunks[i++], done: false };
              } else {
                return { value: undefined, done: true };
              }
            },
          };
        },
      };

      const mockOpenAIClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockStream),
          },
        },
      };

      (OpenAI as MockedClass<typeof OpenAI>).mockImplementation(() => {
        return mockOpenAIClient as unknown as OpenAI;
      });

      const provider = new OpenAIProvider("test-api-key");

      const streamResult = await provider.streamText({
        messages: [{ role: "user", content: "Stream me some text" }],
        model: "gpt-4o",
      });

      let accumulatedText = "";
      for await (const chunk of streamResult.textStream) {
        accumulatedText += chunk;
      }

      expect(accumulatedText).toBe("Hello, world!");
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        }),
      );
    });
  });

  describe("generateObject", () => {
    it("should generate an object", async () => {
      const testObject = { name: "Test", value: 123 };
      const mockOpenAIClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: JSON.stringify(testObject),
                  },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
              },
            }),
          },
        },
      };

      (OpenAI as MockedClass<typeof OpenAI>).mockImplementation(() => {
        return mockOpenAIClient as unknown as OpenAI;
      });

      const provider = new OpenAIProvider("test-api-key");
      const schema = z.object({ name: z.string(), value: z.number() });

      const result = await provider.generateObject({
        messages: [{ role: "user", content: "Generate an object" }],
        model: "gpt-4o",
        schema,
      });

      expect(result).toBeDefined();
      expect(result.object).toEqual(testObject);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        }),
      );
    });
  });

  describe("streamObject", () => {
    it("should stream an object", async () => {
      const testObject = { name: "Test", value: 123 };
      const mockStream = {
        [Symbol.asyncIterator]() {
          let i = 0;
          const chunks = [
            { choices: [{ delta: { content: '{"name":"Test"' } }] },
            { choices: [{ delta: { content: ',"value":123}' } }] },
            { choices: [{ delta: {} }] }, // End of stream
          ];
          return {
            async next() {
              if (i < chunks.length) {
                return { value: chunks[i++], done: false };
              } else {
                return { value: undefined, done: true };
              }
            },
          };
        },
      };

      const mockOpenAIClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(mockStream),
          },
        },
      };

      (OpenAI as MockedClass<typeof OpenAI>).mockImplementation(() => {
        return mockOpenAIClient as unknown as OpenAI;
      });

      const provider = new OpenAIProvider("test-api-key");
      const schema = z.object({ name: z.string(), value: z.number() });

      const streamResult = await provider.streamObject({
        messages: [{ role: "user", content: "Stream an object" }],
        model: "gpt-4o",
        schema,
      });

      let accumulatedObject = {};
      for await (const chunk of streamResult.objectStream) {
        accumulatedObject = { ...accumulatedObject, ...chunk };
      }

      expect(accumulatedObject).toEqual(testObject);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
          response_format: { type: "json_object" },
        }),
      );
    });
  });

  describe("toMessage", () => {
    const provider = new OpenAIProvider("test-api-key");

    it("should convert a user message", () => {
      const message: BaseMessage = { role: "user", content: "Hello" };
      const result = provider.toMessage(message);
      expect(result).toEqual({ role: "user", content: "Hello" });
    });

    it("should convert an assistant message", () => {
      const message: BaseMessage = { role: "assistant", content: "Hi" };
      const result = provider.toMessage(message);
      expect(result).toEqual({ role: "assistant", content: "Hi" });
    });

    it("should convert a system message", () => {
      const message: BaseMessage = { role: "system", content: "You are a bot" };
      const result = provider.toMessage(message);
      expect(result).toEqual({ role: "system", content: "You are a bot" });
    });

    it("should convert a tool message", () => {
      const message: BaseMessage = {
        role: "tool",
        content: "Tool output",
        toolCallId: "call_123",
      } as BaseMessage;
      const result = provider.toMessage(message);
      expect(result).toEqual({
        role: "tool",
        tool_call_id: "call_123",
        content: "Tool output",
      });
    });
  });

  describe("toTool", () => {
    const provider = new OpenAIProvider("test-api-key");

    it("should convert a tool to OpenAI format", () => {
      const tool = createTool({
        name: "get_weather",
        description: "Get current weather",
        parameters: z.object({
          location: z.string(),
        }),
        execute: vi.fn(),
      });

      const result = provider.toTool(tool);
      expect(result).toEqual({
        type: "function",
        function: {
          name: "get_weather",
          description: "Get current weather",
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            additionalProperties: false,
            properties: {
              location: {
                type: "string",
              },
            },
            required: ["location"],
            type: "object",
          },
        },
      });
    });
  });

  describe("getModelIdentifier", () => {
    const provider = new OpenAIProvider("test-api-key");

    it("should return the model string", () => {
      const model = "gpt-4o";
      const result = provider.getModelIdentifier(model);
      expect(result).toBe("gpt-4o");
    });
  });
});
