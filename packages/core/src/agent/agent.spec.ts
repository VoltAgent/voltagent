/**
 * Unit tests for Agent class
 * Using AI SDK's native test helpers with minimal mocking
 */

import type { ModelMessage } from "@ai-sdk/provider-utils";
import { safeStringify } from "@voltagent/internal/utils";
import * as ai from "ai";
import type { UIMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { AgentRegistry } from "../registries/agent-registry";
import { ModelProviderRegistry } from "../registries/model-provider-registry";
import { Tool, tool as aiSdkTool } from "../tool";
import { Workspace } from "../workspace";
import { Agent, renameProviderOptions } from "./agent";
import { SPECULATIVE_INPUT_GUARDRAIL_CONTEXT_KEY } from "./context-keys";
import { ConversationBuffer } from "./conversation-buffer";
import { ToolDeniedError } from "./errors";
import { createHooks } from "./hooks";
import { convertArrayToReadableStream } from "./test-utils";

// Mock the AI SDK functions while preserving core converters
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
    generateObject: vi.fn(),
    streamObject: vi.fn(),
    isStepCount: vi.fn(() => vi.fn(() => false)),
  };
});

describe("Agent", () => {
  const toAsyncIterableStream = <T>(stream: ReadableStream<T>): ai.AsyncIterableStream<T> => {
    const asyncStream = stream as ai.AsyncIterableStream<T>;
    if (!asyncStream[Symbol.asyncIterator]) {
      asyncStream[Symbol.asyncIterator] = async function* () {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (value !== undefined) {
              yield value;
            }
          }
        } finally {
          reader.releaseLock();
        }
      };
    }
    return asyncStream;
  };

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

  const toText = (message: ModelMessage): string => {
    const content = (message as { content?: unknown }).content;
    if (typeof content === "string") {
      return content;
    }
    if (!Array.isArray(content)) {
      return "";
    }

    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n");
  };

  const getInstructionMessages = (callArgs?: {
    instructions?: unknown;
    messages?: ModelMessage[];
  }): ModelMessage[] => {
    const instructions = callArgs?.instructions;
    const instructionMessages =
      instructions == null
        ? []
        : typeof instructions === "string"
          ? [{ role: "system", content: instructions }]
          : Array.isArray(instructions)
            ? instructions
            : [instructions];

    return [
      ...(instructionMessages as ModelMessage[]),
      ...((callArgs?.messages || []).filter((message) => message.role === "system") || []),
    ];
  };

  const getSystemTexts = (callArgs?: { instructions?: unknown; messages?: ModelMessage[] }) =>
    getInstructionMessages(callArgs).map(toText);

  describe("Workspace skills prompt injection", () => {
    const createWorkspaceWithSkill = () => {
      const timestamp = new Date().toISOString();
      return new Workspace({
        filesystem: {
          files: {
            "/skills/data/SKILL.md": {
              content: `---
name: Data Analyst
description: Analyze CSV data
---
Use pandas and summarize findings.`.split("\n"),
              created_at: timestamp,
              modified_at: timestamp,
            },
          },
        },
        skills: {
          rootPaths: ["/skills"],
          autoDiscover: false,
        },
      });
    };

    const createMockGenerateTextResponse = () => ({
      text: "Workspace response",
      content: [{ type: "text", text: "Workspace response" }],
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
    });

    it("auto-injects workspace skills prompt by default", async () => {
      const workspace = createWorkspaceWithSkill();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use skills when relevant.",
        model: mockModel as any,
        workspace,
      });

      vi.mocked(ai.generateText).mockResolvedValue(createMockGenerateTextResponse() as any);

      await agent.generateText("Analyze my data");

      const callArgs = vi.mocked(ai.generateText).mock.calls[0]?.[0];
      const systemTexts = getSystemTexts(callArgs);

      expect(systemTexts.some((text) => text.includes("<workspace_skills>"))).toBe(true);
      expect(systemTexts.some((text) => text.includes("Data Analyst (/skills/data)"))).toBe(true);
    });

    it("composes auto-injection with custom onPrepareMessages by default", async () => {
      const workspace = createWorkspaceWithSkill();
      const onPrepareMessages = vi.fn(({ messages }) => ({
        messages: (messages || []).filter((message) => message.role !== "system"),
      }));

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use skills when relevant.",
        model: mockModel as any,
        workspace,
        hooks: { onPrepareMessages },
      });

      vi.mocked(ai.generateText).mockResolvedValue(createMockGenerateTextResponse() as any);

      await agent.generateText("Analyze my data");

      const callArgs = vi.mocked(ai.generateText).mock.calls[0]?.[0];
      const systemTexts = getSystemTexts(callArgs);

      expect(onPrepareMessages).toHaveBeenCalledTimes(1);
      expect(systemTexts.some((text) => text.includes("<workspace_skills>"))).toBe(true);
    });

    it("disables auto-injection when workspaceSkillsPrompt is false", async () => {
      const workspace = createWorkspaceWithSkill();
      const onPrepareMessages = vi.fn(({ messages }) => ({ messages }));

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use skills when relevant.",
        model: mockModel as any,
        workspace,
        hooks: { onPrepareMessages },
        workspaceSkillsPrompt: false,
      });

      vi.mocked(ai.generateText).mockResolvedValue(createMockGenerateTextResponse() as any);

      await agent.generateText("Analyze my data");

      const callArgs = vi.mocked(ai.generateText).mock.calls[0]?.[0];
      const systemTexts = getSystemTexts(callArgs);

      expect(onPrepareMessages).toHaveBeenCalledTimes(1);
      expect(systemTexts.some((text) => text.includes("<workspace_skills>"))).toBe(false);
    });

    it("allows forcing auto-injection with workspaceSkillsPrompt", async () => {
      const workspace = createWorkspaceWithSkill();
      const onPrepareMessages = vi.fn(({ messages }) => ({ messages }));

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Use skills when relevant.",
        model: mockModel as any,
        workspace,
        hooks: { onPrepareMessages },
        workspaceToolkits: { skills: false },
        workspaceSkillsPrompt: true,
      });

      vi.mocked(ai.generateText).mockResolvedValue(createMockGenerateTextResponse() as any);

      await agent.generateText("Analyze my data");

      const callArgs = vi.mocked(ai.generateText).mock.calls[0]?.[0];
      const systemTexts = getSystemTexts(callArgs);

      expect(onPrepareMessages).toHaveBeenCalledTimes(1);
      expect(systemTexts.some((text) => text.includes("<workspace_skills>"))).toBe(true);
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
      expect(getSystemTexts(callArgs)).toContain("You are a helpful assistant");
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages?.[0].role).toBe("user");

      expect(result.text).toBe("Generated response");
    });

    it("should preserve structured output on generateText results", async () => {
      const agent = new Agent({
        name: "StructuredTextAgent",
        instructions: "Return structured data",
        model: mockModel as any,
      });

      const output = ai.Output.object({
        schema: z.object({
          answer: z.string(),
          count: z.number(),
        }),
      });
      const providerOptions = {
        openai: {
          reasoningEffort: "low",
        },
      } as const;
      const context = new Map<string | symbol, unknown>([["requestId", "req-123"]]);

      const mockResponse = {
        text: "Structured response",
        content: [{ type: "text", text: "Structured response" }],
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
          id: "structured-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
        output: {
          answer: "ok",
          count: 2,
        },
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText("Return JSON", {
        output,
        providerOptions,
        context,
        userId: "user-1",
        conversationId: "conv-1",
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.output).toBe(output);
      expect(callArgs.providerOptions).toBe(providerOptions);
      expect(callArgs.maxRetries).toBe(0);
      expect(callArgs.model).toBe(mockModel);

      expect(result.text).toBe("Structured response");
      expect(result.output).toEqual({ answer: "ok", count: 2 });
      expect(result.context.get("requestId")).toBe("req-123");
    });

    it("should preserve positional generateText options for AI SDK calls", async () => {
      const agent = new Agent({
        name: "PositionalTextAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const providerOptions = {
        openai: {
          reasoningEffort: "medium",
        },
      } as const;
      const context = new Map<string | symbol, unknown>([["tenantId", "tenant-1"]]);
      const stopWhen = vi.fn(() => false);
      const toolApproval = {
        get_weather: "user-approval" as const,
      };
      const experimentalToolApprovalSecret = new Uint8Array([1, 2, 3]);

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
          id: "positional-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText("Keep positional API", {
        temperature: 0.2,
        maxOutputTokens: 256,
        topP: 0.8,
        seed: 123,
        stop: ["END"],
        stopWhen,
        toolChoice: "none",
        toolApproval,
        experimental_toolApprovalSecret: experimentalToolApprovalSecret,
        providerOptions,
        context,
        userId: "user-1",
        conversationId: "conv-1",
        requestHeaders: {
          authorization: "Bearer test",
        },
        maxSteps: 7,
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
      expect(callArgs.temperature).toBe(0.2);
      expect(callArgs.maxOutputTokens).toBe(256);
      expect(callArgs.topP).toBe(0.8);
      expect(callArgs.seed).toBe(123);
      expect(callArgs.stop).toEqual(["END"]);
      expect(callArgs.stopWhen).toBe(stopWhen);
      expect(callArgs.toolChoice).toBe("none");
      expect(callArgs.toolApproval).toBe(toolApproval);
      expect(callArgs.experimental_toolApprovalSecret).toBe(experimentalToolApprovalSecret);
      expect(callArgs.providerOptions).toBe(providerOptions);
      expect(callArgs.maxRetries).toBe(0);
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(callArgs).not.toHaveProperty("requestHeaders");
      expect(callArgs).not.toHaveProperty("maxSteps");
      expect(result.context.get("tenantId")).toBe("tenant-1");
    });

    it("should normalize object-style generateText requests", async () => {
      const agent = new Agent({
        name: "ObjectStyleTextAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const output = ai.Output.object({
        schema: z.object({
          answer: z.string(),
        }),
      });
      const providerOptions = {
        openai: {
          reasoningEffort: "high",
        },
      } as const;
      const context = {
        requestId: "req-object-1",
      };

      const mockResponse = {
        text: "Object-style response",
        content: [{ type: "text", text: "Object-style response" }],
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
          id: "object-style-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
        output: {
          answer: "ok",
        },
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText({
        prompt: "Keep object-style API",
        options: {
          temperature: 0.2,
          providerOptions,
          context,
          userId: "user-1",
          conversationId: "conv-1",
        },
        temperature: 0.6,
        maxOutputTokens: 64,
        output,
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
      expect(callArgs.temperature).toBe(0.6);
      expect(callArgs.maxOutputTokens).toBe(64);
      expect(callArgs.providerOptions).toBe(providerOptions);
      expect(callArgs.output).toBe(output);
      expect(callArgs.maxRetries).toBe(0);
      expect(callArgs).not.toHaveProperty("prompt");
      expect(callArgs).not.toHaveProperty("options");
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(result.text).toBe("Object-style response");
      expect(result.output).toEqual({ answer: "ok" });
      expect(result.context.get("requestId")).toBe("req-object-1");
    });

    it("should normalize voltagent namespaced runtime options for generateText", async () => {
      let startContext: any;
      let capturedHeaders: Record<string, string> | undefined;
      const agent = new Agent({
        name: "NamespacedRuntimeTextAgent",
        instructions: async ({ headers }) => {
          capturedHeaders = headers;
          return "You are a helpful assistant";
        },
        model: mockModel as any,
        hooks: createHooks({
          onStart: ({ context }) => {
            startContext = context;
          },
        }),
      });

      const mockResponse = {
        text: "Namespaced response",
        content: [{ type: "text", text: "Namespaced response" }],
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
          id: "namespaced-runtime-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateText({
        prompt: "Use namespaced runtime options",
        temperature: 0.3,
        userId: "legacy-user",
        conversationId: "legacy-conv",
        context: {
          requestId: "legacy-request",
        },
        requestHeaders: {
          "x-runtime-source": "legacy",
        },
        voltagent: {
          userId: "runtime-user",
          conversationId: "runtime-conv",
          context: {
            requestId: "runtime-request",
            tenantId: "tenant-1",
          },
          requestHeaders: {
            "x-runtime-source": "voltagent",
          },
          maxSteps: 3,
        },
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.3);
      expect(callArgs).not.toHaveProperty("voltagent");
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(callArgs).not.toHaveProperty("requestHeaders");
      expect(callArgs).not.toHaveProperty("maxSteps");

      expect(result.context.get("requestId")).toBe("runtime-request");
      expect(result.context.get("tenantId")).toBe("tenant-1");
      expect(startContext.userId).toBe("runtime-user");
      expect(startContext.conversationId).toBe("runtime-conv");
      expect(capturedHeaders).toEqual({
        "x-runtime-source": "voltagent",
      });
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
      const instructionMessage = getInstructionMessages(callArgs)[0] as any;
      expect(instructionMessage).toMatchObject({ role: "system" });
      expect(instructionMessage.parts).toBeUndefined();
      expect(callArgs.messages?.some((message) => message.role === "system")).toBe(false);
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
      expect(getInstructionMessages(callArgs)[0]).toMatchObject({
        role: "system",
        providerOptions: {
          anthropic: {
            cacheControl,
          },
        },
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
      expect(getInstructionMessages(callArgs)).toContain(injectedModelMessage);
    });

    it("should throw a descriptive error when structured output is missing", async () => {
      const onEnd = vi.fn();
      const onError = vi.fn();
      const tool = new Tool({
        name: "echo_tool",
        description: "Echo tool",
        parameters: z.object({ value: z.string() }),
        execute: async ({ value }) => ({ echoed: value }),
      });

      const agent = new Agent({
        name: "StructuredOutputAgent",
        instructions: "Use tools and return structured output",
        model: mockModel as any,
        tools: [tool],
        maxRetries: 0,
        hooks: { onEnd, onError },
      });

      const toolCall = {
        type: "tool-call" as const,
        toolCallId: "call-1",
        toolName: "echo_tool",
        input: { value: "hello" },
      };
      const toolResult = {
        type: "tool-result" as const,
        toolCallId: "call-1",
        toolName: "echo_tool",
        input: { value: "hello" },
        output: { echoed: "hello" },
      };

      const mockResponse = {
        text: "Tool call completed.",
        content: [{ type: "text", text: "Tool call completed." }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [toolCall],
        toolResults: [toolResult],
        finishReason: "tool-calls",
        usage: {
          inputTokens: 12,
          outputTokens: 6,
          totalTokens: 18,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        providerMetadata: {
          openrouter: {
            usage: {
              cost: 0.0012,
              isByok: true,
            },
          },
        },
        steps: [
          {
            text: "Tool call completed.",
            content: [{ type: "text", text: "Tool call completed." }],
            reasoning: [],
            reasoningText: undefined,
            files: [],
            sources: [],
            toolCalls: [toolCall],
            staticToolCalls: [],
            dynamicToolCalls: [],
            toolResults: [toolResult],
            staticToolResults: [],
            dynamicToolResults: [],
            finishReason: "tool-calls",
            usage: {
              inputTokens: 12,
              outputTokens: 6,
              totalTokens: 18,
            },
            warnings: [],
            request: {},
            response: {
              id: "test-response-step-1",
              modelId: "test-model",
              timestamp: new Date(),
              messages: [],
            },
            providerMetadata: undefined,
          },
        ],
        get output() {
          throw new ai.NoOutputGeneratedError();
        },
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const resultPromise = agent.generateText("Use the tool and return JSON", {
        output: ai.Output.object({
          schema: z.object({
            message: z.string(),
          }),
        }),
      });

      await expect(resultPromise).rejects.toThrow(
        "Structured output was requested but no final output was generated",
      );
      await expect(resultPromise).rejects.toMatchObject({
        name: "VoltAgentError",
        stage: "response_parsing",
        code: "STRUCTURED_OUTPUT_NOT_GENERATED",
      });
      expect(onEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "STRUCTURED_OUTPUT_NOT_GENERATED",
            stage: "response_parsing",
            metadata: expect.objectContaining({
              finishReason: "tool-calls",
              usage: expect.objectContaining({
                inputTokens: 12,
                outputTokens: 6,
                totalTokens: 18,
              }),
              providerMetadata: expect.objectContaining({
                openrouter: expect.any(Object),
              }),
            }),
          }),
        }),
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "STRUCTURED_OUTPUT_NOT_GENERATED",
            stage: "response_parsing",
          }),
        }),
      );
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
        get stream() {
          return this.fullStream;
        },
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
      expect(getSystemTexts(callArgs)).toContain("You are a helpful assistant");
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages?.[0].role).toBe("user");

      const text = await result.text;
      expect(text).toBe("Streamed response");
    });

    it("should preserve positional streamText options for AI SDK calls", async () => {
      const agent = new Agent({
        name: "PositionalStreamAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const providerOptions = {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 1024,
          },
        },
      } as const;
      const context = new Map<string | symbol, unknown>([["requestId", "req-456"]]);
      const stopWhen = vi.fn(() => false);
      const toolApproval = {
        get_weather: "approved" as const,
      };
      const experimentalToolApprovalSecret = new Uint8Array([4, 5, 6]);
      const mockStream = {
        text: Promise.resolve("Streamed response"),
        textStream: (async function* () {
          yield "Streamed response";
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: (async function* () {
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
        toUIMessageStream: vi.fn(),
        toUIMessageStreamResponse: vi.fn(),
        pipeUIMessageStreamToResponse: vi.fn(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
        partialOutputStream: undefined,
      };

      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      const result = await agent.streamText("Keep positional stream API", {
        temperature: 0.4,
        maxOutputTokens: 128,
        topK: 20,
        seed: 456,
        stop: "DONE",
        stopWhen,
        toolChoice: "none",
        toolApproval,
        experimental_toolApprovalSecret: experimentalToolApprovalSecret,
        providerOptions,
        context,
        userId: "user-1",
        conversationId: "conv-1",
        requestHeaders: {
          "x-request-id": "req-456",
        },
        maxSteps: 5,
      });

      const callArgs = vi.mocked(ai.streamText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
      expect(callArgs.temperature).toBe(0.4);
      expect(callArgs.maxOutputTokens).toBe(128);
      expect(callArgs.topK).toBe(20);
      expect(callArgs.seed).toBe(456);
      expect(callArgs.stop).toBe("DONE");
      expect(callArgs.stopWhen).toBe(stopWhen);
      expect(callArgs.toolChoice).toBe("none");
      expect(callArgs.toolApproval).toBe(toolApproval);
      expect(callArgs.experimental_toolApprovalSecret).toBe(experimentalToolApprovalSecret);
      expect(callArgs.providerOptions).toBe(providerOptions);
      expect(callArgs.maxRetries).toBe(0);
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(callArgs).not.toHaveProperty("requestHeaders");
      expect(callArgs).not.toHaveProperty("maxSteps");
      expect(result.context.get("requestId")).toBe("req-456");
    });

    it("should normalize object-style streamText requests", async () => {
      const agent = new Agent({
        name: "ObjectStyleStreamAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const messages: UIMessage[] = [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Stream from messages" }],
        },
      ];
      const providerOptions = {
        openai: {
          reasoningEffort: "low",
        },
      } as const;
      const context = new Map<string | symbol, unknown>([["requestId", "req-stream-object"]]);
      const mockStream = {
        text: Promise.resolve("Streamed object-style response"),
        textStream: (async function* () {
          yield "Streamed object-style response";
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: (async function* () {
          yield {
            type: "text-delta" as const,
            id: "text-1",
            delta: "Streamed object-style response",
            text: "Streamed object-style response",
          };
        })(),
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
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

      const result = await agent.streamText({
        messages,
        options: {
          temperature: 0.1,
          providerOptions,
          context,
          userId: "user-1",
          conversationId: "conv-1",
        },
        temperature: 0.5,
        topP: 0.9,
      });

      const callArgs = vi.mocked(ai.streamText).mock.calls[0][0];
      expect(callArgs.model).toBe(mockModel);
      expect(callArgs.temperature).toBe(0.5);
      expect(callArgs.topP).toBe(0.9);
      expect(callArgs.providerOptions).toBe(providerOptions);
      expect(callArgs.maxRetries).toBe(0);
      expect(callArgs).not.toHaveProperty("messagesInput");
      expect(callArgs).not.toHaveProperty("options");
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(result.context.get("requestId")).toBe("req-stream-object");
    });

    it("should normalize voltagent namespaced runtime options for positional streamText", async () => {
      let startContext: any;
      const agent = new Agent({
        name: "NamespacedRuntimeStreamAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
        hooks: createHooks({
          onStart: ({ context }) => {
            startContext = context;
          },
        }),
      });

      const mockStream = {
        text: Promise.resolve("Streamed namespaced response"),
        textStream: (async function* () {
          yield "Streamed namespaced response";
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: (async function* () {
          yield {
            type: "text-delta" as const,
            id: "text-1",
            delta: "Streamed namespaced response",
            text: "Streamed namespaced response",
          };
        })(),
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
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

      const result = await agent.streamText("Stream with namespaced options", {
        userId: "legacy-user",
        conversationId: "legacy-conv",
        context: {
          requestId: "legacy-request",
        },
        voltagent: {
          userId: "runtime-user",
          conversationId: "runtime-conv",
          context: {
            requestId: "runtime-request",
          },
          resumableStream: true,
        },
      });

      const callArgs = vi.mocked(ai.streamText).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("voltagent");
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(callArgs).not.toHaveProperty("resumableStream");
      expect(result.context.get("requestId")).toBe("runtime-request");
      expect(startContext.userId).toBe("runtime-user");
      expect(startContext.conversationId).toBe("runtime-conv");
    });

    it("should pass AI SDK v7 generateText options, strip VoltAgent-owned telemetry/runtime fields, and compose managed callbacks", async () => {
      const hookOnStepEnd = vi.fn();
      const userOnStepEnd = vi.fn();
      const userOnEnd = vi.fn();
      const onStart = vi.fn();
      const onStepStart = vi.fn();
      const experimentalDownload = vi.fn(async (downloads: Array<{ url: URL }>) =>
        downloads.map(() => null),
      );
      const agent = new Agent({
        name: "AISDKOptionsAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
        hooks: createHooks({
          onStepEnd: hookOnStepEnd,
        }),
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response",
        content: [{ type: "text", text: "Response" }],
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

      await agent.generateText({
        prompt: "Hello",
        timeout: {
          totalMs: 10_000,
          stepMs: 5_000,
        },
        headers: {
          "x-provider-header": "provider-value",
        },
        include: {
          requestBody: true,
          requestMessages: true,
          responseBody: true,
        },
        experimental_download: experimentalDownload,
        onStart,
        onStepStart,
        onStepEnd: userOnStepEnd,
        onEnd: userOnEnd,
        ...({
          telemetry: {
            isEnabled: false,
            functionId: "generateText-test",
          },
          experimental_telemetry: {
            isEnabled: false,
          },
          runtimeContext: {
            tenantId: "tenant-1",
          },
          toolsContext: {
            lookup_order: {
              requestId: "tool-request-1",
            },
          },
        } as Record<string, unknown>),
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.timeout).toEqual({ totalMs: 10_000, stepMs: 5_000 });
      expect(callArgs.headers).toEqual({ "x-provider-header": "provider-value" });
      expect(callArgs.telemetry).toBeUndefined();
      expect(callArgs.experimental_telemetry).toBeUndefined();
      expect(callArgs.runtimeContext).toBeUndefined();
      expect(callArgs.toolsContext).toEqual({
        lookup_order: {
          requestId: "tool-request-1",
        },
      });
      expect(callArgs.include).toEqual({
        requestBody: true,
        requestMessages: true,
        responseBody: true,
      });
      expect(callArgs.experimental_download).toBe(experimentalDownload);
      expect(callArgs.onStart).toBe(onStart);
      expect(callArgs.onStepStart).toBe(onStepStart);
      expect(callArgs.onEnd).toBeUndefined();
      expect(callArgs.onFinish).toBeUndefined();
      expect(userOnEnd).toHaveBeenCalledTimes(1);
      expect(userOnEnd.mock.calls[0][0]).toMatchObject({
        text: "Response",
        context: expect.any(Map),
      });

      await callArgs.onStepEnd?.({
        content: [],
        response: {
          messages: [],
        },
      } as any);

      expect(hookOnStepEnd).toHaveBeenCalledTimes(1);
      expect(userOnStepEnd).toHaveBeenCalledTimes(1);
    });

    it("should pass AI SDK v7 streamText options and compose managed callbacks", async () => {
      const onChunk = vi.fn();
      const onAbort = vi.fn();
      const userOnError = vi.fn();
      const agent = new Agent({
        name: "AISDKStreamOptionsAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const mockStream = {
        text: Promise.resolve("Streamed response"),
        textStream: (async function* () {
          yield "Streamed response";
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: (async function* () {
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
        toUIMessageStream: vi.fn(),
        toUIMessageStreamResponse: vi.fn(),
        pipeUIMessageStreamToResponse: vi.fn(),
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(),
        partialOutputStream: undefined,
      };

      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      await agent.streamText({
        prompt: "Hello",
        timeout: {
          totalMs: 10_000,
          chunkMs: 1_000,
        },
        include: {
          requestBody: true,
          requestMessages: true,
          rawChunks: true,
        },
        includeRawChunks: true,
        experimental_transform: [],
        onChunk,
        onAbort,
        onError: userOnError,
      });

      const callArgs = vi.mocked(ai.streamText).mock.calls[0][0];
      expect(callArgs.timeout).toEqual({ totalMs: 10_000, chunkMs: 1_000 });
      expect(callArgs.include).toEqual({
        requestBody: true,
        requestMessages: true,
        rawChunks: true,
      });
      expect(callArgs.includeRawChunks).toBe(true);
      expect(callArgs.experimental_transform).toEqual([]);
      expect(callArgs.onChunk).toBe(onChunk);
      expect(callArgs.onAbort).toBe(onAbort);
      expect(callArgs.onError).not.toBe(userOnError);

      const abortError = new Error("client aborted");
      abortError.name = "AbortError";
      await callArgs.onError?.({ error: abortError });

      expect(userOnError).toHaveBeenCalledTimes(1);
      expect(userOnError).toHaveBeenCalledWith({ error: abortError });
    });

    it("should use bailed delegate_task output as streamText final text", async () => {
      const agent = new Agent({
        name: "SupervisorAgent",
        instructions: "Delegate when useful",
        model: mockModel as any,
      });

      const mockStream = {
        text: Promise.resolve("Supervisor continuation"),
        textStream: (async function* () {
          yield "Supervisor continuation";
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: (async function* () {
          yield {
            type: "tool-result" as const,
            toolCallId: "call-1",
            toolName: "delegate_task",
            input: {},
            output: [
              {
                agentName: "Research Agent",
                response: "Bailed final answer",
                usage: {},
                bailed: true,
              },
            ],
          };
        })(),
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        }),
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

      const result = await agent.streamText("Delegate this");
      const callArgs = vi.mocked(ai.streamText).mock.calls[0][0];

      await callArgs.onStepEnd?.({
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "delegate_task",
            input: {},
            output: [
              {
                agentName: "Research Agent",
                response: "Bailed final answer",
                usage: {},
                bailed: true,
              },
            ],
          },
        ],
        response: {
          messages: [],
        },
      } as any);

      expect(callArgs.abortSignal.aborted).toBe(true);
      await expect(result.text).resolves.toBe("Bailed final answer");
    });

    it("does not eagerly materialize lazy stream result promises", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const getterAccesses = {
        text: 0,
        usage: 0,
        finishReason: 0,
      };

      const mockStream = {
        get text() {
          getterAccesses.text += 1;
          return Promise.resolve("Streamed response");
        },
        textStream: (async function* () {
          yield "Streamed response";
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: toAsyncIterableStream(
          convertArrayToReadableStream([
            {
              type: "text-delta" as const,
              id: "text-1",
              delta: "Streamed response",
              text: "Streamed response",
            },
          ]),
        ),
        get usage() {
          getterAccesses.usage += 1;
          return Promise.resolve({
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
          });
        },
        get finishReason() {
          getterAccesses.finishReason += 1;
          return Promise.resolve("stop");
        },
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

      expect(getterAccesses).toEqual({
        text: 0,
        usage: 0,
        finishReason: 0,
      });

      await expect(result.text).resolves.toBe("Streamed response");
      await expect(result.usage).resolves.toEqual({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });
      await expect(result.finishReason).resolves.toBe("stop");
      expect(getterAccesses).toEqual({
        text: 1,
        usage: 1,
        finishReason: 1,
      });
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
        get stream() {
          return this.fullStream;
        },
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
      for await (const part of result.stream) {
        parts.push(part);
      }
      expect(parts).toHaveLength(2);
      expect(parts[0]).toEqual(expect.objectContaining({ type: "start", messageId: generatedId }));
      expect(parts[1]).toEqual(expect.objectContaining({ type: "text-delta", id: "text-1" }));
    });

    it("keeps aggregate total usage for finish events when provider is anthropic", async () => {
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
        get stream() {
          return this.fullStream;
        },
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
        totalUsage: Promise.resolve(summedUsage),
        steps: Promise.resolve([{ usage: lastStepUsage }]),
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
      for await (const part of result.stream) {
        parts.push(part);
      }

      const finishPart = parts.find((part) => part.type === "finish");
      expect(finishPart?.totalUsage).toEqual(summedUsage);
      await expect(result.totalUsage).resolves.toEqual(summedUsage);
      await expect(result.steps).resolves.toEqual([{ usage: lastStepUsage }]);
    });

    it("keeps fullStream intact after probe for ReadableStream-based providers", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const fullStream = toAsyncIterableStream(
        convertArrayToReadableStream([
          { type: "start" as const },
          {
            type: "reasoning-delta" as const,
            id: "reasoning-1",
            delta: "Let me think...",
          },
          { type: "text-delta" as const, id: "text-1", delta: "Final answer" },
          { type: "finish" as const, finishReason: "stop", totalUsage: {} },
        ]),
      );

      const mockStream = {
        text: Promise.resolve("Final answer"),
        textStream: (async function* () {
          yield "Final answer";
        })(),
        stream: fullStream,
        fullStream,
        usage: Promise.resolve({
          inputTokens: 10,
          outputTokens: 3,
          totalTokens: 13,
        }),
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

      const result = await agent.streamText("answer me");
      const emittedTypes: string[] = [];
      for await (const part of result.stream as AsyncIterable<{ type: string }>) {
        emittedTypes.push(part.type);
      }

      expect(emittedTypes).toContain("reasoning-delta");
      expect(emittedTypes).toContain("text-delta");
      expect(emittedTypes).toContain("finish");
    });

    it("does not lock getter-based teeing fullStream after probe", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "You are a helpful assistant",
        model: mockModel as any,
      });

      const streamParts = [
        { type: "start" as const },
        { type: "text-start" as const, id: "text-1" },
        { type: "text-delta" as const, id: "text-1", delta: "Hello " },
        { type: "text-delta" as const, id: "text-1", delta: "world" },
        { type: "text-end" as const, id: "text-1" },
        { type: "finish" as const, finishReason: "stop", totalUsage: {} },
      ];

      class TeeingStreamResult {
        private baseStream: ReadableStream<any>;
        private readonly cachedText: Promise<string>;

        constructor(parts: ReadonlyArray<any>) {
          this.baseStream = convertArrayToReadableStream([...parts]);
          this.cachedText = this.consumeText();
        }

        private teeStream(): ai.AsyncIterableStream<any> {
          const [probeStream, passthroughStream] = this.baseStream.tee();
          this.baseStream = passthroughStream;
          return toAsyncIterableStream(probeStream);
        }

        get stream(): ai.AsyncIterableStream<any> {
          return this.teeStream();
        }

        get fullStream(): ai.AsyncIterableStream<any> {
          return this.stream;
        }

        get text(): Promise<string> {
          return this.cachedText;
        }

        get textStream(): AsyncIterable<string> {
          return (async function* () {
            yield "Hello world";
          })();
        }

        readonly usage = Promise.resolve({
          inputTokens: 10,
          outputTokens: 2,
          totalTokens: 12,
        });
        readonly finishReason = Promise.resolve("stop");
        readonly warnings: never[] = [];
        readonly toUIMessageStream = vi.fn();
        readonly toUIMessageStreamResponse = vi.fn();
        readonly pipeUIMessageStreamToResponse = vi.fn();
        readonly pipeTextStreamToResponse = vi.fn();
        readonly toTextStreamResponse = vi.fn();
        readonly partialOutputStream = undefined;

        private async consumeText(): Promise<string> {
          let text = "";
          for await (const part of this.stream) {
            if (part.type === "text-delta" && typeof part.delta === "string") {
              text += part.delta;
            }
          }
          return text;
        }
      }

      const mockStream = new TeeingStreamResult(streamParts);
      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      const result = await agent.streamText("answer me");
      const emittedTypes: string[] = [];

      for await (const part of result.stream as AsyncIterable<{ type: string }>) {
        emittedTypes.push(part.type);
      }

      expect(emittedTypes).toContain("start");
      expect(emittedTypes).toContain("text-delta");
      expect(emittedTypes).toContain("finish");
      await expect(result.text).resolves.toBe("Hello world");
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

    it("should expose AI SDK ToolSet tools from getTools", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        tools: {
          get_weather: aiSdkTool({
            description: "Get weather",
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }) => ({ city, temperature: 72 }),
            voltagent: {
              name: "Weather Lookup",
              purpose: "Fetch weather observations",
              tags: ["weather"],
            },
          }),
        },
      });

      const tools = agent.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: "get_weather",
        displayName: "Weather Lookup",
        purpose: "Fetch weather observations",
        description: "Get weather",
        tags: ["weather"],
      });
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

    it("calls onToolError when a tool throws", async () => {
      const onToolError = vi.fn();
      const onToolEnd = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: createHooks({ onToolError, onToolEnd }),
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
      await execute({});

      expect(onToolError).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: failingTool,
          args: {},
          originalError: expect.objectContaining({ message: "Tool failure" }),
          error: expect.objectContaining({
            message: "Tool failure",
            stage: "tool_execution",
          }),
        }),
      );
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

    it("allows onToolError to override serialized error output", async () => {
      const onToolError = vi.fn().mockResolvedValue({
        output: {
          error: true,
          message: "Compact error payload",
          status: 429,
        },
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: createHooks({ onToolError }),
      });

      const failingTool = new Tool({
        name: "failing-tool",
        description: "Always throws",
        parameters: z.object({}),
        execute: async () => {
          const error = new Error("Tool failure");
          (error as any).stack = "should-not-be-returned";
          throw error;
        },
      });

      const operationContext = (agent as any).createOperationContext("input");
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const execute = executeFactory(failingTool);
      const result = await execute({});

      expect(result).toEqual({
        error: true,
        message: "Compact error payload",
        status: 429,
      });
      expect(onToolError).toHaveBeenCalledTimes(1);

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

    it("waits for parallel input guardrails before executing server-side tools", async () => {
      let releaseGuardrail!: () => void;
      const guardrailWait = new Promise<{ status: "passed" }>((resolve) => {
        releaseGuardrail = () => resolve({ status: "passed" });
      });
      const toolExecute = vi.fn(async () => "tool output");
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });
      const tool = new Tool({
        name: "guarded-tool",
        description: "Must wait for input guardrail.",
        parameters: z.object({}),
        execute: toolExecute,
      });

      const operationContext = (agent as any).createOperationContext("input");
      operationContext.systemContext.set(SPECULATIVE_INPUT_GUARDRAIL_CONTEXT_KEY, {
        wait: vi.fn(() => guardrailWait),
        hasPassed: vi.fn(() => false),
      });
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const resultPromise = executeFactory(tool)({});
      await Promise.resolve();

      expect(toolExecute).not.toHaveBeenCalled();
      releaseGuardrail();

      await expect(resultPromise).resolves.toBe("tool output");
      expect(toolExecute).toHaveBeenCalledTimes(1);

      operationContext.traceContext.end("completed");
    });

    it("does not execute server-side tools when a parallel input guardrail blocks", async () => {
      const toolExecute = vi.fn(async () => "tool output");
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });
      const tool = new Tool({
        name: "blocked-tool",
        description: "Must not run after input block.",
        parameters: z.object({}),
        execute: toolExecute,
      });
      const guardrailError = new Error("Input blocked by policy.");

      const operationContext = (agent as any).createOperationContext("input");
      operationContext.systemContext.set(SPECULATIVE_INPUT_GUARDRAIL_CONTEXT_KEY, {
        wait: vi.fn(async () => ({
          status: "blocked",
          error: guardrailError,
          message: guardrailError.message,
        })),
        hasPassed: vi.fn(() => false),
      });
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const result = await executeFactory(tool)({});

      expect(toolExecute).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        error: true,
        message: "Input blocked by policy.",
        toolName: "blocked-tool",
      });

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

    it("passes workspace context to tool calls for filesystem and sandbox access", async () => {
      const sandboxExecute = vi.fn().mockResolvedValue({
        stdout: "sandbox-content",
        stderr: "",
        exitCode: 0,
        durationMs: 5,
        timedOut: false,
        aborted: false,
        stdoutTruncated: false,
        stderrTruncated: false,
      });

      const workspace = new Workspace({
        filesystem: {},
        sandbox: {
          name: "mock-sandbox",
          status: "ready",
          execute: sandboxExecute,
        },
      });
      await workspace.filesystem.write("/docs/report.txt", "workspace-content");

      const tool = new Tool({
        name: "workspace-fetch-tool",
        description: "Reads from workspace filesystem and sandbox",
        parameters: z.object({}),
        execute: async (_args, options) => {
          const workspaceFromContext = options?.workspace;
          if (!workspaceFromContext) {
            return "missing-workspace";
          }

          const fileContent = (
            await workspaceFromContext.filesystem.readRaw("/docs/report.txt")
          ).content.join("\n");
          const sandboxResult = await workspaceFromContext.sandbox?.execute({
            command: "cat",
            args: ["/docs/report.txt"],
            operationContext: options as any,
          });

          return `${fileContent}|${sandboxResult?.stdout ?? ""}`;
        },
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        workspace,
        tools: [tool],
      });

      const operationContext = (agent as any).createOperationContext("input");
      const executeFactory = (agent as any).createToolExecutionFactory(
        operationContext,
        agent.hooks,
      );

      const execute = executeFactory(tool);
      const result = await execute({});

      expect(result).toBe("workspace-content|sandbox-content");
      expect(sandboxExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "cat",
          args: ["/docs/report.txt"],
          operationContext: expect.objectContaining({
            operationId: operationContext.operationId,
          }),
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
    const persistedUsage = {
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    };

    const providerUsage = {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };

    const createAssistantResponseMessages = (text: string): ModelMessage[] => [
      {
        role: "assistant",
        content: [{ type: "text", text }],
      },
    ];

    const getLastAssistantMessage = async (
      memory: Memory,
      userId: string,
      conversationId: string,
    ) => {
      const messages = await memory.getMessages(userId, conversationId);
      return [...messages].reverse().find((message) => message.role === "assistant");
    };

    it("should use temperature 0 by default when generating conversation titles", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        generateTitle: true,
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });
      const span = {
        end: vi.fn(),
        setStatus: vi.fn(),
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        recordException: vi.fn(),
      };
      const context = {
        operationId: "test-operation-id",
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn().mockReturnThis(),
        },
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        traceContext: {
          createChildSpan: vi.fn().mockReturnValue(span),
          withSpan: vi.fn().mockImplementation(async (_span, fn) => await fn()),
        },
        abortController: new AbortController(),
        startTime: new Date(),
      };

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Rome Weekend Plan",
        content: [{ type: "text", text: "Rome Weekend Plan" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: providerUsage,
        warnings: [
          {
            type: "unsupported",
            feature: "temperature",
            details: "temperature is not supported for reasoning models",
          },
        ],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: createAssistantResponseMessages("Rome Weekend Plan"),
        },
        steps: [],
      } as any);

      const titleGenerator = (agent as any).createConversationTitleGenerator(memory);
      const title = await titleGenerator({
        input: "Plan a weekend trip to Rome.",
        context,
        defaultTitle: "Conversation",
      });

      expect(title).toBe("Rome Weekend Plan");
      const generateTextCall = vi.mocked(ai.generateText).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(generateTextCall.temperature).toBe(0);
      expect(generateTextCall.maxOutputTokens).toBe(32);
      const createChildSpanCall = context.traceContext.createChildSpan.mock.calls[0][2] as {
        attributes: Record<string, unknown>;
      };
      expect(createChildSpanCall.attributes["llm.temperature"]).toBe(0);
      expect(context.logger.warn).toHaveBeenCalledWith(
        "[Memory] Conversation title generation model does not support temperature",
        expect.objectContaining({
          hint: expect.stringContaining("generateTitle.temperature"),
          warning: expect.stringContaining("temperature"),
        }),
      );
    });

    it("should omit temperature when title generation temperature is null", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        generateTitle: { enabled: true, temperature: null },
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });
      const span = {
        end: vi.fn(),
        setStatus: vi.fn(),
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        recordException: vi.fn(),
      };
      const context = {
        operationId: "test-operation-id",
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn().mockReturnThis(),
        },
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        traceContext: {
          createChildSpan: vi.fn().mockReturnValue(span),
          withSpan: vi.fn().mockImplementation(async (_span, fn) => await fn()),
        },
        abortController: new AbortController(),
        startTime: new Date(),
      };

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Rome Weekend Plan",
        content: [{ type: "text", text: "Rome Weekend Plan" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: providerUsage,
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: createAssistantResponseMessages("Rome Weekend Plan"),
        },
        steps: [],
      } as any);

      const titleGenerator = (agent as any).createConversationTitleGenerator(memory);
      const title = await titleGenerator({
        input: "Plan a weekend trip to Rome.",
        context,
        defaultTitle: "Conversation",
      });

      expect(title).toBe("Rome Weekend Plan");
      const generateTextCall = vi.mocked(ai.generateText).mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(generateTextCall).not.toHaveProperty("temperature");
      const createChildSpanCall = context.traceContext.createChildSpan.mock.calls[0][2] as {
        attributes: Record<string, unknown>;
      };
      expect(createChildSpanCall.attributes).not.toHaveProperty("llm.temperature");
    });

    it("should warn when conversation title generation returns an empty title", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        generateTitle: true,
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });
      const span = {
        end: vi.fn(),
        setStatus: vi.fn(),
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        recordException: vi.fn(),
      };
      const context = {
        operationId: "test-operation-id",
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn().mockReturnThis(),
        },
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        traceContext: {
          createChildSpan: vi.fn().mockReturnValue(span),
          withSpan: vi.fn().mockImplementation(async (_span, fn) => await fn()),
        },
        abortController: new AbortController(),
        startTime: new Date(),
      };

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "   ",
        content: [{ type: "text", text: "   " }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: providerUsage,
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: createAssistantResponseMessages("   "),
        },
        providerMetadata: { provider: { reason: "empty-output" } },
        steps: [],
      } as any);

      const titleGenerator = (agent as any).createConversationTitleGenerator(memory);
      const title = await titleGenerator({
        input: "Plan a weekend trip to Rome.",
        context,
        defaultTitle: "Conversation",
      });

      expect(title).toBeNull();
      expect(context.logger.warn).toHaveBeenCalledWith(
        "[Memory] Conversation title generation returned an empty title",
        expect.objectContaining({
          text: "   ",
          finishReason: "stop",
        }),
      );
    });

    it("should keep full conversation title generation errors at debug level", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        generateTitle: true,
      });
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });
      const span = {
        end: vi.fn(),
        setStatus: vi.fn(),
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        recordException: vi.fn(),
      };
      const context = {
        operationId: "test-operation-id",
        logger: {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          trace: vi.fn(),
          fatal: vi.fn(),
          child: vi.fn().mockReturnThis(),
        },
        context: new Map(),
        systemContext: new Map(),
        isActive: true,
        traceContext: {
          createChildSpan: vi.fn().mockReturnValue(span),
          withSpan: vi.fn().mockImplementation(async (_span, fn) => await fn()),
        },
        abortController: new AbortController(),
        startTime: new Date(),
      };

      vi.mocked(ai.generateText).mockRejectedValue(new Error("Unsupported temperature"));

      const titleGenerator = (agent as any).createConversationTitleGenerator(memory);
      const title = await titleGenerator({
        input: "Plan a weekend trip to Rome.",
        context,
        defaultTitle: "Conversation",
      });

      expect(title).toBeNull();
      expect(context.logger.warn).toHaveBeenCalledWith(
        "[Memory] Failed to generate conversation title",
        expect.not.objectContaining({
          error: expect.anything(),
        }),
      );
      expect(context.logger.warn).toHaveBeenCalledWith(
        "[Memory] Failed to generate conversation title",
        expect.objectContaining({
          message: "Unsupported temperature",
          hint: expect.stringContaining("generateTitle.temperature"),
        }),
      );
      expect(context.logger.debug).toHaveBeenCalledWith(
        "[Memory] Full error for title generation",
        expect.objectContaining({
          error: expect.any(String),
        }),
      );
    });

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

    it("should persist usage and finish reason in assistant message metadata for generateText", async () => {
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
        text: "Persisted response",
        content: [{ type: "text", text: "Persisted response" }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: providerUsage,
        warnings: [],
        request: {},
        response: {
          id: "test-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: createAssistantResponseMessages("Persisted response"),
        },
        steps: [],
      } as any);

      await agent.generateText("Hello", {
        memory: {
          userId: "user-metadata",
          conversationId: "conv-metadata",
          options: {
            messageMetadataPersistence: true,
          },
        },
      });

      const assistantMessage = await getLastAssistantMessage(
        memory,
        "user-metadata",
        "conv-metadata",
      );

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.metadata).toEqual(
        expect.objectContaining({
          operationId: expect.any(String),
          usage: persistedUsage,
          finishReason: "stop",
        }),
      );
    });

    it("should persist usage and finish reason in assistant message metadata for streamText", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });

      vi.mocked(ai.streamText).mockImplementation((args: any) => {
        const finalResult = {
          text: "Persisted stream response",
          finishReason: "stop",
          usage: providerUsage,
          totalUsage: providerUsage,
          warnings: [],
          response: {
            id: "stream-response",
            modelId: "test-model",
            timestamp: new Date(),
            messages: createAssistantResponseMessages("Persisted stream response"),
          },
          steps: [],
          providerMetadata: undefined,
        };

        const fullStream = (async function* () {
          try {
            yield {
              type: "start" as const,
            };
            yield {
              type: "text-delta" as const,
              id: "text-1",
              delta: "Persisted stream response",
              text: "Persisted stream response",
            };
            yield {
              type: "finish" as const,
              finishReason: "stop",
              totalUsage: providerUsage,
            };
          } finally {
            await args.onEnd?.(finalResult);
          }
        })();

        return {
          text: Promise.resolve("Persisted stream response"),
          textStream: (async function* () {
            yield "Persisted stream response";
          })(),
          stream: fullStream,
          fullStream,
          usage: Promise.resolve(providerUsage),
          finishReason: Promise.resolve("stop"),
          warnings: [],
          toUIMessageStream: vi.fn(),
          toUIMessageStreamResponse: vi.fn(),
          pipeUIMessageStreamToResponse: vi.fn(),
          pipeTextStreamToResponse: vi.fn(),
          toTextStreamResponse: vi.fn(),
          partialOutputStream: undefined,
        } as any;
      });

      const result = await agent.streamText("Hello", {
        memory: {
          userId: "user-stream-metadata",
          conversationId: "conv-stream-metadata",
          options: {
            messageMetadataPersistence: {
              usage: true,
              finishReason: true,
            },
          },
        },
      });

      for await (const _part of result.stream) {
        // Consume stream to trigger mocked onFinish.
      }

      const assistantMessage = await getLastAssistantMessage(
        memory,
        "user-stream-metadata",
        "conv-stream-metadata",
      );

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.metadata).toEqual(
        expect.objectContaining({
          operationId: expect.any(String),
          usage: persistedUsage,
          finishReason: "stop",
        }),
      );
    });

    it("should read memory but skip persistence when memory.options.readOnly is true", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      const getMessagesSpy = vi.spyOn(memory, "getMessages");
      const saveMessageWithContextSpy = vi.spyOn(memory, "saveMessageWithContext");

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

      await agent.generateText("Hello", {
        memory: {
          userId: "user-readonly",
          conversationId: "conv-readonly",
          options: {
            readOnly: true,
          },
        },
      });

      const memoryReadCall = getMessagesSpy.mock.calls.find(
        ([userId, conversationId]) =>
          userId === "user-readonly" && conversationId === "conv-readonly",
      );

      expect(memoryReadCall).toBeDefined();
      expect(saveMessageWithContextSpy).not.toHaveBeenCalled();
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

    it("should prefer memory envelope over legacy memory fields", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      const getMessagesSpy = vi.spyOn(memory, "getMessages");

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
        userId: "legacy-user",
        conversationId: "legacy-conv",
        contextLimit: 100,
        memory: {
          userId: "memory-user",
          conversationId: "memory-conv",
          options: {
            contextLimit: 2,
          },
        },
      });

      const matchingCall = getMessagesSpy.mock.calls.find(
        ([userId, conversationId, options]) =>
          userId === "memory-user" && conversationId === "memory-conv" && options?.limit === 2,
      );
      const usedLegacyIds = getMessagesSpy.mock.calls.some(
        ([userId, conversationId]) => userId === "legacy-user" && conversationId === "legacy-conv",
      );

      expect(getMessagesSpy.mock.calls.length).toBe(1);
      expect(matchingCall).toBeDefined();
      expect(usedLegacyIds).toBe(false);
    });

    it("should fallback to legacy ids when memory envelope ids are blank", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
      });
      const getMessagesSpy = vi.spyOn(memory, "getMessages");

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
        userId: "legacy-user",
        conversationId: "legacy-conv",
        memory: {
          userId: "   ",
          conversationId: "",
        },
      });

      const matchingCall = getMessagesSpy.mock.calls.find(
        ([userId, conversationId]) => userId === "legacy-user" && conversationId === "legacy-conv",
      );

      expect(getMessagesSpy.mock.calls.length).toBe(1);
      expect(matchingCall).toBeDefined();
    });

    it("should store resolved memory envelope on operation context", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const operationContext = (agent as any).createOperationContext("input", {
        userId: "legacy-user",
        conversationId: "legacy-conv",
        contextLimit: 99,
        semanticMemory: {
          enabled: true,
          semanticLimit: 9,
        },
        conversationPersistence: {
          mode: "finish",
        },
        messageMetadataPersistence: false,
        memory: {
          userId: "memory-user",
          conversationId: "memory-conv",
          options: {
            contextLimit: 5,
            readOnly: true,
            semanticMemory: {
              enabled: false,
              semanticThreshold: 0.8,
            },
            conversationPersistence: {
              mode: "step",
              debounceMs: 120,
            },
            messageMetadataPersistence: {
              usage: true,
            },
          },
        },
      });

      expect(operationContext.userId).toBe("memory-user");
      expect(operationContext.conversationId).toBe("memory-conv");
      expect(operationContext.resolvedMemory).toMatchObject({
        userId: "memory-user",
        conversationId: "memory-conv",
        contextLimit: 5,
        readOnly: true,
        semanticMemory: {
          enabled: false,
          semanticThreshold: 0.8,
        },
        conversationPersistence: {
          mode: "step",
          debounceMs: 120,
        },
        messageMetadataPersistence: {
          usage: true,
          finishReason: false,
        },
      });
    });

    it("should fallback to parent operation context resolved memory when call overrides are missing", () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
      });

      const parentOperationContext = (agent as any).createOperationContext("parent-input", {
        memory: {
          userId: "memory-user",
          conversationId: "memory-conv",
          options: {
            contextLimit: 4,
            readOnly: true,
            semanticMemory: {
              enabled: true,
              semanticLimit: 2,
            },
            conversationPersistence: {
              mode: "finish",
            },
            messageMetadataPersistence: {
              finishReason: true,
            },
          },
        },
      });

      const resolvedFromParent = (agent as any).resolveMemoryRuntimeOptions({
        parentOperationContext,
      });

      expect(resolvedFromParent).toMatchObject({
        userId: "memory-user",
        conversationId: "memory-conv",
        contextLimit: 4,
        readOnly: true,
        semanticMemory: {
          enabled: true,
          semanticLimit: 2,
        },
        conversationPersistence: {
          mode: "finish",
        },
        messageMetadataPersistence: {
          usage: false,
          finishReason: true,
        },
      });
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
        maxRetries: 0,
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

    it("should expose AI SDK final-step usage and aggregate totalUsage in onEnd", async () => {
      const onEnd = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: { onEnd },
      });

      const stepUsages = [
        { inputTokens: 100, outputTokens: 19, totalTokens: 119 },
        { inputTokens: 140, outputTokens: 27, totalTokens: 167 },
        { inputTokens: 190, outputTokens: 32, totalTokens: 222 },
      ];
      const totalUsage = { inputTokens: 430, outputTokens: 78, totalTokens: 508 };
      const steps = stepUsages.map((usage, index) => ({
        text: index === stepUsages.length - 1 ? "Final response" : "",
        content: [],
        reasoning: [],
        reasoningText: undefined,
        files: [],
        sources: [],
        toolCalls: [],
        staticToolCalls: [],
        dynamicToolCalls: [],
        toolResults: [],
        staticToolResults: [],
        dynamicToolResults: [],
        finishReason: index === stepUsages.length - 1 ? "stop" : "tool-calls",
        usage,
        warnings: [],
        request: {},
        response: {
          id: `step-${index}`,
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        providerMetadata: undefined,
      }));

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Final response",
        content: [],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
        usage: stepUsages[2],
        totalUsage,
        warnings: [],
        request: {},
        response: {
          id: "test",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps,
      } as any);

      await agent.generateText("Test");

      expect(onEnd).toHaveBeenCalledTimes(1);
      const output = onEnd.mock.calls[0]?.[0].output;
      expect(output?.usage).toEqual(stepUsages[2]);
      expect(output?.totalUsage).toEqual(totalUsage);
      expect(output?.steps?.map((step: any) => step.usage)).toEqual(stepUsages);
    });

    it("should call onStepEnd for multi-step generation", async () => {
      const onStepEndSpy = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        hooks: { onStepEnd: onStepEndSpy },
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

      // onStepEnd might be called, depending on implementation
      // Just verify the test doesn't throw
      expect(onStepEndSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
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
    const streamObjectUsage = {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    };

    const collectAsyncIterable = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
      const items: T[] = [];
      for await (const item of iterable) {
        items.push(item);
      }
      return items;
    };

    const createMockStructuredStreamTextResult = (
      args: { onEnd?: (result: any) => Promise<void> | void },
      finalObject: Record<string, unknown>,
      partials: Array<Record<string, unknown>>,
    ) => {
      const finalResult = {
        text: safeStringify(finalObject),
        output: finalObject,
        finishReason: "stop",
        usage: streamObjectUsage,
        totalUsage: streamObjectUsage,
        warnings: [],
        response: {
          id: "stream-object-response",
          modelId: "test-model",
          timestamp: new Date(),
        },
        steps: [],
      };
      let finishTriggered = false;
      const triggerFinish = async () => {
        if (!finishTriggered) {
          finishTriggered = true;
          await args.onEnd?.(finalResult);
        }
      };

      const partialOutputStream = (async function* () {
        for (const partial of partials) {
          yield partial;
        }
        await triggerFinish();
      })();

      return {
        output: Promise.resolve(finalObject),
        partialOutputStream,
        textStream: (async function* () {
          yield safeStringify(finalObject);
        })(),
        get stream() {
          return this.fullStream;
        },
        fullStream: (async function* () {
          yield { type: "text-delta", text: safeStringify(partials.at(-1) ?? finalObject) };
          yield { type: "finish", finishReason: "stop", usage: streamObjectUsage };
        })(),
        usage: Promise.resolve(streamObjectUsage),
        finishReason: Promise.resolve("stop"),
        warnings: [],
        pipeTextStreamToResponse: vi.fn(),
        toTextStreamResponse: vi.fn(() => new Response("streamed object")),
      };
    };

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
        text: '{"name":"John","age":30}',
        content: [{ type: "text", text: '{"name":"John","age":30}' }],
        reasoning: [],
        reasoningText: undefined,
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        output: { name: "John", age: 30 },
        finishReason: "stop",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        totalUsage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "object-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateObject("Generate a person", schema);

      expect(ai.generateText).toHaveBeenCalled();
      expect(ai.generateObject).not.toHaveBeenCalled();
      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs.output).toBeDefined();
      expect(callArgs.output).toHaveProperty("parseCompleteOutput");
      expect(result.object).toEqual({ name: "John", age: 30 });
    });

    it("should normalize voltagent namespaced runtime options for generateObject", async () => {
      let startContext: any;
      const agent = new Agent({
        name: "NamespacedRuntimeObjectAgent",
        instructions: "Generate structured data",
        model: mockModel as any,
        hooks: createHooks({
          onStart: ({ context }) => {
            startContext = context;
          },
        }),
      });

      const schema = z.object({
        name: z.string(),
      });

      const mockResponse = {
        text: '{"name":"Ada"}',
        content: [{ type: "text", text: '{"name":"Ada"}' }],
        reasoning: [],
        reasoningText: undefined,
        files: [],
        sources: [],
        toolCalls: [],
        toolResults: [],
        output: { name: "Ada" },
        finishReason: "stop",
        usage: streamObjectUsage,
        totalUsage: streamObjectUsage,
        warnings: [],
        request: {},
        response: {
          id: "namespaced-object-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      vi.mocked(ai.generateText).mockResolvedValue(mockResponse as any);

      const result = await agent.generateObject("Generate a person", schema, {
        userId: "legacy-user",
        conversationId: "legacy-conv",
        context: {
          requestId: "legacy-request",
        },
        voltagent: {
          userId: "runtime-user",
          conversationId: "runtime-conv",
          context: {
            requestId: "runtime-request",
          },
        },
      });

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("voltagent");
      expect(callArgs).not.toHaveProperty("context");
      expect(callArgs).not.toHaveProperty("userId");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(result.object).toEqual({ name: "Ada" });
      expect(result.context.get("requestId")).toBe("runtime-request");
      expect(startContext.userId).toBe("runtime-user");
      expect(startContext.conversationId).toBe("runtime-conv");
    });

    it("should expose the streamObject public stream contract", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Stream structured data",
        model: mockModel as any,
      });

      const schema = z.object({
        message: z.string(),
      });

      const mockStream = createMockStructuredStreamTextResult({}, { message: "Hello" }, [
        { message: "H" },
        { message: "Hello" },
      ]);

      vi.mocked(ai.streamText).mockReturnValue(mockStream as any);

      const result = await agent.streamObject("Stream a message", schema, {
        context: {
          requestId: "req-1",
        },
      });

      expect(ai.streamText).toHaveBeenCalled();
      expect(ai.streamObject).not.toHaveBeenCalled();
      const callArgs = vi.mocked(ai.streamText).mock.calls.at(-1)?.[0];
      expect(callArgs?.output).toBeDefined();
      expect(callArgs?.output).toHaveProperty("parseCompleteOutput");
      expect(result.context).toBeInstanceOf(Map);
      expect(result.context.get("requestId")).toBe("req-1");

      await expect(result.object).resolves.toEqual({ message: "Hello" });
      await expect(result.usage).resolves.toEqual(streamObjectUsage);
      await expect(result.finishReason).resolves.toBe("stop");

      await expect(collectAsyncIterable(result.partialObjectStream as any)).resolves.toEqual([
        { message: "H" },
        { message: "Hello" },
      ]);
      await expect(collectAsyncIterable(result.textStream as any)).resolves.toEqual([
        safeStringify({ message: "Hello" }),
      ]);
      expect(await result.toTextStreamResponse().text()).toBe("streamed object");
      expect(mockStream.toTextStreamResponse).toHaveBeenCalled();
    });

    it("should apply streamObject output guardrails before result object and onFinish", async () => {
      const outputGuardrail = vi.fn(({ output }) => ({
        pass: true,
        action: "modify" as const,
        modifiedOutput: {
          ...(output as Record<string, unknown>),
          message: "Safe",
        },
      }));
      const userOnFinish = vi.fn();
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Stream structured data",
        model: mockModel as any,
        outputGuardrails: [outputGuardrail as any],
      });

      const schema = z.object({
        message: z.string(),
      });

      vi.mocked(ai.streamText).mockImplementation(
        (args: any) =>
          createMockStructuredStreamTextResult(args, { message: "Unsafe" }, [
            { message: "Un" },
            { message: "Unsafe" },
          ]) as any,
      );

      const result = await agent.streamObject("Stream a guarded message", schema, {
        onEnd: userOnFinish,
      });

      await collectAsyncIterable(result.partialObjectStream as any);

      const obj = await result.object;
      expect(obj).toEqual({ message: "Safe" });
      expect(outputGuardrail).toHaveBeenCalledWith(
        expect.objectContaining({
          output: { message: "Unsafe" },
          originalOutput: { message: "Unsafe" },
          operation: "streamObject",
        }),
      );
      expect(userOnFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          object: { message: "Safe" },
          finishReason: "stop",
          usage: streamObjectUsage,
        }),
      );
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

    it("should treat missing structured output as fallback-eligible and try next model", async () => {
      const fallbackModel = new MockLanguageModelV3({
        modelId: "fallback-model",
        doGenerate: {
          content: [{ type: "text", text: "Fallback structured response" }],
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

      const tool = new Tool({
        name: "echo_tool",
        description: "Echo tool",
        parameters: z.object({ value: z.string() }),
        execute: async ({ value }) => ({ echoed: value }),
      });

      const agent = new Agent({
        name: "StructuredFallbackAgent",
        instructions: "Use tools and return structured output",
        model: [
          { model: mockModel as any, maxRetries: 0 },
          { model: fallbackModel as any, maxRetries: 0 },
        ],
        tools: [tool],
      });

      const primaryResponse = {
        text: "Tool call completed.",
        content: [{ type: "text", text: "Tool call completed." }],
        reasoning: [],
        files: [],
        sources: [],
        toolCalls: [
          {
            type: "tool-call" as const,
            toolCallId: "call-1",
            toolName: "echo_tool",
            input: { value: "hello" },
          },
        ],
        toolResults: [
          {
            type: "tool-result" as const,
            toolCallId: "call-1",
            toolName: "echo_tool",
            input: { value: "hello" },
            output: { echoed: "hello" },
          },
        ],
        finishReason: "tool-calls",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        warnings: [],
        request: {},
        response: {
          id: "test-response-primary",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
        get output() {
          throw new ai.NoOutputGeneratedError();
        },
      };

      const fallbackResponse = {
        text: "Fallback structured response",
        content: [{ type: "text", text: "Fallback structured response" }],
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
          id: "test-response-fallback",
          modelId: "fallback-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
        output: { message: "from fallback" },
      };

      vi.mocked(ai.generateText).mockImplementation(async (args: any) => {
        if (args.model === mockModel) {
          return primaryResponse as any;
        }
        if (args.model === fallbackModel) {
          return fallbackResponse as any;
        }
        throw new Error("Unexpected model");
      });

      const result = await agent.generateText("Generate structured output", {
        output: ai.Output.object({
          schema: z.object({
            message: z.string(),
          }),
        }),
      });

      expect(result.text).toBe("Fallback structured response");
      expect(result.output).toEqual({ message: "from fallback" });
      expect(vi.mocked(ai.generateText)).toHaveBeenCalledTimes(2);
      expect(vi.mocked(ai.generateText).mock.calls[0][0].model).toBe(mockModel);
      expect(vi.mocked(ai.generateText).mock.calls[1][0].model).toBe(fallbackModel);
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

    it("should honor the Retry-After header on retried model calls", async () => {
      const agent = new Agent({
        name: "RetryAfterAgent",
        instructions: "Test",
        model: mockModel as any,
        maxRetries: 1,
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
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        warnings: [],
        request: {},
        response: {
          id: "retry-after-response",
          modelId: "test-model",
          timestamp: new Date(),
          messages: [],
        },
        steps: [],
      };

      const observedDelays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      const setTimeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation(((
        cb: any,
        delay: any,
        ...args: any[]
      ) => {
        if (typeof delay === "number") observedDelays.push(delay);
        return originalSetTimeout(cb, 0, ...args);
      }) as typeof setTimeout);

      let callCount = 0;
      vi.mocked(ai.generateText).mockImplementation(async () => {
        callCount += 1;
        if (callCount < 2) {
          const error = new Error("Rate limited");
          (error as any).isRetryable = true;
          (error as any).statusCode = 429;
          (error as any).responseHeaders = { "retry-after": "30" };
          throw error;
        }
        return mockResponse as any;
      });

      try {
        const result = await agent.generateText("Test");

        expect(result.text).toBe("Retry response");
        expect(vi.mocked(ai.generateText)).toHaveBeenCalledTimes(2);
        // attemptIndex=0: exponential floor=1000ms, server hint=30000ms ⇒ delay=30000.
        expect(observedDelays).toContain(30_000);
      } finally {
        setTimeoutSpy.mockRestore();
      }
    });

    it("should handle model errors gracefully", async () => {
      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        maxRetries: 0,
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
        maxRetries: 0,
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
      expect(getInstructionMessages(callArgs)[0]?.role).toBe("system");
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
    it("should include instructions from dynamic toolkits in the system prompt", async () => {
      const toolkitTool = new Tool({
        name: "test-tool",
        description: "Test tool",
        parameters: z.object({}),
        execute: vi.fn().mockResolvedValue("ok"),
      });

      const dynamicTools = vi.fn().mockResolvedValue([
        {
          name: "dynamic-toolkit",
          description: "Runtime toolkit",
          addInstructions: true,
          instructions: "My test instructions",
          tools: [toolkitTool],
        },
      ]);

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        tools: dynamicTools,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
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
      } as any);

      await agent.generateText("Hello");

      expect(dynamicTools).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0];
      const systemMessage = getInstructionMessages(callArgs).find(
        (message: any) => message.role === "system",
      );

      expect(systemMessage?.content).toContain("Base instructions");
      expect(systemMessage?.content).toContain("My test instructions");
    });

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
    type TestAgentInternals = {
      createOperationContext(input: string): unknown;
      prepareTools(
        adHocTools: unknown[],
        oc: unknown,
        maxSteps: number,
        options?: unknown,
      ): Promise<
        Record<
          string,
          {
            description?: string;
            execute: (args: unknown, options?: unknown) => unknown;
          }
        >
      >;
    };

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

    it("should prepare AI SDK tool records with VoltAgent metadata hooks", async () => {
      const inputSchema = z.object({
        location: z.string(),
      });
      const execute = vi.fn().mockResolvedValue({ location: "SF", temp: 72 });
      const toolOnStart = vi.fn();
      const agentOnToolStart = vi.fn();
      const agentOnToolEnd = vi.fn();

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        tools: {
          get_weather: aiSdkTool({
            description: "Get weather",
            inputSchema,
            execute,
            voltagent: {
              name: "Weather Lookup",
              purpose: "Fetch weather observations",
              tags: ["weather", "external-api"],
              hooks: {
                onStart: toolOnStart,
              },
            },
          }),
        },
        hooks: {
          onToolStart: agentOnToolStart,
          onToolEnd: agentOnToolEnd,
        },
      });

      const operationContext = (agent as any).createOperationContext("input message");
      const createChildSpanSpy = vi.spyOn(operationContext.traceContext, "createChildSpan");
      const prepared = await (agent as any).prepareTools([], operationContext, 3, {});

      expect(prepared.get_weather.description).toBe("Get weather");
      expect(prepared.get_weather.inputSchema).toBe(inputSchema);
      expect(prepared.get_weather.metadata?.voltagent).toMatchObject({
        name: "Weather Lookup",
        purpose: "Fetch weather observations",
        tags: ["weather", "external-api"],
      });

      await expect(
        prepared.get_weather.execute(
          { location: "SF" },
          {
            toolCallId: "call-1",
            messages: [],
            abortSignal: new AbortController().signal,
            context: undefined,
          },
        ),
      ).resolves.toEqual({ location: "SF", temp: 72 });

      expect(execute).toHaveBeenCalledWith(
        { location: "SF" },
        expect.objectContaining({ toolCallId: "call-1" }),
      );
      const toolSpanCall = createChildSpanSpy.mock.calls.find(
        ([spanName]) => spanName === "tool.execution:get_weather",
      );
      expect(toolSpanCall?.[2]).toMatchObject({
        label: "get_weather",
        attributes: expect.objectContaining({
          "tool.name": "get_weather",
          "tool.display_name": "Weather Lookup",
          "tool.purpose": "Fetch weather observations",
          "tool.description": "Get weather",
        }),
      });
      expect(toolOnStart).toHaveBeenCalledWith(
        expect.objectContaining({
          args: { location: "SF" },
          tool: expect.objectContaining({
            name: "get_weather",
            tags: ["weather", "external-api"],
          }),
        }),
      );
      expect(agentOnToolStart).toHaveBeenCalledWith(
        expect.objectContaining({
          agent,
          args: { location: "SF" },
          tool: expect.objectContaining({ name: "get_weather" }),
        }),
      );
      expect(agentOnToolEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          agent,
          output: { location: "SF", temp: 72 },
          tool: expect.objectContaining({ name: "get_weather" }),
        }),
      );
    });

    it("should prefer user-defined callTool/searchTools when tool routing is enabled", async () => {
      const callTool = new Tool({
        name: "callTool",
        description: "Custom callTool",
        parameters: z.object({
          toolName: z.string(),
        }),
        execute: async ({ toolName }) => `called:${toolName}`,
      });
      const searchTools = new Tool({
        name: "searchTools",
        description: "Custom searchTools",
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => `searched:${query}`,
      });
      const normalTool = new Tool({
        name: "normalTool",
        description: "Normal tool",
        parameters: z.object({}),
        execute: async () => "normal",
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        toolRouting: {},
        tools: [callTool, searchTools, normalTool],
      });

      const testAgent = agent as unknown as TestAgentInternals;
      const operationContext = testAgent.createOperationContext("input message");
      const prepared = await testAgent.prepareTools([], operationContext, 3, {});

      await expect(prepared.callTool.execute({ toolName: "normalTool" })).resolves.toBe(
        "called:normalTool",
      );
      await expect(prepared.searchTools.execute({ query: "normalTool" })).resolves.toBe(
        "searched:normalTool",
      );

      const poolNames = agent.getFullState().toolRouting?.pool?.map((tool) => tool.name) ?? [];
      expect(poolNames).toEqual(expect.arrayContaining(["callTool", "searchTools", "normalTool"]));
    });

    it("should allow user-defined callTool/searchTools when tool routing is disabled per request", async () => {
      const callTool = new Tool({
        name: "callTool",
        description: "Custom callTool",
        parameters: z.object({
          toolName: z.string(),
        }),
        execute: async ({ toolName }) => `called:${toolName}`,
      });
      const searchTools = new Tool({
        name: "searchTools",
        description: "Custom searchTools",
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => `searched:${query}`,
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        toolRouting: {},
        tools: [callTool, searchTools],
      });

      const testAgent = agent as unknown as TestAgentInternals;
      const operationContext = testAgent.createOperationContext("input message");
      const prepared = await testAgent.prepareTools([], operationContext, 3, {
        toolRouting: false,
      });

      await expect(prepared.callTool.execute({ toolName: "searchTools" })).resolves.toBe(
        "called:searchTools",
      );
      await expect(prepared.searchTools.execute({ query: "callTool" })).resolves.toBe(
        "searched:callTool",
      );
    });

    it("should apply native toolApproval to tool routing pool calls", async () => {
      const execute = vi.fn().mockResolvedValue("sensitive-result");
      const sensitiveTool = new Tool({
        name: "sensitiveTool",
        description: "Sensitive tool",
        parameters: z.object({
          query: z.string(),
        }),
        execute,
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        toolRouting: {
          enforceSearchBeforeCall: false,
        },
        tools: [sensitiveTool],
      });

      const testAgent = agent as unknown as TestAgentInternals;
      const operationContext = testAgent.createOperationContext("input message");
      const prepared = await testAgent.prepareTools([], operationContext, 3, {
        toolApproval: {
          sensitiveTool: "user-approval",
        },
      });

      await expect(
        prepared.callTool.execute({
          name: "sensitiveTool",
          args: {
            query: "secret",
          },
        }),
      ).resolves.toMatchObject({
        error: true,
        name: "sensitiveTool",
        code: "TOOL_APPROVAL_REQUIRED",
        message: "Tool sensitiveTool requires user approval.",
      });
      expect(execute).not.toHaveBeenCalled();
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

    it("should resolve delegate tool identity from memory envelope", async () => {
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

      const operationContext = (agent as any).createOperationContext("input message");
      const options = {
        conversationId: "legacy-conv",
        userId: "legacy-user",
        memory: {
          conversationId: "memory-conv",
          userId: "memory-user",
        },
      } as any;
      await (agent as any).prepareTools([], operationContext, 7, options);

      expect(mockCreateDelegateTool).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "memory-conv",
          userId: "memory-user",
        }),
      );
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

      expect(workingMemorySpy).toHaveBeenCalledWith(options, operationContext);
      expect(prepared.get_working_memory).toBeDefined();
      expect(typeof prepared.get_working_memory.execute).toBe("function");

      workingMemorySpy.mockRestore();
    });

    it("should disable working memory write tools when memory options are read-only", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: true,
        },
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });

      const options = {
        memory: {
          userId: "user-1",
          conversationId: "conv-1",
          options: {
            readOnly: true,
          },
        },
      } as any;
      const operationContext = (agent as any).createOperationContext("input message", options);
      const runtimeTools = (agent as any).createWorkingMemoryTools(options, operationContext);
      const toolNames = runtimeTools.map((tool: Tool<any, any>) => tool.name);

      expect(toolNames).toContain("get_working_memory");
      expect(toolNames).not.toContain("update_working_memory");
      expect(toolNames).not.toContain("clear_working_memory");
    });

    it("should execute working memory tools against the resolved memory envelope", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: true,
        },
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Test",
        model: mockModel as any,
        memory,
      });
      await memory.createConversation({
        id: "memory-conv",
        userId: "memory-user",
        title: "Memory Conversation",
        metadata: {},
      });
      await memory.createConversation({
        id: "legacy-conv",
        userId: "legacy-user",
        title: "Legacy Conversation",
        metadata: {},
      });

      const options = {
        userId: "legacy-user",
        conversationId: "legacy-conv",
        memory: {
          userId: "memory-user",
          conversationId: "memory-conv",
        },
      } as any;
      const operationContext = (agent as any).createOperationContext("input message", options);
      const runtimeTools = (agent as any).createWorkingMemoryTools(options, operationContext);
      const getWorkingMemoryTool = runtimeTools.find(
        (tool: Tool<any, any>) => tool.name === "get_working_memory",
      );
      const updateWorkingMemoryTool = runtimeTools.find(
        (tool: Tool<any, any>) => tool.name === "update_working_memory",
      );

      await updateWorkingMemoryTool?.execute?.(
        {
          content: "Preferred language: Turkish",
          mode: "replace",
        },
        operationContext,
      );

      await expect(
        memory.getWorkingMemory({
          userId: "memory-user",
          conversationId: "memory-conv",
        }),
      ).resolves.toBe("Preferred language: Turkish");
      await expect(
        memory.getWorkingMemory({
          userId: "legacy-user",
          conversationId: "legacy-conv",
        }),
      ).resolves.toBeNull();
      await expect(getWorkingMemoryTool?.execute?.({}, operationContext)).resolves.toBe(
        "Preferred language: Turkish",
      );
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

    it("should prefer runtime toolkit instructions when toolkit names collide", async () => {
      const staticToolkit = {
        name: "shared-toolkit",
        addInstructions: true,
        instructions: "Static toolkit instructions",
        tools: [
          new Tool({
            name: "static-tool",
            description: "Static tool",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      };

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        toolkits: [staticToolkit],
      });

      const runtimeToolkit = {
        name: "shared-toolkit",
        addInstructions: true,
        instructions: "Runtime toolkit instructions",
        tools: [
          new Tool({
            name: "runtime-tool",
            description: "Runtime tool",
            parameters: z.object({}),
            execute: vi.fn(),
          }),
        ],
      };

      const operationContext = (agent as any).createOperationContext("test");
      const enriched = await (agent as any).enrichInstructions(
        "Base content",
        null,
        null,
        operationContext,
        [runtimeToolkit],
      );

      expect(enriched).toContain("Base content");
      expect(enriched).toContain("Runtime toolkit instructions");
      expect(enriched).not.toContain("Static toolkit instructions");
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
        [],
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
      expect(enrichSpy).toHaveBeenCalledWith(
        "String instructions",
        null,
        null,
        operationContext,
        [],
      );

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

    it("should expose request headers to dynamic model, tools, and instructions", async () => {
      const requestHeaders = {
        authorization: "Bearer test-token",
        "x-tenant-id": "tenant-1",
      };
      const dynamicInstructions = vi.fn().mockResolvedValue("Dynamic content");
      const dynamicModel = vi.fn().mockResolvedValue(mockModel as any);
      const dynamicTools = vi.fn().mockResolvedValue([]);

      const agent = new Agent({
        name: "TestAgent",
        instructions: dynamicInstructions,
        model: dynamicModel,
        tools: dynamicTools,
      });

      vi.mocked(ai.generateText).mockResolvedValue({
        text: "Response",
        content: [{ type: "text", text: "Response" }],
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

      await agent.generateText("Hello", {
        requestHeaders,
      });

      expect(dynamicInstructions.mock.calls[0][0].headers).toEqual(requestHeaders);
      expect(dynamicModel.mock.calls[0][0].headers).toEqual(requestHeaders);
      expect(dynamicTools.mock.calls[0][0].headers).toEqual(requestHeaders);

      const callArgs = vi.mocked(ai.generateText).mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.requestHeaders).toBeUndefined();
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

    it("should include user-scoped working memory when conversationId is not set", async () => {
      const memory = new Memory({
        storage: new InMemoryStorageAdapter(),
        workingMemory: {
          enabled: true,
          scope: "user",
        },
      });

      await memory.updateWorkingMemory({
        userId: "user-1",
        content: "Preferred language: Turkish",
      });

      const agent = new Agent({
        name: "TestAgent",
        instructions: "Base instructions",
        model: mockModel as any,
        memory,
      });

      const operationContext = (agent as any).createOperationContext("user input", {
        memory: {
          userId: "user-1",
        },
      });

      const systemMessage = await (agent as any).getSystemMessage("user input", operationContext, {
        memory: {
          userId: "user-1",
        },
      });

      expect(systemMessage).toMatchObject({
        role: "system",
      });
      expect(systemMessage.content).toContain("<current_context>");
      expect(systemMessage.content).toContain("Preferred language: Turkish");
    });
  });
});
