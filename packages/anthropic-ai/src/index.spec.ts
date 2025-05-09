import Anthropic from "@anthropic-ai/sdk";
//@ts-ignore
import { EventSourceParser } from "@anthropic-ai/sdk/lib/streaming";
import { createTool } from "@voltagent/core";
import type { BaseMessage } from "@voltagent/core";
import { z } from "zod";
import { AnthropicProvider } from ".";

jest.mock("@anthropic-ai/sdk");

describe("AnthropicProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateText", () => {
    it("should generate text", async () => {
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            id: "msg_123456789",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: "Hello, I am a test response!" }],
            model: "claude-3-7-sonnet-20250219",
            stop_reason: "end_turn",
            usage: {
              input_tokens: 10,
              output_tokens: 20,
            },
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => {
        return mockAnthropicClient as unknown as Anthropic;
      });

      const provider = new AnthropicProvider({
        apiKey: "sk-ant-api03-test-key",
      });

      const result = await provider.generateText({
        messages: [
          { role: "system" as const, content: "You are a helpful assistant." },
          { role: "user" as const, content: "Hello!" },
        ],
        model: "claude-3-7-sonnet-20250219",
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("Hello, I am a test response!");
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);

      // Verify system message handling
      const createParams = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(createParams.messages.length).toBe(1);
      expect(createParams.messages[0].role).toBe("user");
      expect(createParams.system).toContain("You are a helpful assistant.");
    });
    it("should accept tools", async () => {
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            id: "msg_123456789",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: "Hello, I am a test response!" }],
            model: "claude-3-7-sonnet-20250219",
            stop_reason: "end_turn",
            usage: {
              input_tokens: 10,
              output_tokens: 20,
            },
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => {
        return mockAnthropicClient as unknown as Anthropic;
      });

      const provider = new AnthropicProvider({
        apiKey: "sk-ant-api03-test-key",
      });
      createTool({
        id: "test-tool",
        name: "test-tool",
        description: "This is a test tool",
        parameters: z.object({
          name: z.string(),
        }),
        execute: jest.fn().mockResolvedValue("test-tool-response"),
      });

      const tool = createTool({
        id: "test-tool",
        name: "test-tool",
        description: "This is a test tool",
        parameters: z.object({
          name: z.string(),
        }),
        execute: jest.fn().mockResolvedValue("test-tool-response"),
      });

      const result = await provider.generateText({
        messages: [{ role: "user", content: "Hello!" }],
        model: "claude-3-7-sonnet -20250219",
        tools: [tool],
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("Hello, I am a test response!");
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: expect.any(Array),
        }),
      );
    });
  });

  describe("streamText", () => {
    it("should stream text", async () => {
      // Create a mock stream function for Anthropic's streaming response
      const mockStreamFn = jest.fn().mockImplementation(() => {
        let mockIndex = 0;
        let isControllerClosed = false;
        // Mock response chunks
        const mockChunks = [
          { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: ", " } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "world!" } },
          {
            type: "message_stop",
            message: {
              id: "msg_1234",
              type: "message",
              role: "assistant",
              content: [{ type: "text", text: "Hello, world!" }],
              model: "claude-3-7-sonnet-20250219",
              stop_reason: "end_turn",
              usage: { input_tokens: 3, output_tokens: 10 },
            },
          },
        ];

        // Create a ReadableStream that will emit our mock chunks
        return new ReadableStream({
          start(controller) {
            function emitNext() {
              if (mockIndex < mockChunks.length && !isControllerClosed) {
                controller.enqueue(mockChunks[mockIndex++]);
                if (mockIndex < mockChunks.length) {
                  setTimeout(emitNext, 10); // Emit chunks with slight delay to simulate streaming
                } else if (!isControllerClosed) {
                  isControllerClosed = true;
                  controller.close();
                }
              }
            }

            emitNext();
          },
        });
      });

      // Set up our mock Anthropic client
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockImplementation((params) => {
            if (params.stream) {
              return mockStreamFn();
            }
            throw new Error("Non-streaming call made when stream was expected");
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => {
        return mockAnthropicClient as unknown as Anthropic;
      });

      const provider = new AnthropicProvider({
        apiKey: "sk-ant-api03-test-key",
      });

      // Setup accumulator for streamed chunks
      let accumulatedText = "";

      // Test streaming
      const stream = await provider.streamText({
        messages: [
          { role: "system" as const, content: "You are a helpful assistant." },
          { role: "user" as const, content: "Hello!" },
        ],
        model: "claude-3-7-sonnet-20250219",
      });

      // Process the stream
      const reader = stream.textStream.getReader();
      const chunks = [];

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (!done) {
          chunks.push(result.value);
          accumulatedText += result.value;
        }
      }

      // Assertions
      expect(chunks.length).toBeGreaterThan(0);
      expect(accumulatedText).toBe("Hello, world!");
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);

      // Verify system message handling
      const createParams = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(createParams.messages.length).toBe(1);
      expect(createParams.messages[0].role).toBe("user");
      expect(createParams.system).toContain("You are a helpful assistant.");

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        }),
      );
    });
  });

  describe("generateObjects", () => {
    it("should generate object", async () => {
      const testObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            id: "msg_123456789",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: JSON.stringify(testObject) }],
            model: "claude-3-7-sonnet-20250219",
            stop_reason: "end_turn",
            usage: {
              input_tokens: 10,
              output_tokens: 20,
            },
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => {
        return mockAnthropicClient as unknown as Anthropic;
      });

      const provider = new AnthropicProvider({
        apiKey: "sk-ant-api03-test-key",
      });
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });
      const result = await provider.generateObject({
        messages: [
          { role: "system" as const, content: "You are a helpful assistant." },
          { role: "user" as const, content: "Get user info" },
        ],
        model: "claude-3-7-sonnet-20250219",
        schema,
      });

      expect(result).toBeDefined();
      expect(result.object).toEqual(testObject);

      // Verify system message handling
      const createParams = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(createParams.messages.length).toBe(1);
      expect(createParams.messages[0].role).toBe("user");
      expect(createParams.system).toContain("You are a helpful assistant.");
      expect(createParams.system).toContain("You must return the response in valid JSON Format");
    });

    it("should format object response with JSON format in onStepFinish for AnthropicProvider", async () => {
      const testObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };

      // Mock the onStepFinish callback
      const onStepFinishMock = jest.fn();

      // Create a mock for Anthropic client
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [
              {
                type: "text",
                text: JSON.stringify(testObject),
              },
            ],
            stop_reason: "stop",
            usage: {
              input_tokens: 10,
              output_tokens: 20,
            },
          }),
        },
      };

      // Create an instance of AnthropicProvider with the mock client
      const anthropicProvider = new AnthropicProvider({
        client: mockAnthropicClient as any,
      });

      // Create a spy for the createStepFromChunk function from utils
      const createStepFromChunkSpy = jest.spyOn(require("./utils"), "createStepFromChunk");
      createStepFromChunkSpy.mockReturnValue({
        id: "",
        role: "assistant",
        content: JSON.stringify(testObject),
        type: "text",
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      // Call our generateObject method
      const result = await anthropicProvider.generateObject({
        messages: [{ role: "user", content: "Get user info" }],
        model: "claude-3-7-sonnet-20250219",
        schema,
        onStepFinish: onStepFinishMock,
        provider: {
          maxTokens: 1024,
          temperature: 0.7,
        },
      });

      // ASSERTION 1: Was Anthropic's messages.create called with correct parameters?
      const createCall = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(createCall.messages).toEqual(expect.any(Array));
      expect(createCall.model).toBe("claude-3-7-sonnet-20250219");
      expect(createCall.max_tokens).toBe(1024);
      expect(createCall.temperature).toBe(0.7);
      expect(createCall.stream).toBe(false);
      expect(createCall.system).toEqual(expect.any(String));

      // ASSERTION 2: Was createStepFromChunk called with the right parameters?
      const createStepCall = createStepFromChunkSpy.mock.calls[0][0] as {
        type: string;
        text: string;
        usage: { input_tokens: number; output_tokens: number };
      };
      expect(createStepCall.type).toBe("text");
      expect(createStepCall.text).toBe(JSON.stringify(testObject));
      expect(createStepCall.usage).toEqual({
        input_tokens: 10,
        output_tokens: 20,
      });

      // ASSERTION 3: Was onStepFinish called?
      expect(onStepFinishMock).toHaveBeenCalled();

      // ASSERTION 4: Was onStepFinish called with the correct step?
      const step = onStepFinishMock.mock.calls[0][0];
      expect(step).toBeDefined();
      expect(step.role).toBe("assistant");
      expect(step.type).toBe("text");

      // ASSERTION 5: Parse the content to verify it matches the expected format
      const parsedContent = JSON.parse(step.content);
      expect(parsedContent).toEqual(testObject);
      expect(result.object).toEqual(testObject);
    });
  });

  describe("streamObjects", () => {
    it("should stream object", async () => {
      const testObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };
      const mockStreamFn = jest.fn().mockImplementation(() => {
        let mockIndex = 0;
        let isControllerClosed = false;
        // Mock response chunks
        const anthropicStreamChunks = [
          {
            type: "content_block_start",
            index: 0,
            content_block: {
              type: "text",
              text: "",
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: "{",
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: '\n  "name": "John Doe",',
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: '\n  "age": 30,',
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: '\n  "hobbies": [',
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: '"reading", ',
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: '"gaming"]',
            },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: {
              type: "text_delta",
              text: "\n}",
            },
          },
          {
            type: "content_block_stop",
            index: 0,
          },
          {
            type: "message_stop",
            message: {
              id: "msg_12345abcde",
              type: "message",
              role: "assistant",
              model: "claude-3-7-sonnet-20250219",
              content: [
                {
                  type: "text",
                  text: '{\n  "name": "John Doe",\n  "age": 30,\n  "hobbies": ["reading", "gaming"]\n}',
                },
              ],
              stop_reason: "end_turn",
              stop_sequence: null,
              usage: {
                input_tokens: 15,
                output_tokens: 25,
              },
            },
          },
        ];

        // Create a ReadableStream that will emit our mock chunks
        return new ReadableStream({
          start(controller) {
            function emitNext() {
              if (mockIndex < anthropicStreamChunks.length && !isControllerClosed) {
                controller.enqueue(anthropicStreamChunks[mockIndex++]);
                if (mockIndex < anthropicStreamChunks.length) {
                  setTimeout(emitNext, 10); // Emit chunks with slight delay to simulate streaming
                } else if (!isControllerClosed) {
                  isControllerClosed = true;
                  controller.close();
                }
              }
            }

            emitNext();
          },
        });
      });

      // Set up our mock Anthropic client
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockImplementation((params) => {
            if (params.stream) {
              return mockStreamFn();
            }
            throw new Error("Non-streaming call made when stream was expected");
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => {
        return mockAnthropicClient as unknown as Anthropic;
      });

      const provider = new AnthropicProvider({
        apiKey: "sk-ant-api03-test-key",
      });

      // Define schema for object validation
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      // Test streaming with the object schema
      const result = await provider.streamObject({
        messages: [
          { role: "system" as const, content: "You are a helpful assistant." },
          { role: "user" as const, content: "Get user info" },
        ],
        model: "claude-3-7-sonnet-20250219",
        schema,
      });

      expect(result).toBeDefined();
      expect(result.objectStream).toBeDefined();

      // Verify system message handling
      const createParams = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(createParams.messages.length).toBe(1);
      expect(createParams.messages[0].role).toBe("user");
      expect(createParams.system).toContain("You are a helpful assistant.");
      expect(createParams.system).toContain("You must return the response in valid JSON Format");

      // Process the stream
      const reader = result.objectStream.getReader();
      const chunks = [];

      let done = false;
      let accumulatedObject = {} as any;

      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (!done) {
          chunks.push(chunk.value);
          // Merge the chunks into our accumulated object
          accumulatedObject = { ...accumulatedObject, ...chunk.value };
        }
      }

      // Validate the final object
      expect(chunks.length).toBeGreaterThan(0);
      expect(accumulatedObject).toEqual(testObject);

      // Verify the object structure matches our schema
      expect(accumulatedObject.name).toBe("John Doe");
      expect(accumulatedObject.age).toBe(30);
      expect(Array.isArray(accumulatedObject.hobbies)).toBe(true);
      expect(accumulatedObject.hobbies).toEqual(["reading", "gaming"]);
    });

    it("should format streamed object with JSON format in onStepFinish", async () => {
      const expectedObject = {
        name: "John Doe",
        age: 30,
        hobbies: ["reading", "gaming"],
      };

      // Mock the onStepFinish callback
      const onStepFinishMock = jest.fn();

      // Create a mock stream function for Anthropic's streaming response
      const mockStreamFn = jest.fn().mockImplementation(() => {
        let mockIndex = 0;
        let isControllerClosed = false;
        // Mock response chunks that will form a valid JSON
        const mockChunks = [
          { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "{" } },
          {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: '"name": "John Doe",' },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: '"age": 30,' },
          },
          {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: '"hobbies": ["reading", "gaming"]' },
          },
          { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "}" } },
          {
            type: "message_stop",
            message: {
              id: "msg_1234",
              type: "message",
              role: "assistant",
              content: [{ type: "text", text: JSON.stringify(expectedObject) }],
              model: "claude-3-7-sonnet-20250219",
              stop_reason: "end_turn",
              usage: { input_tokens: 3, output_tokens: 10 },
            },
          },
        ];

        return new ReadableStream({
          start(controller) {
            function emitNext() {
              if (mockIndex < mockChunks.length && !isControllerClosed) {
                controller.enqueue(mockChunks[mockIndex++]);
                if (mockIndex < mockChunks.length) {
                  setTimeout(emitNext, 10);
                } else if (!isControllerClosed) {
                  isControllerClosed = true;
                  controller.close();
                }
              }
            }
            emitNext();
          },
        });
      });

      // Set up our mock Anthropic client
      const mockAnthropicClient = {
        messages: {
          create: jest.fn().mockImplementation((params) => {
            if (params.stream) {
              return mockStreamFn();
            }
            throw new Error("Non-streaming call made when stream was expected");
          }),
        },
      };

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => {
        return mockAnthropicClient as unknown as Anthropic;
      });

      const provider = new AnthropicProvider({
        apiKey: "sk-ant-api03-test-key",
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
        hobbies: z.array(z.string()),
      });

      // Test streaming with object schema
      const result = await provider.streamObject({
        messages: [{ role: "user", content: "Get user info" }],
        model: "claude-3-7-sonnet-20250219",
        schema,
        onStepFinish: onStepFinishMock,
      });
      expect(result).toBeDefined();
      expect(result.objectStream).toBeDefined();

      // Process the stream
      const reader = result.objectStream.getReader();
      const chunks = [];
      let accumulatedObject = {};

      let done = false;
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (!done) {
          chunks.push(chunk.value);
          accumulatedObject = { ...accumulatedObject, ...chunk.value };
        }
      }

      // Wait for any pending promises/timeouts
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify onStepFinish was called
      expect(onStepFinishMock).toHaveBeenCalled();

      // Verify the accumulated object matches expected
      expect(accumulatedObject).toEqual(expectedObject);

      // Verify the mock client was called correctly
      const createCall = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(createCall.stream).toBe(true);
      expect(createCall.system).toMatch(/.*JSON Format.*/);
    });
  });

  describe("toMessage", () => {
    const provider = new AnthropicProvider({
      apiKey: "sk-ant-api03-test-key",
    });

    it("should map basic message correctly", () => {
      const message: BaseMessage = {
        role: "user",
        content: "Hello",
      };

      const result = provider.toMessage(message);

      expect(result).toEqual({
        role: "user",
        content: "Hello",
      });
    });

    it("should map message with function call", () => {
      const message: BaseMessage = {
        role: "assistant",
        content: "Hello",
      };

      const result = provider.toMessage(message);
      expect(result).toEqual({
        role: "assistant",
        content: "Hello",
      });
    });
  });

  describe("toTool", () => {
    const provider = new AnthropicProvider({
      apiKey: "sk-ant-api03-test-key",
    });

    it("should convert a tool to Anthropic format", () => {
      // Create a tool using createTool function
      const toolOptions = createTool({
        id: "search-tool",
        name: "search",
        description: "Search for information on the web",
        parameters: z.object({
          query: z.string().describe("The search query"),
          limit: z.number().optional().describe("Maximum number of results to return"),
        }),
        execute: jest.fn().mockResolvedValue("search results"),
      });

      const tool = createTool(toolOptions);

      // Convert the tool to Anthropic format
      const anthropicTool = provider.toTool(tool);

      // Verify the converted tool has the correct structure
      expect(anthropicTool).toEqual(
        expect.objectContaining({
          name: "search",
          description: "Search for information on the web",
          input_schema: expect.objectContaining({
            type: "object",
            properties: expect.objectContaining({
              query: expect.objectContaining({
                type: "string",
                description: "The search query",
              }),
              limit: expect.objectContaining({
                type: "number",
              }),
            }),
            required: expect.arrayContaining(["query"]),
          }),
        }),
      );
    });
  });
});
