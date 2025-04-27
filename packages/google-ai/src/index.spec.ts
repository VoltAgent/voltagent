import { FinishReason, type GenerateContentResponse, type GoogleGenAIOptions } from "@google/genai";
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
        },
      });
    });
  });

  describe("streamText", () => {
    it("should stream text successfully", async () => {
      async function* mockGenerator() {
        yield { text: "Hello", responseId: "chunk1" };
        yield { text: ", ", responseId: "chunk2" };
        yield { text: "world!", responseId: "chunk3", candidates: [{ finishReason: "STOP" }] };
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
});
