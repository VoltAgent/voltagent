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
        text: "Hello, I am a test response!",
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
        text: "Hello, I am a test response!",
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
        text: "Test response with provider options",
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
        yield { text: "Hello", responseId: "chunk1" };
        yield { text: ", ", responseId: "chunk2" };
        yield {
          text: "world!",
          responseId: "chunk3",
          candidates: [{ finishReason: "STOP" }],
        };
        yield {
          text: "",
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

  describe("generateObject", () => {
    it("should generate an object successfully", async () => {
      const testSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockResponse: Partial<GenerateContentResponse> = {
        text: JSON.stringify({ name: "Test User", age: 30 }),
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
        text: JSON.stringify(mockResponseJson),
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
        text: "{ invalid json ", // Malformed JSON
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
        text: JSON.stringify({ name: "Test User", age: "thirty" }), // Age is string, not number
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
