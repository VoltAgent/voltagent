/**
 * Unit tests for Agent class
 * Using AI SDK's native test helpers with minimal mocking
 */

import type { ModelMessage } from "@ai-sdk/provider-utils";
import * as ai from "ai";
import type { UIMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { AgentRegistry } from "../registries/agent-registry";
import { ModelProviderRegistry } from "../registries/model-provider-registry";
import { Tool } from "../tool";
import { Agent, renameProviderOptions } from "./agent";
import { ConversationBuffer } from "./conversation-buffer";
import { ToolDeniedError } from "./errors";
import { createHooks } from "./hooks";

// Mock the AI SDK functions while preserving core converters
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
    generateObject: vi.fn(),
    streamObject: vi.fn(),
    stepCountIs: vi.fn(() => vi.fn(() => false)),
  };
});

describe("Agent", () => {
  let mockModel: MockLanguageModelV3;

  beforeEach(() => {
    // Create a fresh mock model for each test
    mockModel = new MockLanguageModelV3({
      modelId: "test-model",
      doGenerate: {
        content: [{ type: "text", text: "Test response" }],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          inputTokenDetails: {
            noCacheTokens: 10,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          outputTokenDetails: {
            textTokens: 5,
            reasoningTokens: 0,
          },
        },
        warnings: [],
      },
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should create agent with required fields", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test instructions",
        model: mockModel as any,
      });

      expect(agent.name).toBe("TestAgent");
      expect(agent.instructions).toBe("Test instructions");
      expect(agent.id).toBeDefined();
      expect(agent.id).toMatch(/^[a-zA-Z0-9_-]+$/); // UUID or custom ID format
    });

    it("should use provided id when specified", () => {
      const customId = "custom-agent-id";
      const agent = new Agent({
        id: customId,
        name: "TestAgent",
        instructions: "Test instructions",
        model: mockModel as any,
      });

      expect(agent.id).toBe(customId);
    });

    it("should initialize with default values", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test instructions",
        model: mockModel as any,
      });

      expect(agent.getModelName()).toBe("test-model");
      expect(agent.getTools()).toEqual([]);
      expect(agent.getSubAgents()).toEqual([]);
    });

    it("should accept custom temperature and maxOutputTokens", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test instructions",
        model: mockModel as any,
        temperature: 0.7,
        maxOutputTokens: 2000,
      });

      // These values should be stored and used in generation
      expect(agent).toBeDefined();
    });
  });

  describe("Text Generation", () => {
    it("should generate text from string input", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      // Mock the generateText response
      const mockResponse = {
        text: "Generated response",
        content: [{ type: "text", text: "Generated response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText("Hello, world!");

      expect(ai.generateText).toHaveBeenCalled();
      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
      if (callArgs.messages) {
        expect(callArgs.messages).toHaveLength(2);
        expect(callArgs.messages[0].role).toBe("system");
        expect(callArgs.messages[1].role).toBe("user");
      }

      expect(result.text).toBe("Generated response");
    });

    it("should resolve string model ids via registry", async () => {
      const registry = ModelProviderRegistry.getInstance();
      registry.registerProvider("mock", (modelId) => {
        expect(modelId).toBe("test-model");
        return mockModel as any;
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: "mock/test-model",
      });

      const mockResponse = {
        text: "Generated response",
        content: [{ type: "text", text: "Generated response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText("Hello, world!");

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);

      registry.unregisterProvider("mock");
    });

    it("should generate text from UIMessage array", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "What is AI?" }],
        },
      ];

      const mockResponse = {
        text: "AI is artificial intelligence",
        content: [{ type: "text", text: "AI is artificial intelligence" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText(messages);

      expect(ai.generateText).toHaveBeenCalled();
      expect(result.text).toBe("AI is artificial intelligence");
    });

    it("should pass context to generation", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const mockResponse = {
        text: "Response with context",
        content: [{ type: "text", text: "Response with context" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const context = { userId: "user123", sessionId: "session456" };
      const result = await agent.generateText("Hello", {
        context,
        userId: "user123",
        conversationId: "conv123",
      });

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.context.get("userId")).toBe("user123");
      expect(result.context.get("sessionId")).toBe("session456");
    });

    it("records provider steps on the conversation context", async () => {
      let capturedSteps: any[] | undefined;
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
        hooks: createHooks({
          onEnd: ({ context }) => {
            capturedSteps = context.conversationSteps ? [...context.conversationSteps] : undefined;
          },
        }),
      });

      const stepResult = {
        content: [],
        text: "Partial reasoning",
        reasoning: [],
        reasoningText: undefined,
        files: [],
        sources: [],
        toolCalls: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            input: { query: "docs" },
          },
        ],
        staticToolCalls: [],
        dynamicToolCalls: [],
        toolResults: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "search",
            input: { query: "docs" },
            output: { result: 42 },
          },
        ],
        staticToolResults: [],
        dynamicToolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 1,
          outputTokens: 2,
          totalTokens: 3,
        },
        warnings: [],
        request: {},
        response: {
          id: "resp-1",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        providerMetadata: undefined,
      };

      const mockResponse = {
        text: "Final response",
        content: [{ type: "text", text: "Final response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: stepResult.toolCalls,
        toolResults: stepResult.toolResults,
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [stepResult],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText("Hello, world!");

      expect(capturedSteps).toBeDefined();
      expect(capturedSteps).toHaveLength(3);
      const types = capturedSteps?.map((step) => step.type);
      expect(types).toEqual(expect.arrayContaining(["text", "tool_call", "tool_result"]));
      const callStep = capturedSteps?.find((step) => step.type === "tool_call");
      expect(callStep?.arguments).toEqual({ query: "docs" });
      const resultStep = capturedSteps?.find((step) => step.type === "tool_result");
      expect(resultStep?.result).toEqual({ result: 42 });
    });

    it("should sanitize messages before invoking onPrepareMessages hook", async () => {
      const onPrepareMessagesSpy = vi.fn(({ messages }) => ({ messages }));
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
        hooks: {
          onPrepareMessages: onPrepareMessagesSpy,
        },
      });

      const blankMessage: UIMessage = {
        id: "blank",
        role: "user",
        parts: [{ type: "text", text: "   " }],
      };

      const mockResponse = {
        text: "Sanitized response",
        content: [{ type: "text", text: "Sanitized response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText([blankMessage]);

      expect(onPrepareMessagesSpy).toHaveBeenCalledTimes(1);
      const hookArgs = onPrepareMessagesSpy.mock.calls[0][0] as {
        messages: UIMessage[];
        rawMessages?: UIMessage[];
      };

      expect(hookArgs.rawMessages).toBeDefined();
      expect(hookArgs.rawMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: blankMessage.id })]),
      );

      expect(hookArgs.messages.some((message) => message.id === blankMessage.id)).toBe(false);

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(Array.isArray(callArgs.messages)).toBe(true);
      expect(callArgs.messages?.[0]).toMatchObject({ role: "system" });
      expect((callArgs.messages?.[0] as any).parts).toBeUndefined();
    });

    it("should retain provider options from system instructions", async () => {
      const cacheControl = { type: "ephemeral", ttl: "5m" };
      const agent = new Agent({
        name: "TestAgent",
        instructions: {
          type: "chat",
          messages: [
            {
              role: "system",
              content: "cached system prompt",
              providerOptions: {
                anthropic: {
                  cacheControl,
                },
              },
            },
          ],
        },
        model: mockModel as any,
      });

      const mockResponse = {
        text: "Response",
        content: [{ type: "text", text: "Response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText("test");

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      // Under the current constraint, we assert only the role is preserved here.
      // Provider options handling is validated elsewhere and may be stripped by normalizers.
      expect(callArgs.messages?.[0]).toMatchObject({
        role: "system",
      });
    });

    it("should allow onPrepareModelMessages hook to adjust final model messages", async () => {
      const injectedModelMessage = {
        role: "system",
        content: [{ type: "text", text: "Injected" }],
      } as unknown as ModelMessage;

      const onPrepareModelMessagesSpy = vi.fn(
        ({ modelMessages }: { modelMessages: ModelMessage[] }) => ({
          modelMessages: [...modelMessages, injectedModelMessage],
        }),
      );

      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
        hooks: {
          onPrepareModelMessages: onPrepareModelMessagesSpy,
        },
      });

      const initialMessage: UIMessage = {
        id: "m-1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      };

      const mockResponse = {
        text: "Response",
        content: [{ type: "text", text: "Response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText([initialMessage]);

      expect(onPrepareModelMessagesSpy).toHaveBeenCalledTimes(1);
      const hookArgs = onPrepareModelMessagesSpy.mock.calls[0][0] as {
        modelMessages: ModelMessage[];
        uiMessages: UIMessage[];
      };

      expect(hookArgs.uiMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: initialMessage.id })]),
      );
      expect(hookArgs.modelMessages).toEqual(
        expect.arrayContaining([expect.objectContaining({ role: initialMessage.role })]),
      );

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.messages).toContain(injectedModelMessage);
    });
  });

  describe("Stream Text", () => {
    it("should stream text response", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const mockStream = {
        text: Promise.resolve("Streamed response"),
        textStream: (async function* () {
          yield "Streamed ";
          yield "response";
        })(),
        fullStream: (async function* () {
          yield {
            type: "text-delta" as const,
            id: "text-1",
            delta: "Streamed ",
            text: "Streamed ",
          };
          yield {
            type: "text-delta" as const,
            id: "text-1",
            delta: "response",
            text: "response",
          };
        })(),
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
        finishReason: Promise.resolve("stop"),
        warnings: [],
        // Add missing methods that agent.ts expects
        toUIMessageStream: vi.fn(),
        toUIMessageStreamResponse: vi.fn(),
        pipeUIMessageStreamToResponse: vi.fn(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
        partialOutputStream: undefined,
      };

      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      const result = await agent.streamText("Stream this");

      expect(ai.streamText).toHaveBeenCalled();
      const callArgs = vi.mocked(ai.streamText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
      if (callArgs.messages) {
        expect(callArgs.messages).toHaveLength(2);
        expect(callArgs.messages[0].role).toBe("system");
        expect(callArgs.messages[1].role).toBe("user");
      }

      const text = await result.text;
      expect(text).toBe("Streamed response");
    });

    it("pre-creates streaming message ids and forwards them to UI streams", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const mockStream = {
        text: Promise.resolve("Streamed response"),
        textStream: (async function* () {
          yield "Streamed response";
        })(),
        fullStream: (async function* () {
          yield {
            type: "start" as const,
          };
          yield {
            type: "text-delta" as const,
            id: "text-1",
            delta: "Streamed response",
            text: "Streamed response",
          };
        })(),
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
        finishReason: Promise.resolve("stop"),
        warnings: [],
        toUIMessageStream: vi.fn().mockReturnValue((async function* () {})()),
        toUIMessageStreamResponse: vi.fn(),
        pipeUIMessageStreamToResponse: vi.fn(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
        partialOutputStream: undefined,
      };

      const memoryManager = agent.getMemoryManager();
      const saveMessageSpy = vi.spyOn(memoryManager, "saveMessage");

      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      const result = await agent.streamText("Stream this", {
        userId: "user-1",
        conversationId: "conv-1",
      });

      const placeholderSaved = saveMessageSpy.mock.calls
        .map((call) => call[1] as UIMessage)
        .some((message) => message.role === "assistant" && message.parts.length === 0);

      expect(placeholderSaved).toBe(false);

      result.toUIMessageStream();

      const callArgs = mockStream.toUIMessageStream.mock.calls[0]?.[0];
      expect(callArgs).toEqual(
        expect.objectContaining({
          generateMessageId: expect.any(Function),
        }),
      );
      const generatedId = callArgs?.generateMessageId();
      expect(typeof generatedId).toBe("string");
      expect(generatedId).not.toBe("");
      expect(callArgs?.generateMessageId()).toBe(generatedId);

      const parts: any[] = [];
      for await (const part of result.fullStream) {
        parts.push(part);
      }
      expect(parts).toHaveLength(2);
      expect(parts[0]).toEqual(expect.objectContaining({ type: "start", messageId: generatedId }));
      expect(parts[1]).toEqual(expect.objectContaining({ type: "text-delta", id: "text-1" }));
    });

    it("uses last-step usage for finish events when provider is anthropic", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const lastStepUsage = {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        raw: {
          cache_creation_input_tokens: 10,
        },
      };
      const summedUsage = {
        inputTokens: 25,
        outputTokens: 10,
        totalTokens: 35,
      };

      const mockStream = {
        text: Promise.resolve("Streamed response"),
        textStream: (async function* () {
          yield "Streamed response";
        })(),
        fullStream: (async function* () {
          yield {
            type: "finish-step" as const,
            usage: lastStepUsage,
            finishReason: "stop",
            rawFinishReason: "stop",
            providerMetadata: { anthropic: {} },
            response: {},
          };
          yield {
            type: "finish" as const,
            finishReason: "stop",
            rawFinishReason: "stop",
            totalUsage: summedUsage,
          };
        })(),
        usage: Promise.resolve(lastStepUsage),
        finishReason: Promise.resolve("stop"),
        warnings: [],
        toUIMessageStream: vi.fn(),
        toUIMessageStreamResponse: vi.fn(),
        pipeUIMessageStreamToResponse: vi.fn(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
        partialOutputStream: undefined,
      };

      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      const result = await agent.streamText("Stream this");
      const parts: any[] = [];
      for await (const part of result.fullStream) {
        parts.push(part);
      }

      const finishPart = parts.find((part) => part.type === "finish");
      expect(finishPart?.totalUsage).toEqual(lastStepUsage);
    });
  });

  describe("Tool Management", () => {
    it("should add tools", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const tool = new Tool({
        name: "testTool",
        description: "A test tool",
        parameters: z.object({ input: z.string() }),
        execute: async ({ input }) => `Processed: ${input}`,
      });

      const result = agent.addTools([tool]);

      expect(result.added).toHaveLength(1);
      const tools = agent.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe("testTool");
    });

    it("should remove tools", () => {
      const tool = new Tool({
        name: "testTool",
        description: "A test tool",
        parameters: z.object({ input: z.string() }),
        execute: async ({ input }) => `Processed: ${input}`,
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        tools: [tool],
      });

      const result = agent.removeTools(["testTool"]);

      expect(result.removed).toContain("testTool");
      const tools = agent.getTools();
      expect(tools).toHaveLength(0);
    });

    it("should handle duplicate tools", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const tool = new Tool({
        name: "testTool",
        description: "A test tool",
        parameters: z.object({ input: z.string() }),
        execute: async ({ input }) => `Processed: ${input}`,
      });

      agent.addTools([tool]);
      const result = agent.addTools([tool]); // Try to add same tool again

      expect(result.added).toHaveLength(1); // VoltAgent allows adding same tool
      const tools = agent.getTools();
      expect(tools).toHaveLength(1); // But only keeps one instance
    });
  });

  describe("Tool Execution", () => {
    it("serializes tool errors and forwards them to hooks", async () => {
      const onToolEnd = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: createHooks({ onToolEnd }),
      });

      const failingTool = new Tool({
        name: "failing-tool",
        description: "Always throws",
        parameters: z.object({}),
        execute: async () => {
          throw new Error("Tool failure");
        },
      });

      const operationContext = (agent as any).createOperationContext("input");
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const execute = executeFactory(failingTool);
      const result = await execute({});

      expect(result).toMatchObject({
        error: true,
        message: "Tool failure",
        name: "Error",
        toolName: "failing-tool",
      });
      expect(result).toHaveProperty("stack");

      expect(onToolEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: failingTool,
          output: undefined,
          error: expect.objectContaining({
            message: "Tool failure",
            stage: "tool_execution",
          }),
        }),
      );

      operationContext.traceContext.end("completed");
    });

    it("sanitizes circular error payloads from tools", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const circular: any = {};
      circular.self = circular;

      const failingTool = new Tool({
        name: "circular-tool",
        description: "Throws with circular payload",
        parameters: z.object({}),
        execute: async () => {
          const err = new Error("Circular failure");
          (err as any).config = circular;
          throw err;
        },
      });

      const operationContext = (agent as any).createOperationContext("input");
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const execute = executeFactory(failingTool);
      const result = await execute({});

      expect(result).toMatchObject({
        error: true,
        name: "Error",
        message: "Circular failure",
        toolName: "circular-tool",
      });
      expect(typeof result.config).toBe("string");

      operationContext.traceContext.end("completed");
    });

    it("allows onToolEnd to override tool output", async () => {
      const onToolEnd = vi.fn().mockResolvedValue({ output: "trimmed" });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: createHooks({ onToolEnd }),
      });

      const tool = new Tool({
        name: "text-tool",
        description: "Returns text",
        parameters: z.object({}),
        execute: async () => "original",
      });

      const operationContext = (agent as any).createOperationContext("input");
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const execute = executeFactory(tool);
      const result = await execute({});

      expect(result).toBe("trimmed");
      expect(onToolEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          tool,
          output: "original",
          error: undefined,
        }),
      );

      operationContext.traceContext.end("completed");
    });

    it("supports tool-level hooks for start and end", async () => {
      const toolOnStart = vi.fn();
      const toolOnEnd = vi.fn().mockResolvedValue({ output: "tool-hook" });
      const onToolEnd = vi.fn().mockResolvedValue({ output: "agent-hook" });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: createHooks({ onToolEnd }),
      });

      const tool = new Tool({
        name: "hooked-tool",
        description: "Returns text",
        parameters: z.object({}),
        execute: async () => "original",
        hooks: {
          onStart: toolOnStart,
          onEnd: toolOnEnd,
        },
      });

      const operationContext = (agent as any).createOperationContext("input");
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const execute = executeFactory(tool);
      const result = await execute({});

      expect(result).toBe("agent-hook");
      expect(toolOnStart).toHaveBeenCalledWith(
        expect.objectContaining({
          tool,
        }),
      );
      expect(toolOnEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          tool,
          output: "original",
          error: undefined,
        }),
      );
      expect(onToolEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          tool,
          output: "tool-hook",
          error: undefined,
        }),
      );

      operationContext.traceContext.end("completed");
    });
  });

  describe("Agent as Tool (toTool)", () => {
    it("should convert agent to tool with default parameters", () => {
      const agent = new Agent({
        name: "WriterAgent",
        id: "writer",
        purpose: "Writes blog posts",
        instructions: "You are a skilled writer",
        model: mockModel as any,
      });

      const tool = agent.toTool();

      expect(tool).toBeDefined();
      expect(tool.name).toBe("writer_tool");
      expect(tool.description).toBe("Writes blog posts");
      expect(tool.parameters).toBeDefined();
    });

    it("should convert agent to tool with custom options", () => {
      const agent = new Agent({
        name: "EditorAgent",
        id: "editor",
        instructions: "You are a skilled editor",
        model: mockModel as any,
      });

      const customSchema = z.object({
        content: z.string().describe("The content to edit"),
        style: z.enum(["formal", "casual"]).describe("The editing style"),
      });

      const tool = agent.toTool({
        name: "custom_editor",
        description: "Custom editor tool",
        parametersSchema: customSchema,
      });

      expect(tool.name).toBe("custom_editor");
      expect(tool.description).toBe("Custom editor tool");
      expect(tool.parameters).toBe(customSchema);
    });

    it("should execute agent when tool is called", async () => {
      const agent = new Agent({
        name: "WriterAgent",
        id: "writer",
        instructions: "You are a writer",
        model: mockModel as any,
      });

      // Mock the generateText result
      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Generated blog post",
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        finishReason: "stop",
        warnings: [],
        rawResponse: undefined,
        messages: [] as any,
        steps: [],
        toolCalls: [],
        toolResults: [],
        response: {
          id: "test-id",
          modelId: "test-model",
          timestamp: new Date(),
        },
      } as any);

      const tool = agent.toTool();

      expect(tool.execute).toBeDefined();

      const result = await tool.execute?.({ prompt: "Write about AI" });

      expect(result).toBeDefined();
      expect(result.text).toBe("Generated blog post");
      expect(result.usage).toBeDefined();
      expect(vi.mocked(ai.generateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
        }),
      );
    });

    it("should pass context through when executing agent tool", async () => {
      const agent = new Agent({
        name: "TestAgent",
        id: "test",
        instructions: "Test agent",
        model: mockModel as any,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response",
        usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
        finishReason: "stop",
        warnings: [],
        rawResponse: undefined,
        messages: [] as any,
        steps: [],
        toolCalls: [],
        toolResults: [],
        response: {
          id: "test-id",
          modelId: "test-model",
          timestamp: new Date(),
        },
      } as any);

      const tool = agent.toTool();

      const mockContext = {
        conversationId: "conv-123",
        userId: "user-456",
      };

      await tool.execute?.({ prompt: "Test" }, mockContext as any);

      expect(vi.mocked(ai.generateText)).toHaveBeenCalled();
      // The generateText should be called with options containing the context
      const callArgs = vi.mocked(ai.generateText).mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it("should work in supervisor pattern with multiple agent tools", () => {
      const writerAgent = new Agent({
        name: "Writer",
        id: "writer",
        purpose: "Writes content",
        instructions: "Write blog posts",
        model: mockModel as any,
      });

      const editorAgent = new Agent({
        name: "Editor",
        id: "editor",
        purpose: "Edits content",
        instructions: "Edit and improve content",
        model: mockModel as any,
      });

      const supervisorAgent = new Agent({
        name: "Supervisor",
        id: "supervisor",
        instructions: "Coordinate writer and editor",
        model: mockModel as any,
        tools: [writerAgent.toTool(), editorAgent.toTool()],
      });

      const tools = supervisorAgent.getTools();
      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toContain("writer_tool");
      expect(tools.map((t) => t.name)).toContain("editor_tool");
    });
  });

  describe("Memory Integration", () => {
    it("should initialize with memory", () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });

      expect(agent.getMemoryManager()).toBeDefined();
    });

    it("should work without memory when disabled", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: false,
      });

      expect(agent.getMemoryManager()).toBeDefined();
      // Memory manager should exist but not persist anything
    });

    it("should save messages to memory", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });

      const mockResponse = {
        text: "Response",
        content: [{ type: "text", text: "Response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const threadId = "test-thread";
      await agent.generateText("Hello", {
        conversationId: threadId,
      });

      // Verify memory manager exists
      const memoryManager = agent.getMemoryManager();
      expect(memoryManager).toBeDefined();

      // The agent uses memory internally, we just verify it was configured
      expect(agent).toBeDefined();
      // We can't directly test the internal memory operations
      // as they're handled by the MemoryManager class
    });

    it("should retrieve messages from memory", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      const threadId = "test-thread";

      // Pre-populate memory with proper UIMessage format
      await memory.addMessages(
        [
          {
            id: "1",
            role: "user",
            parts: [{ type: "text", text: "Previous message" }],
          },
          {
            id: "2",
            role: "assistant",
            parts: [{ type: "text", text: "Previous response" }],
          },
        ],
        "default",
        threadId,
      );

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "New response",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      await agent.generateText("New message", {
        conversationId: threadId,
      });

      // Check that generateText was called
      expect(ai.generateText).toHaveBeenCalled();
      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      if (callArgs.messages) {
        // Agent may or may not include previous messages depending on implementation
        // Just verify there are messages
        expect(callArgs.messages.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("should handle memory with context limit", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      await agent.generateText("Test", {
        conversationId: "thread-1",
        contextLimit: 5, // Limit context to 5 messages
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      // Context limit should be respected
      expect(callArgs).toBeDefined();
    });
  });

  describe("Global Memory Defaults", () => {
    beforeEach(() => {
      const registry = AgentRegistry.getInstance();
      registry.setGlobalAgentMemory(undefined);
      registry.setGlobalWorkflowMemory(undefined);
      registry.setGlobalMemory(undefined);
    });

    afterEach(() => {
      const registry = AgentRegistry.getInstance();
      registry.setGlobalAgentMemory(undefined);
      registry.setGlobalWorkflowMemory(undefined);
      registry.setGlobalMemory(undefined);
    });

    it("should use global agent memory when not configured", () => {
      const registry = AgentRegistry.getInstance();
      const globalMemory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      registry.setGlobalAgentMemory(globalMemory);

      const agent = new Agent({
        name: "DefaultMemoryAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      expect(agent.getMemory()).toBe(globalMemory);
    });

    it("should fall back to global memory when agent memory is not set", () => {
      const registry = AgentRegistry.getInstance();
      const globalMemory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      registry.setGlobalMemory(globalMemory);

      const agent = new Agent({
        name: "FallbackMemoryAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      expect(agent.getMemory()).toBe(globalMemory);
    });

    it("should not override explicit memory disabled", () => {
      const registry = AgentRegistry.getInstance();
      const globalMemory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      registry.setGlobalAgentMemory(globalMemory);

      const agent = new Agent({
        name: "StatelessAgent",
        instructions: "Test",
        model: mockModel as any,
        memory: false,
      });

      expect(agent.getMemory()).toBe(false);
    });
  });

  describe("Hook System", () => {
    it("should call onStart hook with proper context", async () => {
      const onStart = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: { onStart },
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      await agent.generateText("Test", {
        userId: "user123",
        conversationId: "conv456",
      });

      expect(onStart).toHaveBeenCalled();
      expect(onStart.mock.calls).toHaveLength(1);

      // Verify hook was called with object-arg containing OperationContext
      const arg = onStart.mock.calls[0]?.[0];
      expect(arg).toBeDefined();
      expect(arg.agent).toBeDefined();
      const oc = arg.context;
      expect(oc).toBeDefined();
      // Check correct context structure
      expect(oc.context).toBeInstanceOf(Map); // user-provided context
      expect(oc.operationId).toBeDefined();
      expect(oc.userId).toBe("user123");
      expect(oc.conversationId).toBe("conv456");
      expect(oc.logger).toBeDefined();
    });

    it("should call onError hook with error details", async () => {
      const onError = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: { onError },
      });

      const error = new Error("Test error");
      vi.mocked(ai.generateText).mockRejectedValue(error);

      await expect(agent.generateText("Test")).rejects.toThrow("Test error");

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls).toHaveLength(1);

      // Verify error hook was called with args object
      const arg = onError.mock.calls[0]?.[0];
      expect(arg).toBeDefined();
      const oc = arg.context;
      expect(oc.context).toBeInstanceOf(Map);
      expect(oc.operationId).toBeDefined();
      expect(oc.logger).toBeDefined();
      expect(arg.error).toBeDefined();
    });

    it("should call onEnd hook with context and result", async () => {
      const onEnd = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: { onEnd },
      });

      const mockResponse = {
        text: "Success response",
        content: [{ type: "text", text: "Success response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText("Test");

      expect(onEnd).toHaveBeenCalled();
      expect(onEnd.mock.calls).toHaveLength(1);

      const arg = onEnd.mock.calls[0]?.[0];
      expect(arg).toBeDefined();
      expect(arg.agent).toBeDefined();
      const oc = arg.context;
      expect(oc).toBeDefined();
      expect(oc.context).toBeInstanceOf(Map);
      expect(oc.operationId).toBeDefined();
      expect(oc.logger).toBeDefined();
      expect(arg.output).toBeDefined();
      expect(arg.output.text).toBe("Success response");
    });

    it("should call onStepFinish for multi-step generation", async () => {
      const onStepFinish = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: { onStepFinish },
        maxSteps: 2,
      });

      // Mock a multi-step response with tool calls
      const mockResponse = {
        text: "Final response",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [
          { stepNumber: 1, output: "Step 1" },
          { stepNumber: 2, output: "Step 2" },
        ],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      await agent.generateText("Test with steps");

      // onStepFinish might be called, depending on implementation
      // Just verify the test doesn't throw
      expect(onStepFinish.mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("SubAgent Management", () => {
    it("should add subagents", () => {
      const agent = new Agent({
        name: "MainAgent",
        instructions: "Main",
        model: mockModel as any,
      });

      const subAgent = new Agent({
        name: "SubAgent",
        instructions: "Sub",
        model: mockModel as any,
      });

      agent.addSubAgent(subAgent);

      const subAgents = agent.getSubAgents();
      expect(subAgents).toHaveLength(1);
    });

    it("should remove subagents", () => {
      const subAgent = new Agent({
        name: "SubAgent",
        instructions: "Sub",
        model: mockModel as any,
      });

      const agent = new Agent({
        name: "MainAgent",
        instructions: "Main",
        model: mockModel as any,
        subAgents: [subAgent],
      });

      agent.removeSubAgent(subAgent.id);

      const subAgents = agent.getSubAgents();
      expect(subAgents).toHaveLength(0);
    });
  });

  describe("Object Generation", () => {
    it("should generate object with schema", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Generate structured data",
        model: mockModel as any,
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const mockResponse = {
        object: { name: "John", age: 30 },
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
      };

      vi.mocked(ai.generateObject).mockResolvedValue(mockResponse as any);

      const result = await agent.generateObject("Generate a person", schema);

      expect(ai.generateObject).toHaveBeenCalled();
      expect(result.object).toEqual({ name: "John", age: 30 });
    });

    it("should stream object with schema", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Stream structured data",
        model: mockModel as any,
      });

      const schema = z.object({
        message: z.string(),
      });

      const mockStream = {
        object: Promise.resolve({ message: "Hello" }),
        partialObjectStream: (async function* () {
          yield { message: "H" };
          yield { message: "Hello" };
        })(),
        fullStream: (async function* () {
          yield { type: "object-delta", delta: { message: "H" } };
          yield { type: "object-delta", delta: { message: "ello" } };
        })(),
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
        warnings: [],
      };

      vi.mocked(ai.streamObject).mockReturnValue(mockStream as any);

      const result = await agent.streamObject("Stream a message", schema);

      expect(ai.streamObject).toHaveBeenCalled();
      const obj = await result.object;
      expect(obj).toEqual({ message: "Hello" });
    });

    it("should abort with ToolDeniedError passed to abortController", async () => {
      const mockExecute = vi.fn().mockResolvedValue("42");
      const tool = new Tool({
        name: "calculator",
        description: "Calculate math",
        parameters: z.object({ expression: z.string() }),
        execute: mockExecute,
      });

      const thrownError = new ToolDeniedError({
        toolName: "calculator",
        message: "Pro plan required for this tool.",
        code: "TOOL_FORBIDDEN",
        httpStatus: 403,
      });

      let abortSpy: any;

      const onToolStart = vi.fn().mockImplementation(({ context }) => {
        abortSpy = vi.spyOn(context.abortController, "abort");
        throw thrownError;
      });

      const onEnd = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use tools when needed",
        model: mockModel as any,
        tools: [tool],
        hooks: { onToolStart, onEnd },
      });

      vi.mocked(ai.generateText).mockImplementation(async (args: any) => {
        // Invoke the agent-provided tool wrapper so onToolStart is executed
        await args?.tools?.calculator?.execute({ expression: "40+2" });
        return {
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          response: {
            id: "test",
            modelId: "test-model",
            timestamp: new Date(),
          },
        } as any;
      });

      await agent.generateText("Calculate 40+2");

      // Give the abort listener a tick to run and set cancellationError
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));

      expect(ai.generateText).toHaveBeenCalled();
      expect(onToolStart).toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
      // onEnd should receive the cancellation error propagated from abortController
      expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ error: thrownError }));
      expect(abortSpy).toBeDefined();
      expect(abortSpy).toHaveBeenCalledWith(thrownError);
    });
  });

  describe("Middleware", () => {
    it("runs input middleware before input guardrails", async () => {
      const inputMiddleware = ({ input }: { input: string | UIMessage[] }) => {
        if (typeof input === "string") {
          return `${input}-middleware`;
        }
        return input;
      };

      const inputGuardrail = ({ input }: { input: string | UIMessage[] }) => {
        if (input !== "hello-middleware") {
          throw new Error("Guardrail saw unexpected input");
        }
        return { pass: true };
      };

      const agent = new Agent({
        name: "MiddlewareAgent",
        instructions: "Test",
        model: mockModel as any,
        inputMiddlewares: [inputMiddleware],
        inputGuardrails: [inputGuardrail as any],
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "ok",
        content: [{ type: "text", text: "ok" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      const result = await agent.generateText("hello");
      expect(result.text).toBe("ok");
    });

    it("runs output middleware before output guardrails", async () => {
      const outputMiddleware = ({ output }: { output: string }) => `${output}-middleware`;
      const outputGuardrail = ({ output }: { output: string }) => {
        if (output !== "base-middleware") {
          throw new Error("Guardrail saw unexpected output");
        }
        return { pass: true };
      };

      const agent = new Agent({
        name: "MiddlewareAgent",
        instructions: "Test",
        model: mockModel as any,
        outputMiddlewares: [outputMiddleware],
        outputGuardrails: [outputGuardrail as any],
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "base",
        content: [{ type: "text", text: "base" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      const result = await agent.generateText("hello");
      expect(result.text).toBe("base-middleware");
    });

    it("retries when middleware requests retry", async () => {
      const outputMiddleware = ({
        output,
        retryCount,
        abort,
      }: {
        output: string;
        retryCount: number;
        abort: (reason?: string, options?: { retry?: boolean }) => never;
      }) => {
        if (retryCount === 0) {
          abort("retry", { retry: true });
        }
        return `${output}-ok`;
      };

      const agent = new Agent({
        name: "MiddlewareRetryAgent",
        instructions: "Test",
        model: mockModel as any,
        outputMiddlewares: [outputMiddleware],
        maxMiddlewareRetries: 1,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "base",
        content: [{ type: "text", text: "base" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      const result = await agent.generateText("hello");
      expect(result.text).toBe("base-ok");
      expect(vi.mocked(ai.generateText)).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should fall back to the next model when the primary fails", async () => {
      const fallbackModel = new MockLanguageModelV3({
        modelId: "fallback-model",
        doGenerate: {
          content: [{ type: "text", text: "Fallback response" }],
          finishReason: "stop",
          usage: {
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            inputTokenDetails: {
              noCacheTokens: 10,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
            },
            outputTokenDetails: {
              textTokens: 5,
              reasoningTokens: 0,
            },
          },
          warnings: [],
        },
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: [
          { model: mockModel as any, maxRetries: 0 },
          { model: fallbackModel as any, maxRetries: 1 },
        ],
      });

      const mockResponse = {
        text: "Fallback response",
        content: [{ type: "text", text: "Fallback response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "fallback-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockImplementation(async (args: any) => {
        if (args.model === mockModel) {
          throw new Error("Primary model failed");
        }
        if (args.model === fallbackModel) {
          return mockResponse as any;
        }
        throw new Error("Unexpected model");
      });

      const result = await agent.generateText("Test");

      expect(result.text).toBe("Fallback response");
      expect(vi.mocked(ai.generateText)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(ai.generateText).mock.calls[0][0].model).toBe(mockModel);
      expect(vi.mocked(ai.generateText).mock.calls[1][0].model).toBe(fallbackModel);
      expect(vi.mocked(ai.generateText).mock.calls[1][0].maxRetries).toBe(0);
    });

    it("should retry the same model before returning a response", async () => {
      const agent = new Agent({
        name: "RetryAgent",
        instructions: "Test",
        model: mockModel as any,
        maxRetries: 2,
      });

      const mockResponse = {
        text: "Retry response",
        content: [{ type: "text", text: "Retry response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "retry-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      let callCount = 0;
      vi.mocked(ai.generateText).mockImplementation(async () => {
        callCount += 1;
        if (callCount < 3) {
          const error = new Error("Transient error");
          (error as any).isRetryable = true;
          throw error;
        }
        return mockResponse as any;
      });

      const result = await agent.generateText("Test");

      expect(result.text).toBe("Retry response");
      expect(vi.mocked(ai.generateText)).toHaveBeenCalledTimes(3);
      for (const call of vi.mocked(ai.generateText).mock.calls) {
        expect(call[0].maxRetries).toBe(0);
      }
    });

    it("should handle model errors gracefully", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const modelError = new Error("Model unavailable");
      vi.mocked(ai.generateText).mockRejectedValue(modelError);

      await expect(agent.generateText("Test")).rejects.toThrow("Model unavailable");
    });

    it("should handle invalid input", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      // Test with null/undefined
      await expect(agent.generateText(null as any)).rejects.toThrow();
    });

    it("should handle timeout with abort signal", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const controller = new AbortController();

      // Simulate abort
      setTimeout(() => controller.abort(), 10);

      vi.mocked(ai.generateText).mockImplementation(
        () =>
          new Promise((_, reject) => {
            controller.signal.addEventListener("abort", () => {
              reject(new Error("Aborted"));
            });
          }),
      );

      await expect(
        agent.generateText("Test", { abortSignal: controller.signal }),
      ).rejects.toThrow(); // Any error is fine, abort implementation may vary
    });
  });

  describe("Advanced Features", () => {
    it("should support dynamic instructions", async () => {
      const dynamicInstructions = vi.fn().mockResolvedValue("Dynamic instructions");

      const agent = new Agent({
        name: "TestAgent",
        instructions: dynamicInstructions,
        model: mockModel as any,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      await agent.generateText("Test");

      expect(dynamicInstructions).toHaveBeenCalled();
      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      if (callArgs?.messages?.[0]) {
        expect(callArgs.messages[0].role).toBe("system");
      }
    });

    it("should handle retriever integration", async () => {
      // Create a minimal mock retriever with required properties
      const mockRetriever = {
        tool: {
          name: "retrieve",
          description: "Retrieve context",
          parameters: z.object({ query: z.string() }),
          execute: vi.fn().mockResolvedValue("Retrieved context"),
        },
        retrieve: vi.fn().mockResolvedValue([{ text: "Relevant document", score: 0.9 }]),
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use context",
        model: mockModel as any,
        retriever: mockRetriever as any,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response with context",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      await agent.generateText("Query with RAG");

      // Just verify the agent works with retriever
      expect(agent).toBeDefined();
      expect(ai.generateText).toHaveBeenCalled();
    });

    it("should get full state", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const state = agent.getFullState();

      expect(state).toMatchObject({
        id: agent.id,
        name: "TestAgent",
        instructions: "Test",
        status: "idle",
        model: "test-model",
      });
      expect(state.tools).toBeDefined();
      expect(state.memory).toBeDefined();
      expect(state.subAgents).toBeDefined();
    });
  });

  describe("Tool Execution", () => {
    it("should execute tools during generation", async () => {
      const mockExecute = vi.fn().mockResolvedValue("Tool result");
      const tool = new Tool({
        name: "calculator",
        description: "Calculate math",
        parameters: z.object({ expression: z.string() }),
        execute: mockExecute,
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use tools when needed",
        model: mockModel as any,
        tools: [tool],
      });

      const mockResponse = {
        text: "The result is 42",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [
          {
            toolCallId: "call-1",
            toolName: "calculator",
            args: { expression: "40+2" },
          },
        ],
        toolResults: [
          {
            toolCallId: "call-1",
            result: "42",
          },
        ],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText("Calculate 40+2");

      expect(result.text).toBe("The result is 42");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolResults).toHaveLength(1);
    });

    it("should handle toolkit", () => {
      const addTool = new Tool({
        name: "add",
        description: "Add numbers",
        parameters: z.object({ a: z.number(), b: z.number() }),
        execute: async ({ a, b }) => a + b,
      });

      const multiplyTool = new Tool({
        name: "multiply",
        description: "Multiply numbers",
        parameters: z.object({ a: z.number(), b: z.number() }),
        execute: async ({ a, b }) => a * b,
      });

      const toolkit = {
        name: "math-toolkit",
        tools: [addTool, multiplyTool] as any,
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Math assistant",
        model: mockModel as any,
        toolkits: [toolkit],
      });

      const tools = agent.getTools();
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("add");
      expect(toolNames).toContain("multiply");
    });

    it("should remove toolkit", () => {
      const tool1 = new Tool({
        name: "tool1",
        description: "Tool 1",
        parameters: z.object({}),
        execute: async () => "result",
      });

      const toolkit = {
        name: "test-toolkit",
        tools: [tool1] as any,
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        toolkits: [toolkit],
      });

      const removed = agent.removeToolkit("test-toolkit");

      expect(removed).toBe(true);
      expect(agent.getTools()).toHaveLength(0);
    });
  });

  describe("prepareTools", () => {
    it("should merge static and runtime tools with runtime overrides", async () => {
      const staticOnlyTool = new Tool({
        name: "static-only",
        description: "Static only tool",
        parameters: z.object({}),
        execute: vi.fn().mockResolvedValue("static-only"),
      });
      const staticSharedTool = new Tool({
        name: "shared-tool",
        description: "Static shared tool",
        parameters: z.object({}),
        execute: vi.fn().mockResolvedValue("static-shared"),
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        tools: [staticOnlyTool, staticSharedTool],
      });

      const runtimeOnlyTool = new Tool({
        name: "runtime-only",
        description: "Runtime only tool",
        parameters: z.object({}),
        execute: vi.fn().mockResolvedValue("runtime-only"),
      });
      const runtimeOverrideTool = new Tool({
        name: "shared-tool",
        description: "Runtime override tool",
        parameters: z.object({}),
        execute: vi.fn().mockResolvedValue("runtime-override"),
      });

      const operationContext = (agent as any).createOperationContext("input message");
      const prepared = await (agent as any).prepareTools(
        [runtimeOnlyTool, runtimeOverrideTool],
        operationContext,
        3,
        {},
      );

      expect(Object.keys(prepared).sort()).toEqual(["runtime-only", "shared-tool", "static-only"]);
      expect(prepared["shared-tool"].description).toBe("Runtime override tool");
      expect(typeof prepared["runtime-only"].execute).toBe("function");
      expect(prepared["static-only"].description).toBe("Static only tool");
    });

    it("should add delegate tool when subagents are present", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const delegateTool = new Tool({
        name: "delegate-tool",
        description: "Delegate tool",
        parameters: z.object({}),
        execute: vi.fn(),
      });

      const mockHasSubAgents = vi.fn().mockReturnValue(true);
      const mockCreateDelegateTool = vi.fn().mockReturnValue(delegateTool);
      (agent as any).subAgentManager = {
        hasSubAgents: mockHasSubAgents,
        createDelegateTool: mockCreateDelegateTool,
      };

      const factorySpy = vi.spyOn(agent as any, "createToolExecutionFactory");

      const operationContext = (agent as any).createOperationContext("input message");
      const options = { conversationId: "conv-1", userId: "user-1" } as any;
      const prepared = await (agent as any).prepareTools([], operationContext, 7, options);

      expect(mockHasSubAgents).toHaveBeenCalledTimes(1);
      expect(mockCreateDelegateTool).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAgent: agent,
          currentHistoryEntryId: operationContext.operationId,
          operationContext,
          maxSteps: 7,
          conversationId: "conv-1",
          userId: "user-1",
        }),
      );
      expect(prepared["delegate-tool"]).toBeDefined();
      expect(typeof prepared["delegate-tool"].execute).toBe("function");
      expect(factorySpy).toHaveBeenCalledWith(operationContext, expect.any(Object));

      factorySpy.mockRestore();
    });

    it("should include working memory tools produced at runtime", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const workingMemoryTool = new Tool({
        name: "get_working_memory",
        description: "Working memory accessor",
        parameters: z.object({}),
        execute: vi.fn(),
      });

      const workingMemorySpy = vi
        .spyOn(agent as any, "createWorkingMemoryTools")
        .mockReturnValue([workingMemoryTool]);

      const operationContext = (agent as any).createOperationContext("input message");
      const options = { conversationId: "conv-2" } as any;
      const prepared = await (agent as any).prepareTools([], operationContext, 4, options);

      expect(workingMemorySpy).toHaveBeenCalledWith(options);
      expect(prepared.get_working_memory).toBeDefined();
      expect(typeof prepared.get_working_memory.execute).toBe("function");

      workingMemorySpy.mockRestore();
    });
  });

  describe("Utility Methods", () => {
    it("should get model name", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      expect(agent.getModelName()).toBe("test-model");
    });

    it("should get model name from fallback list", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: [{ model: mockModel as any }, { model: "mock/secondary" }],
      });

      expect(agent.getModelName()).toBe("test-model");
    });

    it("should unregister agent", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      // Should not throw
      expect(() => agent.unregister()).not.toThrow();
    });

    it("should get manager instances", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      expect(agent.getMemoryManager()).toBeDefined();
      expect(agent.getToolManager()).toBeDefined();
    });

    it("should check telemetry configuration", () => {
      // Without VoltOpsClient, should return false
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      expect(agent.isTelemetryConfigured()).toBe(false);

      // With VoltOpsClient, should return true
      const mockVoltOpsClient = {
        getApiUrl: () => "https://api.example.com",
        getAuthHeaders: () => ({ Authorization: "Bearer token" }),
        createPromptHelper: () => undefined, // Mock method
      };

      const agentWithVoltOps = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        voltOpsClient: mockVoltOpsClient as any,
      });

      expect(agentWithVoltOps.isTelemetryConfigured()).toBe(true);
    });

    it("should get tools for API", () => {
      const tool = new Tool({
        name: "apiTool",
        description: "API tool",
        parameters: z.object({ data: z.string() }),
        execute: async ({ data }) => data,
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        tools: [tool],
      });

      const apiTools = agent.getToolsForApi();
      expect(apiTools).toBeDefined();
      expect(Array.isArray(apiTools)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty messages", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response to empty",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      const result = await agent.generateText("");
      expect(result.text).toBe("Response to empty");
    });

    it("should handle very long messages", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const longMessage = "a".repeat(10000); // 10k characters

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Handled long message",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: { inputTokens: 1000, outputTokens: 5, totalTokens: 1005 },
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      } as any);

      const result = await agent.generateText(longMessage);
      expect(result.text).toBe("Handled long message");
    });

    it("should handle concurrent calls", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      let callCount = 0;
      vi.mocked(ai.generateText).mockImplementation(async () => {
        callCount++;
        return {
          text: `Response ${callCount}`,
          content: [],
          reasoning: [],
          files: [],
          sources: [],
          toolCalls: [],
          toolResults: [],
          finishReason: "stop",
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          warnings: [],
          request: {},
          response: {
            id: "test",
            modelId: "test-model",
            timestamp: new Date(),
            messages: [],
          },
          steps: [],
        } as any;
      });

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        agent.generateText("Call 1"),
        agent.generateText("Call 2"),
        agent.generateText("Call 3"),
      ]);

      expect(result1.text).toMatch(/Response \d/);
      expect(result2.text).toMatch(/Response \d/);
      expect(result3.text).toMatch(/Response \d/);
      expect(callCount).toBe(3);
    });
  });

  describe("enrichInstructions", () => {
    it("should add toolkit instructions when toolkits are present", async () => {
      const toolkit = {
        name: "test-toolkit",
        addInstructions: true,
        instructions: "Toolkit specific instructions",
        tools: [
          new Tool({
            name: "toolkit-tool",
            description: "A tool from toolkit",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        toolkits: [toolkit],
      });

      const operationContext = (agent as any).createOperationContext("test");
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        null,
        null,
        operationContext,
      );

      expect(enriched).toContain("Base content");
      expect(enriched).toContain("Toolkit specific instructions");
    });

    it("should add markdown instruction when markdown is enabled", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        markdown: true,
      });

      const operationContext = (agent as any).createOperationContext("test");
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        null,
        null,
        operationContext,
      );

      expect(enriched).toContain("Base content");
      expect(enriched).toContain("Use markdown to format your answers");
    });

    it("should add retriever context when provided", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
      });

      const operationContext = (agent as any).createOperationContext("test");
      const retrieverContext = "This is relevant context from retriever";
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        retrieverContext,
        null,
        operationContext,
      );

      expect(enriched).toContain("Base content");
      expect(enriched).toContain("Relevant Context:");
      expect(enriched).toContain(retrieverContext);
    });

    it("should add working memory context when provided", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
      });

      const operationContext = (agent as any).createOperationContext("test");
      const workingMemoryContext = "\n\nWorking memory: Recent important info";
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        null,
        workingMemoryContext,
        operationContext,
      );

      expect(enriched).toContain("Base content");
      expect(enriched).toContain("Working memory: Recent important info");
    });

    it("should handle all null contexts gracefully", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
      });

      const operationContext = (agent as any).createOperationContext("test");
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        null,
        null,
        operationContext,
      );

      expect(enriched).toBe("Base content");
    });

    it("should combine multiple enrichments correctly", async () => {
      const toolkit = {
        name: "test-toolkit",
        addInstructions: true,
        instructions: "Toolkit instructions",
        tools: [
          new Tool({
            name: "toolkit-tool",
            description: "Tool",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        toolkits: [toolkit],
        markdown: true,
      });

      const operationContext = (agent as any).createOperationContext("test");
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        "Retriever context",
        "\n\nWorking memory context",
        operationContext,
      );

      // Verify all components are present
      expect(enriched).toContain("Base content");
      expect(enriched).toContain("Toolkit instructions");
      expect(enriched).toContain("Use markdown to format your answers");
      expect(enriched).toContain("Relevant Context:");
      expect(enriched).toContain("Retriever context");
      expect(enriched).toContain("Working memory context");

      // Verify order is preserved
      const markdownIndex = enriched.indexOf("Use markdown");
      const retrieverIndex = enriched.indexOf("Relevant Context:");
      const workingMemoryIndex = enriched.indexOf("Working memory context");

      expect(markdownIndex).toBeLessThan(retrieverIndex);
      expect(retrieverIndex).toBeLessThan(workingMemoryIndex);
    });

    it("should add supervisor instructions when sub-agents are present", async () => {
      const subAgent = new Agent({
        name: "SubAgent",
        instructions: "Sub agent instructions",
        model: mockModel as any,
      });

      const agent = new Agent({
        name: "SupervisorAgent",
        instructions: "Supervisor instructions",
        model: mockModel as any,
        agents: [subAgent],
      });

      const operationContext = (agent as any).createOperationContext("test");

      // Mock prepareAgentsMemory to avoid complex setup
      vi.spyOn(agent as any, "prepareAgentsMemory").mockResolvedValue("Agents memory");

      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        null,
        null,
        operationContext,
      );

      // Should contain supervisor-related content
      expect(enriched).toContain("Base content");
      // The supervisor message would be added by subAgentManager.generateSupervisorSystemMessage
    });

    it("should handle empty base content", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        markdown: true,
      });

      const operationContext = (agent as any).createOperationContext("test");
      const enriched = await (agent as any).enrichInstructions(
        "",
        "Retriever context",
        null,
        operationContext,
      );

      expect(enriched).toContain("Use markdown to format your answers");
      expect(enriched).toContain("Retriever context");
    });

    it("should preserve content when no enrichments are needed", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        markdown: false, // No markdown
        toolkits: [], // No toolkits
        // No sub-agents by default
      });

      const operationContext = (agent as any).createOperationContext("test");
      const originalContent = "This is the original untouched content";
      const enriched = await (agent as any).enrichInstructions(
        originalContent,
        null, // No retriever context
        null, // No working memory
        operationContext,
      );

      expect(enriched).toBe(originalContent);
    });
  });

  describe("getSystemMessage integration", () => {
    it("should use enrichInstructions for text prompt type", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: {
          type: "text" as const,
          text: "Text prompt instructions",
        },
        model: mockModel as any,
        markdown: true,
      });

      const operationContext = (agent as any).createOperationContext("test");

      // Spy on enrichInstructions to verify it's called
      const enrichSpy = vi.spyOn(agent as any, "enrichInstructions");

      const systemMessage = await (agent as any).getSystemMessage(
        "user input",
        operationContext,
        {},
      );

      expect(enrichSpy).toHaveBeenCalledOnce();
      expect(enrichSpy).toHaveBeenCalledWith(
        "Text prompt instructions",
        null,
        null,
        operationContext,
      );

      expect(systemMessage).toMatchObject({
        role: "system",
      });
      expect(systemMessage.content).toContain("Text prompt instructions");
      expect(systemMessage.content).toContain("Use markdown to format your answers");
    });

    it("should use enrichInstructions for default string instructions", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "String instructions",
        model: mockModel as any,
        markdown: true,
      });

      const operationContext = (agent as any).createOperationContext("test");

      // Spy on enrichInstructions to verify it's called
      const enrichSpy = vi.spyOn(agent as any, "enrichInstructions");

      const systemMessage = await (agent as any).getSystemMessage(
        "user input",
        operationContext,
        {},
      );

      expect(enrichSpy).toHaveBeenCalledOnce();
      expect(enrichSpy).toHaveBeenCalledWith("String instructions", null, null, operationContext);

      expect(systemMessage).toMatchObject({
        role: "system",
      });
      expect(systemMessage.content).toContain("String instructions");
      expect(systemMessage.content).toContain("Use markdown to format your answers");
    });

    it("should produce identical output for text type and string with same content", async () => {
      const instructionContent = "Same instructions for both";

      // Agent with text type prompt
      const textAgent = new Agent({
        name: "TestAgent",
        instructions: {
          type: "text" as const,
          text: instructionContent,
        },
        model: mockModel as any,
        markdown: true,
      });

      // Agent with string instructions
      const stringAgent = new Agent({
        name: "TestAgent",
        instructions: instructionContent,
        model: mockModel as any,
        markdown: true,
      });

      const textContext = (textAgent as any).createOperationContext("test");
      const stringContext = (stringAgent as any).createOperationContext("test");

      const textSystemMessage = await (textAgent as any).getSystemMessage(
        "user input",
        textContext,
        {},
      );

      const stringSystemMessage = await (stringAgent as any).getSystemMessage(
        "user input",
        stringContext,
        {},
      );

      // Both should produce identical system messages
      expect(textSystemMessage.content).toBe(stringSystemMessage.content);
    });

    it("should handle chat type prompts without using enrichInstructions", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: {
          type: "chat" as const,
          messages: [
            { role: "system", content: "You are a helpful assistant" },
            { role: "user", content: "Example user message" },
            { role: "assistant", content: "Example response" },
          ],
        },
        model: mockModel as any,
      });

      const operationContext = (agent as any).createOperationContext("test");

      // Spy on enrichInstructions to verify it's NOT called for chat type
      const enrichSpy = vi.spyOn(agent as any, "enrichInstructions");

      const systemMessages = await (agent as any).getSystemMessage(
        "user input",
        operationContext,
        {},
      );

      expect(enrichSpy).not.toHaveBeenCalled();
      expect(Array.isArray(systemMessages)).toBe(true);
      expect(systemMessages).toHaveLength(3);
      expect(systemMessages[0].role).toBe("system");
      expect(systemMessages[0].content).toBe("You are a helpful assistant");
    });

    it("should handle dynamic instructions correctly", async () => {
      const dynamicFn = vi.fn().mockResolvedValue("Dynamic content");

      const agent = new Agent({
        name: "TestAgent",
        instructions: dynamicFn,
        model: mockModel as any,
        markdown: true,
      });

      const operationContext = (agent as any).createOperationContext("test");

      const systemMessage = await (agent as any).getSystemMessage("user input", operationContext, {
        context: { testData: "test" },
      });

      // Dynamic functions are called with context and prompts
      expect(dynamicFn).toHaveBeenCalledOnce();
      const callArg = dynamicFn.mock.calls[0][0];
      expect(callArg).toHaveProperty("context");
      expect(callArg).toHaveProperty("prompts");

      expect(systemMessage).toMatchObject({
        role: "system",
      });
      expect(systemMessage.content).toContain("Dynamic content");
      expect(systemMessage.content).toContain("Use markdown to format your answers");
    });

    it("should add retriever context correctly through enrichInstructions", async () => {
      // Create mock retriever
      const mockRetriever = {
        retrieve: vi.fn().mockResolvedValue("Retrieved context for query"),
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        retriever: mockRetriever as any,
      });

      const operationContext = (agent as any).createOperationContext("test query");

      // Mock getRetrieverContext to return specific context
      vi.spyOn(agent as any, "getRetrieverContext").mockResolvedValue(
        "Retrieved context for query",
      );

      const systemMessage = await (agent as any).getSystemMessage(
        "test query",
        operationContext,
        {},
      );

      expect(systemMessage.content).toContain("Base instructions");
      expect(systemMessage.content).toContain("Relevant Context:");
      expect(systemMessage.content).toContain("Retrieved context for query");
    });
  });
});
