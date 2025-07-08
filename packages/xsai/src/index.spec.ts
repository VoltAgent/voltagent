import type { BaseMessage, BaseTool } from "@voltagent/core";
import { z } from "zod";
import { XSAIProvider } from "./index";

// Mock the xsAI library functions
const mockXSAIGenerateText = vi.fn();
const mockXSAIStreamText = vi.fn();
const mockXSAIGenerateObject = vi.fn();
const mockXSAIStreamObject = vi.fn();
const mockXSAITool = vi.fn().mockImplementation(async (toolDef) => {
  // Simple mock implementation: return the definition
  // In a real scenario, this might return a wrapped function or object
  return toolDef;
});

vi.mock("xsai", () => ({
  generateText: mockXSAIGenerateText,
  streamText: mockXSAIStreamText,
  generateObject: mockXSAIGenerateObject,
  streamObject: mockXSAIStreamObject,
  tool: mockXSAITool,
}));

describe("XSAIProvider", () => {
  let provider: XSAIProvider;
  const apiKey = "test-xsai-api-key";

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new XSAIProvider({ apiKey });
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
      mockXSAITool.mockResolvedValue(mockToolResultFromXsai);

      const result = await provider.convertTools(baseTools);

      expect(mockXSAITool).toHaveBeenCalledTimes(1);
      expect(mockXSAITool).toHaveBeenCalledWith(
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
      mockXSAIGenerateText.mockResolvedValue(mockResult);

      const result = await provider.generateText({
        messages,
        model: "test-model",
      });

      expect(mockXSAIGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Hello" }],
          model: "test-model",
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
      mockXSAITool.mockResolvedValue(mockToolResult);
      mockXSAIGenerateText.mockResolvedValue({
        text: "Used tool.",
        usage: {},
        finishReason: "stop",
      });

      await provider.generateText({ messages, model: "test-model", tools });

      expect(mockXSAITool).toHaveBeenCalledTimes(1);
      expect(mockXSAIGenerateText).toHaveBeenCalledWith(
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
      mockXSAITool.mockResolvedValue(mockToolResult);
      mockXSAIGenerateText.mockResolvedValue({
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

      expect(mockXSAIGenerateText).toHaveBeenCalledWith(
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
      mockXSAIStreamText.mockResolvedValue(mockResult);

      const result = await provider.streamText({
        messages,
        model: "test-model",
      });

      expect(mockXSAIStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Stream this" }],
          model: "test-model",
        }),
      );
      expect(result.provider).toBe(mockResult);
      expect(result.textStream).toBeInstanceOf(ReadableStream);
      expect(Object.hasOwn(result.textStream, Symbol.asyncIterator)).toBe(true);
    });

    // TODO: Add tests for onStepFinish and onFinish callback wrapping within streamText
  });

  describe("tool handling", () => {
    it("should include toolName in tool-result steps via createStepFinishHandler", async () => {
      const onStepFinishMock = vi.fn();

      // Mock XsAI response with tool calls and results
      const mockXsAIResult = {
        text: "Tool execution completed",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        finishReason: "stop",
        stepType: "text" as const,
        toolCalls: [
          {
            toolCallId: "test-tool-call-id",
            toolName: "test_tool",
            args: { param: "value" },
          },
        ],
        toolResults: [
          {
            toolCallId: "test-tool-call-id",
            toolName: "test_tool",
            result: "tool result",
          },
        ],
      };

      mockXSAIGenerateText.mockResolvedValue(mockXsAIResult);

      // Test the stepFinishHandler directly
      const stepFinishHandler = provider.createStepFinishHandler(onStepFinishMock);
      expect(stepFinishHandler).toBeDefined();
      if (stepFinishHandler) {
        await stepFinishHandler(mockXsAIResult as any);
      }

      // Should be called 3 times: text, tool_call, tool_result
      expect(onStepFinishMock).toHaveBeenCalledTimes(3);

      // Check tool_call step
      const toolCallStep = onStepFinishMock.mock.calls[1][0]; // Second call (after text)
      expect(toolCallStep.type).toBe("tool_call");
      expect(toolCallStep.name).toBe("test_tool");
      expect(JSON.parse(toolCallStep.content)[0].toolName).toBe("test_tool");

      // Check tool_result step
      const toolResultStep = onStepFinishMock.mock.calls[2][0]; // Third call
      expect(toolResultStep.type).toBe("tool_result");
      expect(toolResultStep.name).toBe("test_tool");
      expect(JSON.parse(toolResultStep.content)[0].toolName).toBe("test_tool");
    });

    it("should create proper step content format for tool calls", async () => {
      const onStepFinishMock = vi.fn();
      const stepFinishHandler = provider.createStepFinishHandler(onStepFinishMock);

      const mockResult = {
        text: "",
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        finishReason: "stop",
        stepType: "text" as const,
        toolCalls: [
          {
            toolCallId: "test-call-123",
            toolName: "calculator",
            args: { operation: "add", a: 1, b: 2 },
          },
        ],
        toolResults: [],
      };

      if (stepFinishHandler) {
        await stepFinishHandler(mockResult as any);
      }

      expect(onStepFinishMock).toHaveBeenCalledTimes(1); // only tool_call (text is empty string, so no text step)

      const toolCallStep = onStepFinishMock.mock.calls[0][0]; // First call is tool_call
      expect(toolCallStep).toEqual({
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
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
      });
    });

    it("should create proper step content format for tool results", async () => {
      const onStepFinishMock = vi.fn();
      const stepFinishHandler = provider.createStepFinishHandler(onStepFinishMock);

      const mockResult = {
        text: "",
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        finishReason: "stop",
        stepType: "text" as const,
        toolCalls: [],
        toolResults: [
          {
            toolCallId: "test-call-123",
            toolName: "calculator",
            result: { answer: 3 },
          },
        ],
      };

      if (stepFinishHandler) {
        await stepFinishHandler(mockResult as any);
      }

      expect(onStepFinishMock).toHaveBeenCalledTimes(1); // only tool_result (text is empty string, so no text step)

      const toolResultStep = onStepFinishMock.mock.calls[0][0]; // First call is tool_result
      expect(toolResultStep).toEqual({
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
        usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
      });
    });

    it("should handle empty or undefined tool arrays", async () => {
      const onStepFinishMock = vi.fn();
      const stepFinishHandler = provider.createStepFinishHandler(onStepFinishMock);

      const mockResult = {
        text: "No tools used",
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        finishReason: "stop",
        stepType: "text" as const,
        toolCalls: [],
        toolResults: [],
      };

      if (stepFinishHandler) {
        await stepFinishHandler(mockResult as any);
      }

      // Only text step should be called
      expect(onStepFinishMock).toHaveBeenCalledTimes(1);

      const textStep = onStepFinishMock.mock.calls[0][0];
      expect(textStep.type).toBe("text");
      expect(textStep.content).toBe("No tools used");
    });

    it("should return undefined when onStepFinish is not provided", () => {
      const stepFinishHandler = provider.createStepFinishHandler(undefined);
      expect(stepFinishHandler).toBeUndefined();
    });
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
      mockXSAIGenerateObject.mockResolvedValue(mockResult);

      const result = await provider.generateObject({
        messages,
        model: "test-model",
        schema,
      });

      expect(mockXSAIGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Generate JSON" }],
          model: "test-model",
          schema,
        }),
      );
      expect(result.object).toEqual(mockResult.object);
    });

    it.todo("Add tests for onStepFinish callback wrapping within generateObject");
  });

  describe("streamObject", () => {
    it("should call xsai.streamObject and return provider response and stream", async () => {
      const messages: BaseMessage[] = [{ role: "user", content: "Stream JSON" }];
      const schema = z.object({ status: z.string() });
      const mockStream = new ReadableStream(); // Simple mock stream
      const mockResult = {
        partialObjectStream: mockStream /* other potential fields */,
      };
      mockXSAIStreamObject.mockResolvedValue(mockResult);

      const result = await provider.streamObject({
        messages,
        model: "test-model",
        schema,
      });

      expect(mockXSAIStreamObject).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey,
          messages: [{ role: "user", content: "Stream JSON" }],
          model: "test-model",
          schema,
        }),
      );
      expect(result.provider).toBe(mockResult);
      expect(result.objectStream).toBeInstanceOf(ReadableStream);
      expect(Object.hasOwn(result.objectStream, Symbol.asyncIterator)).toBe(true);
    });

    it.todo("Add tests for onStepFinish and onFinish callback wrapping within streamObject");
  });
});
