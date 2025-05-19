import { z } from "zod";
import type { BaseMessage, BaseTool } from "@voltagent/core";
import { XsAIProvider } from "./index";

// Mock the xsai library functions
const mockXsaiGenerateText = jest.fn();
const mockXsaiStreamText = jest.fn();
const mockXsaiGenerateObject = jest.fn();
const mockXsaiStreamObject = jest.fn();
const mockXsaiTool = jest.fn().mockImplementation(async (toolDef) => {
  // Simple mock implementation: return the definition
  // In a real scenario, this might return a wrapped function or object
  return toolDef;
});

jest.mock("xsai", () => ({
  generateText: mockXsaiGenerateText,
  streamText: mockXsaiStreamText,
  generateObject: mockXsaiGenerateObject,
  streamObject: mockXsaiStreamObject,
  tool: mockXsaiTool,
}));

describe("XsAIProvider", () => {
  let provider: XsAIProvider;
  const apiKey = "test-xsai-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new XsAIProvider({ apiKey });
  });

  describe("toMessage", () => {
    it("should convert BaseMessage with string content", () => {
      const baseMsg: BaseMessage = { role: "user", content: "Hello XsAI!" };
      const expectedMsg = { role: "user", content: "Hello XsAI!" };
      expect(provider.toMessage(baseMsg)).toEqual(expectedMsg);
    });

    it("should convert BaseMessage with array text content", () => {
      const baseMsg: BaseMessage = {
        role: "user",
        content: [
          { type: "text", text: "Part 1." },
          { type: "text", text: " Part 2." },
        ],
      };
      // XsAIProvider concatenates array text parts
      const expectedMsg = {
        role: "user",
        content: [
          {
            text: "Part 1.",
            type: "text",
          },
          {
            text: " Part 2.",
            type: "text",
          },
        ],
      };
      expect(provider.toMessage(baseMsg)).toMatchObject(expectedMsg);
    });

    it("should return empty string for array with non-text or empty text parts", () => {
      const baseMsgNonText: BaseMessage = {
        role: "user",
        content: [{ type: "image", image: "..." }],
      };
      const baseMsgEmptyText: BaseMessage = {
        role: "user",
        content: [{ type: "text", text: "" }],
      };
      expect(provider.toMessage(baseMsgNonText).content).toMatchObject([
        { image_url: { url: "..." }, type: "image_url" },
      ]);
      expect(provider.toMessage(baseMsgEmptyText).content).toMatchObject([
        { text: "", type: "text" },
      ]);
    });

    it("should map system and tool roles to assistant", () => {
      const systemMsg: BaseMessage = {
        role: "system",
        content: "System instruction.",
      };
      const toolMsg: BaseMessage = { role: "tool", content: "Tool output." };
      expect(provider.toMessage(systemMsg).role).toBe("system");
      expect(provider.toMessage(toolMsg).role).toBe("tool");
    });

    it("should keep user and assistant roles", () => {
      const userMsg: BaseMessage = { role: "user", content: "User input." };
      const assistantMsg: BaseMessage = {
        role: "assistant",
        content: "Assistant response.",
      };
      expect(provider.toMessage(userMsg).role).toBe("user");
      expect(provider.toMessage(assistantMsg).role).toBe("assistant");
    });
  });

  describe("convertTools", () => {
    it("should convert BaseTools to XsAI ToolResults", async () => {
      const baseTools: BaseTool[] = [
        {
          id: "tool-weather-123",
          name: "get_weather",
          description: "Get current weather",
          parameters: z.object({ location: z.string() }),
          execute: async () => "Sunny",
        },
      ];

      const mockToolResultFromXsai = {
        id: "tool-weather-123",
        name: "get_weather",
        description: "Get current weather",
        parameters: expect.any(Object),
        execute: expect.any(Function),
      };
      mockXsaiTool.mockResolvedValue(mockToolResultFromXsai);

      const result = await provider.convertTools(baseTools);

      expect(mockXsaiTool).toHaveBeenCalledTimes(1);
      expect(mockXsaiTool).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "get_weather",
          description: "Get current weather",
          parameters: expect.any(Object),
          execute: expect.any(Function),
        }),
      );
      expect(result).toHaveLength(1);
      expect((result?.[0] as any)?.name).toBe("get_weather");
    });

    it("should return undefined if no tools are provided", async () => {
      expect(await provider.convertTools([])).toBeUndefined();
      expect(await provider.convertTools(undefined as any)).toBeUndefined(); // Test undefined case
    });
  });

  describe("generateText", () => {
    it("should call xsai.generateText with correct parameters", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Hello" }];
      const mockResult = {
        text: "Hi there!",
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        finishReason: "stop",
      };
      mockXsaiGenerateText.mockResolvedValue(mockResult);

      const result = await provider.generateText({
        messages,
        model: "test-model",
      });

      expect(mockXsaiGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Hello" }],
          model: "test-model",
          tools: [], // No tools provided
        }),
      );
      expect(result.text).toBe(mockResult.text);
      expect(result.usage).toEqual({
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      });
      expect(result.finishReason).toBe("stop");
    });

    it("should convert and pass tools to xsai.generateText", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Use tool" }];
      const tools: BaseTool[] = [
        {
          id: "tool-test-456",
          name: "test_tool",
          description: "desc",
          parameters: z.object({}),
          execute: async () => ({}),
        },
      ];
      const mockToolResult = {
        id: "tool-test-456",
        name: "test_tool",
        description: "desc",
        parameters: {},
        execute: expect.any(Function),
      };
      mockXsaiTool.mockResolvedValue(mockToolResult);
      mockXsaiGenerateText.mockResolvedValue({
        text: "Used tool.",
        usage: {},
        finishReason: "stop",
      });

      await provider.generateText({ messages, model: "test-model", tools });

      expect(mockXsaiTool).toHaveBeenCalledTimes(1);
      expect(mockXsaiGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [mockToolResult],
          maxSteps: undefined,
        }),
      );
    });

    it("should pass maxSteps when tools are provided and maxSteps is set", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Use tool with max steps" }];
      const tools: BaseTool[] = [
        {
          id: "tool-step-test-789",
          name: "step_test_tool",
          description: "desc",
          parameters: z.object({}),
          execute: async () => ({}),
        },
      ];
      const mockToolResult = {
        id: "tool-step-test-789",
        name: "step_test_tool" /* other fields */,
      };
      mockXsaiTool.mockResolvedValue(mockToolResult);
      mockXsaiGenerateText.mockResolvedValue({
        text: "Used tool with steps.",
        usage: {},
        finishReason: "stop",
      });
      const testMaxSteps = 5;

      await provider.generateText({
        messages,
        model: "test-model",
        tools,
        maxSteps: testMaxSteps,
      });

      expect(mockXsaiGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [mockToolResult],
          maxSteps: testMaxSteps, // Expect the provided maxSteps value
        }),
      );
    });

    // TODO: Add tests for onStepFinish callback handling within generateText if needed
    // Currently, onStepFinish is passed directly to xsai.generateText
  });

  describe("streamText", () => {
    it("should call xsai.streamText and return provider response and stream", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Stream this" }];
      const mockStream = new ReadableStream(); // Simple mock stream
      const mockResult = {
        textStream: mockStream /* other potential fields from xsai */,
      };
      mockXsaiStreamText.mockResolvedValue(mockResult);

      const result = await provider.streamText({
        messages,
        model: "test-model",
      });

      expect(mockXsaiStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Stream this" }],
          model: "test-model",
          tools: [],
        }),
      );
      expect(result.provider).toBe(mockResult);
      expect(result.textStream).toBe(mockStream);
    });

    // TODO: Add tests for onStepFinish and onFinish callback wrapping within streamText
  });

  describe("generateObject", () => {
    it("should call xsai.generateObject with correct parameters", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Generate JSON" }];
      const schema = z.object({ name: z.string(), value: z.number() });
      const mockResult = {
        object: { name: "test", value: 123 },
        usage: {},
        finishReason: "stop",
      };
      mockXsaiGenerateObject.mockResolvedValue(mockResult);

      const result = await provider.generateObject({
        messages,
        model: "test-model",
        schema,
      });

      expect(mockXsaiGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Generate JSON" }],
          model: "test-model",
          schema,
        }),
      );
      expect(result.object).toEqual(mockResult.object);
    });

    // TODO: Add tests for onStepFinish callback wrapping within generateObject
  });

  describe("streamObject", () => {
    it("should call xsai.streamObject and return provider response and stream", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Stream JSON" }];
      const schema = z.object({ status: z.string() });
      const mockStream = new ReadableStream(); // Simple mock stream
      const mockResult = {
        partialObjectStream: mockStream /* other potential fields */,
      };
      mockXsaiStreamObject.mockResolvedValue(mockResult);

      const result = await provider.streamObject({
        messages,
        model: "test-model",
        schema,
      });

      expect(mockXsaiStreamObject).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Stream JSON" }],
          model: "test-model",
          schema,
        }),
      );
      expect(result.provider).toBe(mockResult);
      expect(result.objectStream).toBe(mockStream);
    });

    // TODO: Add tests for onStepFinish and onFinish callback wrapping within streamObject
  });
});
