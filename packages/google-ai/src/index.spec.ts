import { FinishReason, type GenerateContentResponse, type GoogleGenAIOptions } from "@google/genai";
import { z } from "zod";
import { GoogleGenAIProvider } from "./index";

const mockGenerateContent = jest.fn();

// Mock the GoogleGenAI class and its methods
jest.mock("@google/genai", () => {
  const originalModule = jest.requireActual("@google/genai");
  return {
    ...originalModule,
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
  };
});

describe("GoogleGenAIProvider", () => {
  let provider: GoogleGenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    const options: GoogleGenAIOptions = {
      apiKey: "test-api-key",
    };

    provider = new GoogleGenAIProvider(options);
  });

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      // Mock the response from the Google GenAI API
      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return "Hello, I am a test response!";
        },
        responseId: "test-response-id",
        candidates: [{ finishReason: FinishReason.STOP }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateText({
        messages: [{ role: "user", content: "Hello!" }],
        model: "gemini-2.0-flash-001",
      });

      expect(result).toBeDefined();
      expect(result.text).toBe("Hello, I am a test response!");
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      });
      expect(result.finishReason).toBe("STOP");

      // Verify the correct parameters were passed to generateContent
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [
          {
            role: "user",
            parts: [{ text: "Hello!" }],
          },
        ],
        model: "gemini-2.0-flash-001",
      });
    });

    it("should handle message with onStepFinish callback", async () => {
      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return "Hello, I am a test response!";
        },
        responseId: "test-response-id",
        candidates: [{ finishReason: FinishReason.STOP }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const onStepFinishMock = jest.fn();

      await provider.generateText({
        messages: [{ role: "user", content: "Hello!" }],
        model: "gemini-2.0-flash-001",
        onStepFinish: onStepFinishMock,
      });

      expect(onStepFinishMock).toHaveBeenCalledTimes(1);
      expect(onStepFinishMock).toHaveBeenCalledWith({
        id: "test-response-id",
        type: "text",
        content: "Hello, I am a test response!",
        role: "assistant",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });
    });

    it("should handle provider options correctly", async () => {
      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return "Test response with provider options";
        },
        responseId: "test-response-id",
        candidates: [{ finishReason: FinishReason.STOP }],
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      await provider.generateText({
        messages: [{ role: "user", content: "Hello!" }],
        model: "gemini-2.0-flash-001",
        provider: {
          temperature: 0.7,
          topP: 0.9,
          stopSequences: ["END"],
          seed: 123456,
          extraOptions: {
            customOption: "value",
          } as Record<string, any>,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: expect.any(Array),
        model: "gemini-2.0-flash-001",
        config: {
          temperature: 0.7,
          topP: 0.9,
          stopSequences: ["END"],
          seed: 123456,
          customOption: "value",
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
    });
  });

  describe("streamText", () => {
    it("should stream text successfully", async () => {
      async function* mockGenerator() {
        yield {
          get text() {
            return "Hello";
          },
          responseId: "chunk1",
        };
        yield {
          get text() {
            return ", ";
          },
          responseId: "chunk2",
        };
        yield {
          get text() {
            return "world!";
          },
          responseId: "chunk3",
          candidates: [{ finishReason: "STOP" }],
        };
        yield {
          get text() {
            return "";
          },
          responseId: "final",
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 15,
            totalTokenCount: 20,
          },
        };
      }

      const mockGenerateContentStream = jest.fn().mockResolvedValue(mockGenerator());

      const provider = new GoogleGenAIProvider({ apiKey: "test-api-key" });
      (provider as any).ai.models.generateContentStream = mockGenerateContentStream;

      const onChunkMock = jest.fn();
      const onStepFinishMock = jest.fn();

      const result = await provider.streamText({
        messages: [{ role: "user", content: "Hello!" }],
        model: "gemini-2.0-flash-001",
        onChunk: onChunkMock,
        onStepFinish: onStepFinishMock,
      });

      expect(result.textStream).toBeInstanceOf(ReadableStream);

      // Read all chunks from the stream
      const reader = result.textStream.getReader();
      const chunks = [];

      let done = false;
      while (!done) {
        const { value, done: isDone } = await reader.read();
        if (isDone) {
          done = true;
        } else {
          chunks.push(value);
        }
      }

      expect(chunks).toEqual(["Hello", ", ", "world!"]);

      expect(onChunkMock).toHaveBeenCalledTimes(3);
      expect(onStepFinishMock).toHaveBeenCalledTimes(1);
      expect(onStepFinishMock).toHaveBeenCalledWith({
        id: expect.any(String),
        type: "text",
        content: "Hello, world!",
        role: "assistant",
        usage: {
          promptTokens: 5,
          completionTokens: 15,
          totalTokens: 20,
        },
      });
    });
  });

  describe("tool handling", () => {
    it("should include toolName in tool-result steps", async () => {
      const onStepFinishMock = jest.fn();

      // Mock response with function calls
      const mockResponseWithFunctionCall: Partial<GenerateContentResponse> = {
        functionCalls: [
          {
            id: "test-call-id",
            name: "test_tool",
            args: { param: "value" },
          },
        ],
        responseId: "func-call-response",
        candidates: [{ finishReason: FinishReason.STOP }],
      };

      // Mock final response after function execution
      const mockFinalResponse: Partial<GenerateContentResponse> = {
        get text() {
          return "Tool execution completed";
        },
        responseId: "final-response",
        candidates: [{ finishReason: FinishReason.STOP }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      // Mock function execution
      const mockTool = {
        id: "test_tool",
        name: "test_tool",
        description: "A test tool",
        parameters: z.object({
          param: z.string().optional(),
        }),
        execute: jest.fn().mockResolvedValue("tool result"),
      };

      mockGenerateContent
        .mockResolvedValueOnce(mockResponseWithFunctionCall)
        .mockResolvedValueOnce(mockFinalResponse);

      await provider.generateText({
        messages: [{ role: "user", content: "Use the test tool" }],
        model: "gemini-2.0-flash-001",
        tools: [mockTool],
        onStepFinish: onStepFinishMock,
      });

      // Check that onStepFinish was called for both tool call and tool result
      expect(onStepFinishMock).toHaveBeenCalledTimes(3); // tool_call + tool_result + final text

      // Check tool_call step
      const toolCallStep = onStepFinishMock.mock.calls[0][0];
      expect(toolCallStep.type).toBe("tool_call");
      expect(toolCallStep.name).toBe("test_tool");
      expect(JSON.parse(toolCallStep.content)[0].toolName).toBe("test_tool");

      // Check tool_result step
      const toolResultStep = onStepFinishMock.mock.calls[1][0];
      expect(toolResultStep.type).toBe("tool_result");
      expect(toolResultStep.name).toBe("test_tool");
      expect(JSON.parse(toolResultStep.content)[0].toolName).toBe("test_tool");
    });

    it("should create proper step content format for tool calls and results", async () => {
      // Test the _createStepFromChunk method indirectly through tool execution
      const chunk = {
        type: "tool-call",
        toolCallId: "test-call-123",
        toolName: "calculator",
        args: { operation: "add", a: 1, b: 2 },
      };

      const step = (provider as any)._createStepFromChunk(chunk);

      expect(step).toEqual({
        id: "test-call-123",
        type: "tool_call",
        name: "calculator",
        arguments: { operation: "add", a: 1, b: 2 },
        content: JSON.stringify([
          {
            type: "tool-call",
            toolCallId: "test-call-123",
            toolName: "calculator",
            args: { operation: "add", a: 1, b: 2 },
          },
        ]),
        role: "assistant",
        usage: undefined,
      });
    });

    it("should create proper step content format for tool results", async () => {
      const resultChunk = {
        type: "tool_result",
        toolCallId: "test-call-123",
        toolName: "calculator",
        result: { answer: 3 },
      };

      const step = (provider as any)._createStepFromChunk(resultChunk);

      expect(step).toEqual({
        id: "test-call-123",
        type: "tool_result",
        name: "calculator",
        result: { answer: 3 },
        content: JSON.stringify([
          {
            type: "tool-result",
            toolCallId: "test-call-123",
            toolName: "calculator",
            result: { answer: 3 },
          },
        ]),
        role: "assistant",
        usage: undefined,
      });
    });
  });

  describe("generateObject", () => {
    it("should generate an object successfully", async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return JSON.stringify({ name: "Test User", age: 30 });
        },
        responseId: "obj-response-id",
        candidates: [{ finishReason: FinishReason.STOP }],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 25,
          totalTokenCount: 40,
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateObject({
        messages: [{ role: "user", content: "Generate user data" }],
        model: "gemini-2.0-flash-001",
        schema: testSchema,
      });

      expect(result).toBeDefined();
      expect(result.object).toEqual({ name: "Test User", age: 30 });
      expect(result.usage).toEqual({
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40,
      });
      expect(result.finishReason).toBe("STOP");

      // Verify the correct parameters were passed to generateContent
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            {
              role: "user",
              parts: [{ text: "Generate user data" }],
            },
          ],
          model: "gemini-2.0-flash-001",
          config: expect.objectContaining({
            responseMimeType: "application/json",
            responseSchema: expect.any(Object), // We don't need to deeply test the schema conversion here
            temperature: 0.2, // Default temperature
          }),
        }),
      );
    });

    it("should handle onStepFinish callback for generateObject", async () => {
      const testSchema = z.object({ status: z.string() });
      const mockResponseJson = { status: "completed" };
      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return JSON.stringify(mockResponseJson);
        },
        responseId: "obj-step-id",
        candidates: [{ finishReason: FinishReason.STOP }],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 10,
          totalTokenCount: 15,
        },
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const onStepFinishMock = jest.fn();

      await provider.generateObject({
        messages: [{ role: "user", content: "Get status" }],
        model: "gemini-2.0-flash-001",
        schema: testSchema,
        onStepFinish: onStepFinishMock,
      });

      expect(onStepFinishMock).toHaveBeenCalledTimes(1);
      expect(onStepFinishMock).toHaveBeenCalledWith({
        id: "obj-step-id",
        type: "text",
        content: JSON.stringify(mockResponseJson),
        role: "assistant",
        usage: {
          promptTokens: 5,
          completionTokens: 10,
          totalTokens: 15,
        },
      });
    });

    it("should throw error for invalid JSON response", async () => {
      const testSchema = z.object({ data: z.string() });
      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return "{ invalid json ";
        }, // Malformed JSON
        responseId: "invalid-json-id",
        candidates: [{ finishReason: FinishReason.STOP }],
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      await expect(
        provider.generateObject({
          messages: [{ role: "user", content: "Generate data" }],
          model: "gemini-2.0-flash-001",
          schema: testSchema,
        }),
      ).rejects.toThrow(/^Failed to generate valid object:/);
    });

    it("should throw error if response does not match schema", async () => {
      const testSchema = z.object({ name: z.string(), age: z.number() }); // Expects age as number
      const mockResponse: Partial<GenerateContentResponse> = {
        get text() {
          return JSON.stringify({ name: "Test User", age: "thirty" });
        }, // Age is string, not number
        responseId: "schema-mismatch-id",
        candidates: [{ finishReason: FinishReason.STOP }],
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      await expect(
        provider.generateObject({
          messages: [{ role: "user", content: "Generate user data" }],
          model: "gemini-2.0-flash-001",
          schema: testSchema,
        }),
      ).rejects.toThrow(/^Failed to generate valid object:/);
    });
  });
});
