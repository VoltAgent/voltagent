import type { BaseMessage } from "@voltagent/core";
import type { Groq } from "groq-sdk";
import { z } from "zod";
import { GroqProvider } from "./index";

// Mock the Groq SDK
const mockCreate = jest.fn();
jest.mock("groq-sdk", () => {
  return {
    Groq: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
        // Mock models if needed for getModelIdentifier, though it just accesses id
        models: {
          retrieve: jest.fn().mockResolvedValue({ id: "mock-model-id" }),
        },
      };
    }),
  };
});

describe("GroqProvider", () => {
  let provider: GroqProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GroqProvider({ apiKey: "test-groq-api-key" });
  });

  describe("toMessage", () => {
    it("should convert BaseMessage with string content", () => {
      const baseMsg: BaseMessage = { role: "user", content: "Hello Groq!" };
      const expectedMsg: Groq.Chat.ChatCompletionUserMessageParam = {
        role: "user",
        content: "Hello Groq!",
      };
      expect(provider.toMessage(baseMsg)).toEqual(expectedMsg);
    });

    it("should convert BaseMessage with array content (text only) into Groq format", () => {
      const baseMsg: BaseMessage = {
        role: "user",
        content: [
          { type: "text", text: "First part." },
          { type: "text", text: "Second part." },
        ],
      };
      // Groq expects specific object shapes in the content array
      const expectedMsg: Groq.Chat.ChatCompletionUserMessageParam = {
        role: "user",
        content: [
          { type: "text", text: "First part." },
          { type: "text", text: "Second part." },
        ] as Array<Groq.Chat.ChatCompletionContentPartText>,
      };
      expect(provider.toMessage(baseMsg)).toEqual(expectedMsg);
    });

    it("should convert BaseMessage with array content (text and image) into Groq format", () => {
      const baseMsg: BaseMessage = {
        role: "user",
        content: [
          { type: "text", text: "Look at this image:" },
          {
            type: "image",
            image: "data:image/png;base64,base64_encoded_image_data",
            mimeType: "image/jpeg",
          },
        ],
      };
      // Groq expects specific object shapes for images
      const expectedMsg: Groq.Chat.ChatCompletionUserMessageParam = {
        role: "user",
        content: [
          { type: "text", text: "Look at this image:" },
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,base64_encoded_image_data" },
          },
        ] as Array<Groq.Chat.ChatCompletionContentPart>,
      };
      expect(provider.toMessage(baseMsg)).toEqual(expectedMsg);
    });

    it("should convert BaseMessage with single image object content into Groq format", () => {
      const baseMsg: BaseMessage = {
        role: "user",
        content: [
          {
            type: "image",
            image: "data:image/png;base64,base64_data",
            mimeType: "image/png",
          },
        ],
      };

      // Groq expects an array with a specific image object shape
      const expectedMsg: Groq.Chat.ChatCompletionUserMessageParam = {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,base64_data" },
          },
        ] as Array<Groq.Chat.ChatCompletionContentPartImage>,
      };
      expect(provider.toMessage(baseMsg)).toEqual(expectedMsg);
    });

    it("should map roles correctly (system, assistant, tool)", () => {
      const systemMsg: BaseMessage = {
        role: "system",
        content: "System prompt",
      };
      const assistantMsg: BaseMessage = {
        role: "assistant",
        content: "Assistant reply",
      };
      const toolMsg: BaseMessage = { role: "tool", content: "Tool result" }; // Tool role mapped to assistant

      const expectedSystem: Groq.Chat.ChatCompletionSystemMessageParam = {
        role: "system",
        content: "System prompt",
      };
      const expectedAssistant: Groq.Chat.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: "Assistant reply",
      };
      // Tool mapped to assistant
      const expectedToolAsAssistant: Groq.Chat.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: "Tool result",
      };

      expect(provider.toMessage(systemMsg)).toEqual(expectedSystem);
      expect(provider.toMessage(assistantMsg)).toEqual(expectedAssistant);
      expect(provider.toMessage(toolMsg)).toEqual(expectedToolAsAssistant);
    });

    it("should ensure system and assistant content is string", () => {
      const systemMsg: BaseMessage = {
        role: "system",
        content: [{ type: "text", text: "System text part" }],
      };
      const assistantMsg: BaseMessage = {
        role: "assistant",
        content: [{ type: "text", text: "Assistant text part" }],
      };

      const resultSystem = provider.toMessage(
        systemMsg,
      ) as Groq.Chat.ChatCompletionSystemMessageParam;
      const resultAssistant = provider.toMessage(
        assistantMsg,
      ) as Groq.Chat.ChatCompletionAssistantMessageParam;

      expect(typeof resultSystem.content).toBe("string");
      expect(resultSystem.content).toContain("System text part");
      expect(typeof resultAssistant.content).toBe("string");
      expect(resultAssistant.content).toBe("Assistant text part");
    });
  });

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const mockResponse = {
        id: "chatcmpl-mockId",
        object: "chat.completion",
        created: Date.now(),
        model: "llama3-8b-8192",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "This is a Groq response.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateText({
        messages: [{ role: "user", content: "Hello!" }],
        model: "llama3-8b-8192",
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("This is a Groq response.");
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
      expect(result.finishReason).toBe("stop");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Hello!" }],
          model: "llama3-8b-8192",
          temperature: 0.7, // Default temperature
        }),
      );
    });

    it("should handle provider options correctly", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Response with options." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      await provider.generateText({
        messages: [{ role: "user", content: "Hi!" }],
        model: "mixtral-8x7b-32768",
        provider: {
          temperature: 0.5,
          maxTokens: 100,
          topP: 0.8,
          stopSequences: ["--"],
          frequencyPenalty: 0.1,
          presencePenalty: 0.2,
        },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Hi!" }],
          model: "mixtral-8x7b-32768",
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.8,
          stop: ["--"],
          frequency_penalty: 0.1,
          presence_penalty: 0.2,
        }),
      );
    });

    it("should call onStepFinish correctly", async () => {
      const mockResponse = {
        choices: [{ message: { content: "Step finished." }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      };
      mockCreate.mockResolvedValueOnce(mockResponse);
      const onStepFinishMock = jest.fn();

      await provider.generateText({
        messages: [{ role: "user", content: "Step test" }],
        model: "llama3-8b-8192",
        onStepFinish: onStepFinishMock,
      });

      expect(onStepFinishMock).toHaveBeenCalledTimes(1);
      expect(onStepFinishMock).toHaveBeenCalledWith({
        id: "",
        type: "text",
        content: "Step finished.",
        role: "assistant",
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      });
    });
  });

  describe("streamText", () => {
    it("should stream text successfully and call callbacks", async () => {
      async function* mockStream() {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " " } }] };
        yield { choices: [{ delta: { content: "Groq!" } }] };
        yield {
          choices: [{ delta: null, finish_reason: "stop" }],
          x_groq: {
            usage: { prompt_tokens: 3, completion_tokens: 3, total_tokens: 6 },
          },
        };
      }
      mockCreate.mockResolvedValueOnce(mockStream());

      const onChunkMock = jest.fn();
      const onStepFinishMock = jest.fn();
      const onFinishMock = jest.fn();

      const result = await provider.streamText({
        messages: [{ role: "user", content: "Stream test" }],
        model: "llama3-8b-8192",
        onChunk: onChunkMock,
        onStepFinish: onStepFinishMock,
        onFinish: onFinishMock,
      });

      expect(result.textStream).toBeInstanceOf(ReadableStream);

      // Consume the stream
      const reader = result.textStream.getReader();
      let chunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks += value;
      }

      expect(chunks).toBe("Hello Groq!");
      expect(onChunkMock).toHaveBeenCalledTimes(3);
      expect(onChunkMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ content: "Hello" }));
      expect(onChunkMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ content: " " }));
      expect(onChunkMock).toHaveBeenNthCalledWith(3, expect.objectContaining({ content: "Groq!" }));
      expect(onStepFinishMock).toHaveBeenCalledTimes(1);
      expect(onStepFinishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Hello Groq!",
          usage: { promptTokens: 3, completionTokens: 3, totalTokens: 6 },
        }),
      );
      expect(onFinishMock).toHaveBeenCalledTimes(1);
      expect(onFinishMock).toHaveBeenCalledWith({ text: "Hello Groq!" });
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
    });
  });

  describe("generateObject", () => {
    it("should generate object successfully", async () => {
      const testSchema = z.object({
        name: z.string(),
        isValid: z.boolean(),
      });
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: JSON.stringify({ name: "Test Object", isValid: true }),
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 15, completion_tokens: 15, total_tokens: 30 },
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateObject({
        messages: [{ role: "user", content: "Generate object" }],
        model: "llama3-8b-8192",
        schema: testSchema,
      });

      expect(result).toBeDefined();
      expect(result.object).toEqual({ name: "Test Object", isValid: true });
      expect(result.usage).toEqual({
        promptTokens: 15,
        completionTokens: 15,
        totalTokens: 30,
      });
      expect(result.finishReason).toBe("stop");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "llama3-8b-8192",
          response_format: { type: "json_object" },
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }), // Check for system message
            expect.objectContaining({
              role: "user",
              content: "Generate object",
            }),
          ]),
        }),
      );
    });

    it("should throw error for invalid JSON response", async () => {
      const testSchema = z.object({ id: z.number() });
      const mockResponse = {
        choices: [{ message: { content: "{ invalid json" }, finish_reason: "stop" }],
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      await expect(
        provider.generateObject({
          messages: [{ role: "user", content: "Get ID" }],
          model: "llama3-8b-8192",
          schema: testSchema,
        }),
      ).rejects.toThrow(/^Failed to parse JSON response:/);
    });

    it("should throw error if response does not match schema", async () => {
      const testSchema = z.object({ count: z.number() });
      const mockResponse = {
        choices: [
          {
            message: { content: JSON.stringify({ count: "five" }) },
            finish_reason: "stop",
          }, // count is string, not number
        ],
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      await expect(
        provider.generateObject({
          messages: [{ role: "user", content: "Get count" }],
          model: "llama3-8b-8192",
          schema: testSchema,
        }),
      ).rejects.toThrow(); // Zod parse error
    });
  });

  describe("streamObject", () => {
    it("should stream object successfully and call callbacks", async () => {
      const testSchema = z.object({
        query: z.string(),
        count: z.number(),
        details: z.object({ nested: z.boolean() }),
      });

      const expectedObject = {
        query: "streaming test",
        count: 42,
        details: { nested: true },
      };
      const jsonString = JSON.stringify(expectedObject);
      const chunksContent = [
        jsonString.slice(0, 15),
        jsonString.slice(15, 30),
        jsonString.slice(30),
      ];

      async function* mockObjectStream() {
        for (const content of chunksContent) {
          yield { choices: [{ delta: { content } }] };
        }
        yield {
          choices: [{ delta: null, finish_reason: "stop" }],
          x_groq: {
            usage: { prompt_tokens: 10, completion_tokens: 25, total_tokens: 35 },
          },
        };
      }

      mockCreate.mockResolvedValueOnce(mockObjectStream());

      const onFinishMock = jest.fn();
      const onStepFinishMock = jest.fn();
      // onChunk is not a standard callback for streamObject in core, so we won't test it explicitly here,
      // but the raw stream consumption covers the chunking aspect.

      const result = await provider.streamObject({
        messages: [{ role: "user", content: "Stream an object" }],
        model: "llama3-8b-8192",
        schema: testSchema,
        onFinish: onFinishMock,
        onStepFinish: onStepFinishMock,
      });

      expect(result.objectStream).toBeInstanceOf(ReadableStream);

      // Consume the stream to verify its content
      const reader = result.objectStream.getReader();
      let accumulatedStreamData = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedStreamData += value;
      }

      expect(accumulatedStreamData).toBe(jsonString);

      // Verify mockCreate call
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "llama3-8b-8192",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }), // System message for JSON mode
            { role: "user", content: "Stream an object" },
          ]),
          response_format: { type: "json_object" },
          stream: true,
        }),
      );

      // Verify onFinish callback
      expect(onFinishMock).toHaveBeenCalledTimes(1);
      expect(onFinishMock).toHaveBeenCalledWith({
        object: expectedObject,
        usage: { promptTokens: 10, completionTokens: 25, totalTokens: 35 },
      });

      // Verify onStepFinish callback (for the final text accumulation)
      expect(onStepFinishMock).toHaveBeenCalledTimes(1);
      expect(onStepFinishMock).toHaveBeenCalledWith({
        id: "",
        type: "text",
        content: jsonString, // onStepFinish gets the full string
        role: "assistant",
        usage: { promptTokens: 10, completionTokens: 25, totalTokens: 35 },
      });
    });

    it("should handle parsing errors in onFinish gracefully", async () => {
      const testSchema = z.object({ name: z.string() });
      const invalidJsonChunk = '{"name": "test" Oops}'; // Invalid JSON

      async function* mockErrorStream() {
        yield { choices: [{ delta: { content: invalidJsonChunk } }] };
        yield {
          choices: [{ delta: null, finish_reason: "stop" }],
          x_groq: { usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } },
        };
      }
      mockCreate.mockResolvedValueOnce(mockErrorStream());
      const onErrorMock = jest.fn();
      const onFinishMock = jest.fn();

      const result = await provider.streamObject({
        messages: [{ role: "user", content: "stream invalid object" }],
        model: "llama3-70b-8192",
        schema: testSchema,
        onFinish: onFinishMock,
        onError: onErrorMock,
      });

      // Try to consume the stream, which should trigger the error in onFinish logic
      const reader = result.objectStream.getReader();
      try {
        // eslint-disable-next-line no-empty
        while (!(await reader.read()).done) {}
      } catch (_e) {
        // Error is expected due to parsing failure propagated to the stream controller
      }

      // onFinish should not be called if parsing fails and throws
      expect(onFinishMock).not.toHaveBeenCalled();
      // onError should be called by the stream processing logic
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error));
      expect(onErrorMock.mock.calls[0][0].message).toMatch(/Failed to parse streamed JSON/);
    });
  });
});
