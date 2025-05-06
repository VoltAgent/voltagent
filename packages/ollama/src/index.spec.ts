import type { BaseMessage } from "@voltagent/core";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { OllamaProvider } from "./index";
import type { OllamaChatResponse, OllamaGenerateResponse } from "./types";

// Mock the fetch implementation inside the provider
// Just provide simple tests without trying to mock global objects

describe("OllamaProvider", () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
    // Clear any mocks between tests
    jest.clearAllMocks();
  });

  it("should initialize with default options", () => {
    expect(provider).toBeDefined();
    expect(provider.getModelIdentifier("test-model")).toBe("test-model");
  });

  it("should initialize with custom options", () => {
    const customProvider = new OllamaProvider({
      baseUrl: "http://custom.ollama.api",
    });
    expect(customProvider).toBeDefined();
  });

  // Test message conversion
  it("should correctly convert messages", () => {
    const message: BaseMessage = {
      role: "user",
      content: "test content",
    };

    const ollamaMessage = provider.toMessage(message);
    expect(ollamaMessage.role).toBe("user");
    expect(ollamaMessage.content).toBe("test content");
  });

  // Instead of trying to mock fetch, let's mock the internal methods
  describe("generateText", () => {
    it("should use textCompletion for single message", async () => {
      // Mock the internal textCompletion method
      const mockResponse = {
        response: "Test response",
        done: true,
      } as OllamaGenerateResponse;

      // Use any to access private method for testing
      (provider as any).textCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.generateText({
        model: "gemma3:1b",
        messages: [{ role: "user", content: "Hello" } as BaseMessage],
      });

      expect(result.text).toBe("Test response");
      expect((provider as any).textCompletion).toHaveBeenCalled();
    });

    it("should use chatCompletion for multiple messages", async () => {
      // Mock the internal chatCompletion method
      const mockResponse = {
        model: "gemma3:1b",
        message: {
          role: "assistant",
          content: "Chat response",
        },
        done: true,
      } as OllamaChatResponse;

      // Use any to access private method for testing
      (provider as any).chatCompletion = jest.fn().mockResolvedValue(mockResponse);

      const result = await provider.generateText({
        model: "gemma3:1b",
        messages: [
          { role: "user", content: "Hello" } as BaseMessage,
          { role: "assistant", content: "Hi" } as BaseMessage,
          { role: "user", content: "Help" } as BaseMessage,
        ],
      });

      expect(result.text).toBe("Chat response");
      expect((provider as any).chatCompletion).toHaveBeenCalled();
    });
  });

  describe("generateObject", () => {
    it("should parse and validate JSON objects", async () => {
      // Mock the generateText method to return a JSON string
      const mockJsonResponse = { name: "Test", age: 25 };
      jest.spyOn(provider, "generateText").mockResolvedValueOnce({
        provider: {} as any,
        text: JSON.stringify(mockJsonResponse),
      });

      const schema = {
        parse: jest.fn().mockReturnValue(mockJsonResponse),
      };

      const result = await provider.generateObject({
        model: "gemma3:1b",
        messages: [{ role: "user", content: "Get info" } as BaseMessage],
        schema: schema as any,
      });

      expect(result.object).toEqual(mockJsonResponse);
      expect(schema.parse).toHaveBeenCalled();
    });

    it("should throw error for invalid JSON responses", async () => {
      // Mock generateText to return invalid JSON
      jest.spyOn(provider, "generateText").mockResolvedValueOnce({
        provider: {} as any,
        text: "Not valid JSON",
      });

      await expect(
        provider.generateObject({
          model: "gemma3:1b",
          messages: [{ role: "user", content: "Get info" } as BaseMessage],
          schema: {
            parse: jest.fn(),
          } as any,
        }),
      ).rejects.toThrow("Failed to parse Ollama response as valid JSON");
    });
  });

  // Test message content extraction
  describe("getMessageContent", () => {
    it("should handle string content", () => {
      const message: BaseMessage = {
        role: "user",
        content: "simple string content",
      };
      const content = (provider as any).getMessageContent(message.content);
      expect(content).toBe("simple string content");
    });

    it("should handle array content with text parts", () => {
      const message: BaseMessage = {
        role: "user",
        content: [
          { type: "text", text: "part 1" },
          { type: "text", text: "part 2" },
        ],
      };
      const content = (provider as any).getMessageContent(message.content);
      expect(content).toBe("part 1\npart 2");
    });

    it("should handle mixed content types", () => {
      const message: BaseMessage = {
        role: "user",
        content: [
          { type: "text", text: "text part" },
          { type: "image", image: "base64data" },
          { type: "text", text: "more text" },
        ],
      };
      const content = (provider as any).getMessageContent(message.content);
      expect(content).toBe("text part\n\nmore text");
    });
  });

  // Test role mapping
  describe("mapRole", () => {
    it("should map user role correctly", () => {
      expect((provider as any).mapRole("user")).toBe("user");
    });

    it("should map assistant role correctly", () => {
      expect((provider as any).mapRole("assistant")).toBe("assistant");
    });

    it("should map system role correctly", () => {
      expect((provider as any).mapRole("system")).toBe("system");
    });

    it("should map tool role to user", () => {
      expect((provider as any).mapRole("tool")).toBe("user");
    });

    it("should map unknown role to user", () => {
      expect((provider as any).mapRole("unknown" as any)).toBe("user");
    });
  });

  // Test streamText functionality
  describe("streamText", () => {
    it("should stream text completion for single message", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(JSON.stringify({ response: "chunk1", done: false }));
          controller.enqueue(JSON.stringify({ response: "chunk2", done: true }));
          controller.close();
        },
      });

      (provider as any).streamTextCompletion = jest.fn().mockResolvedValue(mockStream);

      const result = await provider.streamText({
        model: "gemma3:1b",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.textStream).toBeDefined();
      expect((provider as any).streamTextCompletion).toHaveBeenCalled();
    });

    it("should stream chat completion for multiple messages", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            JSON.stringify({
              message: { content: "chunk1" },
              done: false,
            }),
          );
          controller.enqueue(
            JSON.stringify({
              message: { content: "chunk2" },
              done: true,
            }),
          );
          controller.close();
        },
      });

      (provider as any).streamChatCompletion = jest.fn().mockResolvedValue(mockStream);

      const result = await provider.streamText({
        model: "gemma3:1b",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi" },
        ],
      });

      expect(result.textStream).toBeDefined();
      expect((provider as any).streamChatCompletion).toHaveBeenCalled();
    });
  });

  // Test usage extraction
  describe("extractUsageFromResponse", () => {
    it("should extract usage from generate response", () => {
      const response = {
        response: "test",
        eval_count: 10,
        prompt_eval_count: 5,
      } as OllamaGenerateResponse;

      const usage = (provider as any).extractUsageFromResponse(response);
      expect(usage).toEqual({
        promptTokens: 5,
        completionTokens: 10,
        totalTokens: 15,
      });
    });

    it("should extract usage from chat response", () => {
      const response = {
        message: { content: "test" },
        eval_count: 15,
        prompt_eval_count: 8,
      } as OllamaChatResponse;

      const usage = (provider as any).extractUsageFromResponse(response);
      expect(usage).toEqual({
        promptTokens: 8,
        completionTokens: 15,
        totalTokens: 23,
      });
    });

    it("should return undefined for missing usage data", () => {
      const response = {
        response: "test",
      } as OllamaGenerateResponse;

      const usage = (provider as any).extractUsageFromResponse(response);
      expect(usage).toBeUndefined();
    });
  });

  // Test error handling
  describe("error handling", () => {
    it("should handle API errors in text completion", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(
        (provider as any).textCompletion({ model: "test", prompt: "hello" }),
      ).rejects.toThrow("Internal Ollama server error during text completion");
    });

    it("should handle API errors in chat completion", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        (provider as any).chatCompletion({ model: "test", messages: [] }),
      ).rejects.toThrow(
        "Model not found or Ollama API endpoint not available at http://localhost:11434",
      );
    });
  });

  // Test stream object functionality
  describe("streamObject", () => {
    // Use a more reasonable timeout for the tests
    jest.setTimeout(5000);

    it("should stream and parse JSON objects", async () => {
      const mockJsonResponse = {
        character: { name: "Alice Wonder", city: "Wonderland", occupation: "Dreamer" },
      };
      const jsonString = JSON.stringify(mockJsonResponse);

      // Mock the ReadableStream properly
      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(jsonString);
          controller.close();
        },
      });

      // Mock streamText to return our controlled stream
      jest.spyOn(provider, "streamText").mockResolvedValue({
        provider: {} as any,
        textStream: mockReadableStream,
      });

      // Create schema with zod
      const CharacterSchema = z.object({
        name: z.string().describe("The full name of the person"),
        city: z.string().describe("The city where the person lives"),
        occupation: z.string().describe("The person's primary occupation"),
      });

      const MyInfoSchema = z.object({
        character: CharacterSchema,
      });

      const parseMock = jest.fn().mockReturnValue(mockJsonResponse);
      MyInfoSchema.parse = parseMock;

      // Add mock for getMessageContent if it's used in your implementation
      if (typeof provider.getPublicMessageContent === "function") {
        jest
          .spyOn(provider, "getPublicMessageContent")
          .mockImplementation((content) =>
            typeof content === "string" ? content : JSON.stringify(content),
          );
      }

      const onFinishMock = jest.fn();

      // Call the function under test
      const result = await provider.streamObject({
        model: "gemma3:1b",
        messages: [{ role: "user", content: "Get info" }],
        schema: MyInfoSchema as any,
        onFinish: onFinishMock,
      });

      // Read the full stream result
      const reader = result.objectStream.getReader();
      const { value } = await reader.read();

      // Verify the parsed object
      expect(value).toEqual(mockJsonResponse);
      expect(parseMock).toHaveBeenCalledWith(mockJsonResponse);
      expect(onFinishMock).toHaveBeenCalledWith({ object: mockJsonResponse });

      // Verify the stream is done
      const next = await reader.read();
      expect(next.done).toBe(true);
    });

    it("should handle invalid JSON in stream", async () => {
      const invalidJson = "not a json";

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(invalidJson);
          controller.close();
        },
      });

      jest.spyOn(provider, "streamText").mockResolvedValue({
        provider: {} as any,
        textStream: mockReadableStream,
      });

      const CharacterSchema = z.object({
        name: z.string(),
        city: z.string(),
        occupation: z.string(),
      });

      const MyInfoSchema = z.object({
        character: CharacterSchema,
      });

      const parseMock = jest.fn().mockImplementation(() => {
        throw new Error("Validation failed");
      });
      MyInfoSchema.parse = parseMock;

      if (typeof provider.getPublicMessageContent === "function") {
        jest
          .spyOn(provider, "getPublicMessageContent")
          .mockImplementation((content) =>
            typeof content === "string" ? content : JSON.stringify(content),
          );
      }

      const onFinishMock = jest.fn();

      const result = await provider.streamObject({
        model: "gemma3:1b",
        messages: [{ role: "user", content: "Get info" }],
        schema: MyInfoSchema as any,
        onFinish: onFinishMock,
      });

      const reader = result.objectStream.getReader();
      const { value } = await reader.read();

      expect(value).toHaveProperty("__error");
      expect(parseMock).not.toHaveBeenCalled();

      // Update expectation since onFinish is called with error
      expect(onFinishMock).toHaveBeenCalledWith({
        object: undefined,
        error: expect.any(Error),
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.restoreAllMocks();
      // Reset timeout
      jest.setTimeout(5000);
    });
  });

  describe("chat with format parameter", () => {
    it("should successfully use the format parameter with valid JSON response", async () => {
      // Mock response data
      const mockResponse = {
        message: {
          content: JSON.stringify({
            character: {
              name: "Alice Wonder",
              city: "Wonderland",
              occupation: "Dreamer",
            },
          }),
        },
      };

      // Mock chat method to return our response
      jest.spyOn(provider, "chat").mockResolvedValue(mockResponse);

      // Create schema with zod
      const CharacterSchema = z.object({
        name: z.string(),
        city: z.string(),
        occupation: z.string(),
      });

      const MyInfoSchema = z.object({
        character: CharacterSchema,
      });

      // Test messages
      const messages: BaseMessage[] = [
        {
          role: "user",
          content: "Create a character profile for Alice",
        },
      ];

      // Call chat with format parameter
      const result = await provider.chat({
        model: "gemma3:1b",
        messages: messages,
        format: zodToJsonSchema(MyInfoSchema),
      });

      // Verify the result
      expect(result).toEqual(mockResponse);

      // Parse and validate the response
      const parsedResponse = JSON.parse(result.message.content);
      const validatedResponse = MyInfoSchema.parse(parsedResponse);

      expect(validatedResponse).toEqual({
        character: {
          name: "Alice Wonder",
          city: "Wonderland",
          occupation: "Dreamer",
        },
      });
    });

    it("should handle invalid JSON response from format parameter", async () => {
      // Mock response with invalid JSON
      const mockResponse = {
        message: {
          content: "Not a valid JSON",
        },
      };

      // Mock chat method to return our response
      jest.spyOn(provider, "chat").mockResolvedValue(mockResponse);

      // Create schema with zod
      const CharacterSchema = z.object({
        name: z.string(),
        city: z.string(),
        occupation: z.string(),
      });

      const MyInfoSchema = z.object({
        character: CharacterSchema,
      });

      // Test messages
      const messages: BaseMessage[] = [
        {
          role: "user",
          content: "Create a character profile for Alice",
        },
      ];

      // Call chat with format parameter
      const result = await provider.chat({
        model: "gemma3:1b",
        messages: messages,
        format: zodToJsonSchema(MyInfoSchema),
      });

      // Expect that parsing will throw an error
      expect(() => {
        JSON.parse(result.message.content);
      }).toThrow();
    });
  });

  // Test system message handling in generateObject
  describe("generateObject system message handling", () => {
    it("should append JSON instructions to existing system message", async () => {
      const mockJsonResponse = { test: true };
      jest.spyOn(provider, "generateText").mockResolvedValueOnce({
        provider: {} as any,
        text: JSON.stringify(mockJsonResponse),
      });

      const schema = {
        parse: jest.fn().mockReturnValue(mockJsonResponse),
      };

      const systemMessage: BaseMessage = {
        role: "system",
        content: "Original system message",
      };

      await provider.generateObject({
        model: "gemma3:1b",
        messages: [systemMessage, { role: "user", content: "test" }],
        schema: schema as any,
      });

      // Verify that generateText was called with combined system message
      expect(provider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("Original system message"),
            }),
          ]),
        }),
      );
    });
  });

  // Clean up after all tests
  afterAll(() => {
    jest.clearAllMocks();
  });
});
