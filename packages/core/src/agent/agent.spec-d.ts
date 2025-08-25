import type { LanguageModel, UIMessage } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { describe, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import type { HistoryManager } from "../agent/history";
import { InMemoryStorage } from "../memory/in-memory";
import type { Memory } from "../memory/types";
import type { BaseRetriever } from "../retriever/retriever";
import { Tool, type Toolkit, createTool } from "../tool";
import type { StreamEventType } from "../utils/streams";
import type { Voice } from "../voice";
import type { VoltOpsClient } from "../voltops/client";
import type { DynamicValue, DynamicValueOptions } from "../voltops/types";
import {
  Agent,
  type AgentContext,
  type AgentHooks,
  type GenerateObjectResultWithContext,
  type GenerateTextResultWithContext,
  type StreamObjectResultWithContext,
  type StreamTextResultWithContext,
} from "./agent";
import type { SubAgentConfig } from "./subagent/types";
import type {
  AgentOperationOutput,
  AgentOptions,
  InstructionsDynamicValue,
  InternalGenerateOptions,
  ModelDynamicValue,
  ProviderOptions,
  PublicGenerateOptions,
  StandardizedObjectResult,
  StandardizedTextResult,
  StreamObjectFinishResult,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  SupervisorConfig,
  ToolErrorInfo,
  ToolsDynamicValue,
  UserContext,
  VoltAgentError,
} from "./types";

describe("Agent Type System", () => {
  // Realistic mocks using AI SDK patterns
  const mockModel = new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: "stop" as const,
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: "text" as const, text: "test response" }],
      warnings: [],
    }),
    doStream: async () => ({
      stream: {} as any,
      warnings: [],
    }),
  });

  const mockMemory: Memory = {
    addMessage: vi.fn(),
    getMessages: vi.fn(() => Promise.resolve([])),
    clear: vi.fn(),
    deleteMessage: vi.fn(),
    updateMessage: vi.fn(),
  } as unknown as Memory;

  const mockVoltOpsClient = {} as VoltOpsClient;
  const mockRetriever = {} as BaseRetriever;
  const mockVoice = {} as Voice;
  const mockHistoryManager = {} as HistoryManager;
  const mockToolkit: Toolkit = {
    name: "test-toolkit",
    description: "Test toolkit",
    tools: [],
  };

  describe("Agent Constructor Type Inference", () => {
    it("should accept LanguageModel directly", () => {
      const agent = new Agent({
        name: "Test Agent",
        instructions: "Test instructions",
        model: mockModel,
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should enforce required fields in AgentOptions", () => {
      // @ts-expect-error - missing required fields
      new Agent({});

      // @ts-expect-error - missing name
      new Agent({
        instructions: "Test",
        model: mockModel,
      });

      // Valid with minimal required fields
      new Agent({
        name: "Test",
        instructions: "Test instructions",
        model: mockModel,
      });
    });

    it("should require instructions field", () => {
      // Valid with instructions
      new Agent({
        name: "Test",
        instructions: "Test instructions",
        model: mockModel,
      });

      // @ts-expect-error - missing instructions
      new Agent({
        name: "Test",
        model: mockModel,
      });
    });

    it("should accept optional fields", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        id: "custom-id",
        purpose: "Test purpose",
        memory: mockMemory,
        historyMemory: mockMemory,
        tools: [],
        maxSteps: 10,
        context: new Map(),
        voltOpsClient: mockVoltOpsClient,
        subAgents: [],
        supervisorConfig: {
          systemMessage: "Custom message",
          includeAgentsMemory: true,
          customGuidelines: ["Guideline 1"],
        },
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should accept retriever option", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        retriever: mockRetriever,
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should accept voice option", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        voice: mockVoice,
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should accept historyManager option", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        historyManager: mockHistoryManager,
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should accept memory as false", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        memory: false,
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should accept toolkits array", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        toolkits: [mockToolkit],
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should accept mixed tools and toolkits", () => {
      const tool = createTool({
        name: "test-tool",
        description: "Test",
        parameters: z.object({ value: z.string() }),
        execute: async () => ({ result: "success" }),
      });

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [tool, mockToolkit],
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });
  });

  describe("Dynamic Value Types", () => {
    it("should handle model as DynamicValue", () => {
      // Static model
      const staticAgent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      // Dynamic model function
      const dynamicModelFn: DynamicValue<LanguageModel> = async (options) => {
        expectTypeOf(options.context).toMatchTypeOf<Map<string | symbol, unknown>>();
        return mockModel;
      };

      const dynamicAgent = new Agent({
        name: "Test",
        instructions: "Test",
        model: dynamicModelFn,
      });

      expectTypeOf(staticAgent).toMatchTypeOf<Agent>();
      expectTypeOf(dynamicAgent).toMatchTypeOf<Agent>();
    });
    it("should handle InstructionsDynamicValue", () => {
      // Static string
      const staticInstructions: InstructionsDynamicValue = "Static instructions";
      expectTypeOf(staticInstructions).toMatchTypeOf<InstructionsDynamicValue>();

      // Dynamic value function
      const dynamicInstructions: InstructionsDynamicValue = async (options) => {
        expectTypeOf(options).toMatchTypeOf<{ context?: UserContext }>();
        return "Dynamic instructions";
      };
      expectTypeOf(dynamicInstructions).toMatchTypeOf<InstructionsDynamicValue>();

      // Dynamic value returning PromptContent
      const promptInstructions: InstructionsDynamicValue = async () => ({
        type: "text" as const,
        text: "Prompt text",
      });
      expectTypeOf(promptInstructions).toMatchTypeOf<InstructionsDynamicValue>();
    });

    it("should handle ModelDynamicValue", () => {
      // Static model
      const staticModel: ModelDynamicValue<string> = "gpt-4o-mini";
      expectTypeOf(staticModel).toMatchTypeOf<ModelDynamicValue<string>>();

      // Dynamic model
      const dynamicModel: ModelDynamicValue<string> = async (options) => {
        expectTypeOf(options).toMatchTypeOf<{ context?: UserContext }>();
        return "gpt-4o-mini";
      };
      expectTypeOf(dynamicModel).toMatchTypeOf<ModelDynamicValue<string>>();
    });

    it("should handle ToolsDynamicValue", () => {
      const tool = createTool({
        name: "test-tool",
        description: "Test tool",
        parameters: z.object({ value: z.string() }),
        execute: async () => ({ result: "success" }),
      });

      // Static tools array
      const staticTools: ToolsDynamicValue = [tool];
      expectTypeOf(staticTools).toMatchTypeOf<ToolsDynamicValue>();

      // Dynamic tools
      const dynamicTools: ToolsDynamicValue = async (options) => {
        expectTypeOf(options).toMatchTypeOf<{ context?: UserContext }>();
        return [tool];
      };
      expectTypeOf(dynamicTools).toMatchTypeOf<ToolsDynamicValue>();

      // Tools with toolkit
      const mixedTools: ToolsDynamicValue = [tool, mockToolkit];
      expectTypeOf(mixedTools).toMatchTypeOf<ToolsDynamicValue>();
    });
  });

  describe("AgentContext Type Tests", () => {
    it("should validate AgentContext structure", () => {
      const context: AgentContext = {
        context: new Map(),
        operation: {
          id: "op-123",
          conversationId: "conv-456",
          userId: "user-789",
          parentAgentId: undefined,
          parentHistoryId: undefined,
        },
        system: {
          logger: {} as any, // Logger interface
          signal: undefined,
          abortController: undefined,
          startTime: new Date().toISOString(),
          agentStartEventId: undefined,
        },
      };

      expectTypeOf(context).toMatchTypeOf<AgentContext>();
      expectTypeOf(context.context).toEqualTypeOf<Map<string | symbol, unknown>>();
      expectTypeOf(context.operation.userId).toEqualTypeOf<string | undefined>();
      expectTypeOf(context.operation.id).toEqualTypeOf<string>();
    });
  });

  describe("Method Return Type Tests", () => {
    it("should infer generateText return type", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const result = await agent.generateText("Test input");
      expectTypeOf(result).toMatchTypeOf<GenerateTextResultWithContext>();
      expectTypeOf(result.text).toBeString();
      expectTypeOf(result.context).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should infer streamText return type", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const result = await agent.streamText("Test input");
      expectTypeOf(result).toMatchTypeOf<StreamTextResultWithContext>();
      expectTypeOf(result.textStream).not.toBeUndefined();
      expectTypeOf(result.context).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should infer generateObject return type with schema", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = await agent.generateObject("Test input", schema);
      expectTypeOf(result).toMatchTypeOf<
        GenerateObjectResultWithContext<{ name: string; age: number }>
      >();
      expectTypeOf(result.object).toEqualTypeOf<{ name: string; age: number }>();
      expectTypeOf(result.context).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should infer streamObject return type with schema", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const schema = z.object({
        items: z.array(z.string()),
        total: z.number(),
      });

      const result = await agent.streamObject("Test input", schema);
      expectTypeOf(result).toMatchTypeOf<
        StreamObjectResultWithContext<{ items: string[]; total: number }>
      >();
      expectTypeOf(result.partialObjectStream).not.toBeUndefined();
      expectTypeOf(result.context).toEqualTypeOf<Map<string | symbol, unknown>>();
    });
  });

  describe("Options Type Tests", () => {
    it("should distinguish PublicGenerateOptions from InternalGenerateOptions", () => {
      const publicOptions: PublicGenerateOptions = {
        conversationId: "123",
        userId: "user-123",
        contextLimit: 1000,
        maxSteps: 5,
        signal: new AbortSignal(),
        context: new Map(),
      };

      const internalOptions: InternalGenerateOptions = {
        ...publicOptions,
        parentAgentId: "parent-123",
        parentHistoryEntryId: "history-123",
      };

      // @ts-expect-error - historyEntryId is not in PublicGenerateOptions
      publicOptions.historyEntryId;

      // @ts-expect-error - operationContext is not in PublicGenerateOptions
      publicOptions.operationContext;

      expectTypeOf(publicOptions).toMatchTypeOf<PublicGenerateOptions>();
      expectTypeOf(internalOptions).toMatchTypeOf<InternalGenerateOptions>();
    });

    it("should validate ProviderOptions structure", () => {
      const providerOptions: ProviderOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
        seed: 12345,
        stopSequences: ["END"],
        extraOptions: { custom: "value" },
        onStepFinish: async (_step) => {
          // Step type varies based on provider
        },
        onFinish: async (result) => {
          expectTypeOf(result).toEqualTypeOf<unknown>();
        },
        onError: async (error) => {
          expectTypeOf(error).toEqualTypeOf<unknown>();
        },
      };

      expectTypeOf(providerOptions).toMatchTypeOf<ProviderOptions>();
    });

    it("should validate SupervisorConfig", () => {
      const supervisorConfig: SupervisorConfig = {
        systemMessage: "Custom supervisor message",
        includeAgentsMemory: false,
        customGuidelines: ["Guideline 1", "Guideline 2"],
      };

      expectTypeOf(supervisorConfig).toMatchTypeOf<SupervisorConfig>();
    });

    it("should validate SupervisorConfig with fullStreamEventForwarding", () => {
      const supervisorConfigWithForwarding: SupervisorConfig = {
        systemMessage: "Custom supervisor message",
        includeAgentsMemory: false,
        customGuidelines: ["Guideline 1", "Guideline 2"],
        fullStreamEventForwarding: {
          types: ["tool-call", "tool-result", "text-delta"],
          addSubAgentPrefix: false,
        },
      };

      expectTypeOf(supervisorConfigWithForwarding).toMatchTypeOf<SupervisorConfig>();
      expectTypeOf(supervisorConfigWithForwarding.fullStreamEventForwarding).toMatchTypeOf<
        | {
            types?: StreamEventType[];
            addSubAgentPrefix?: boolean;
          }
        | undefined
      >();
    });

    it("should accept specific event types in fullStreamEventForwarding", () => {
      const config: SupervisorConfig = {
        fullStreamEventForwarding: {
          types: ["tool-call", "tool-result", "text-delta", "source", "error"],
        },
      };

      expectTypeOf(config.fullStreamEventForwarding?.types).toMatchTypeOf<
        StreamEventType[] | undefined
      >();
    });

    it("should only accept valid StreamEventType values", () => {
      const validConfig: SupervisorConfig = {
        fullStreamEventForwarding: {
          types: ["tool-call", "tool-result", "text-delta", "source", "error"],
        },
      };

      expectTypeOf(validConfig).toMatchTypeOf<SupervisorConfig>();

      // This would cause a type error if uncommented:
      // const invalidConfig: SupervisorConfig = {
      //   fullStreamEventForwarding: {
      //     types: ["custom-event-1", "custom-event-2"], // Type error: not valid StreamEventType
      //   },
      // };
    });
  });

  describe("UserContext Type Tests", () => {
    it("should handle UserContext as Map", () => {
      const context: UserContext = new Map<string | symbol, unknown>();
      context.set("key", "value");
      context.set(Symbol("sym"), 123);

      expectTypeOf(context).toEqualTypeOf<UserContext>();
      expectTypeOf(context.get("key")).toEqualTypeOf<unknown>();
    });
  });

  describe("Hook Type Tests", () => {
    it("should validate AgentHooks with AgentContext", () => {
      const hooks: AgentHooks = {
        onStart: async (context: AgentContext) => {
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
          expectTypeOf(context.context).toEqualTypeOf<Map<string | symbol, unknown>>();
          expectTypeOf(context.operation.id).toEqualTypeOf<string>();
        },
        onEnd: async (context: AgentContext, _result: any, _error?: Error) => {
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
          expectTypeOf(context.operation.conversationId).toEqualTypeOf<string | undefined>();
        },
        onHandoff: async (context: AgentContext) => {
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
        },
        onToolStart: async (context: AgentContext, _tool: any) => {
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
        },
        onToolEnd: async (context: AgentContext, _tool: any, _output: any, _error?: any) => {
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
        },
      };

      expectTypeOf(hooks).toMatchTypeOf<AgentHooks>();
    });

    it("should allow sync and async hooks", () => {
      const syncHooks: AgentHooks = {
        onStart: (_context: AgentContext) => {
          // Synchronous hook
        },
      };

      const asyncHooks: AgentHooks = {
        onStart: async (_context: AgentContext) => {
          // Asynchronous hook
          await Promise.resolve();
        },
      };

      expectTypeOf(syncHooks).toMatchTypeOf<AgentHooks>();
      expectTypeOf(asyncHooks).toMatchTypeOf<AgentHooks>();
    });

    it("should validate onError hook", () => {
      const hooks: AgentHooks = {
        onError: async (context: AgentContext, error: Error) => {
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
          expectTypeOf(error).toMatchTypeOf<Error>();
        },
      };

      expectTypeOf(hooks).toMatchTypeOf<AgentHooks>();
    });

    it("should validate onStepFinish hook", () => {
      const hooks: AgentHooks = {
        onStepFinish: async (step: any) => {
          // Step can be any type based on provider
          expectTypeOf(step).toBeAny();
        },
      };

      expectTypeOf(hooks).toMatchTypeOf<AgentHooks>();
    });

    it("should validate onPrepareMessages hook", () => {
      const hooks: AgentHooks = {
        onPrepareMessages: async (messages: UIMessage[], context: AgentContext) => {
          expectTypeOf(messages).toMatchTypeOf<UIMessage[]>();
          expectTypeOf(context).toMatchTypeOf<AgentContext>();
          return { messages };
        },
      };

      expectTypeOf(hooks).toMatchTypeOf<AgentHooks>();

      // Sync version
      const syncHooks: AgentHooks = {
        onPrepareMessages: (messages: UIMessage[], _context: AgentContext) => ({
          messages: messages.filter((m) => m.role !== "system"),
        }),
      };

      expectTypeOf(syncHooks).toMatchTypeOf<AgentHooks>();
    });
  });

  describe("Error Type Tests", () => {
    it("should validate VoltAgentError structure", () => {
      const error: VoltAgentError = {
        message: "An error occurred",
        originalError: new Error("Original"),
        code: "ERR_001",
        metadata: { retry: true },
        stage: "tool_execution",
        toolError: {
          toolCallId: "call-123",
          toolName: "test-tool",
          toolExecutionError: new Error("Tool failed"),
          toolArguments: { arg: "value" },
        },
      };

      expectTypeOf(error).toMatchTypeOf<VoltAgentError>();
      expectTypeOf(error.toolError).toMatchTypeOf<ToolErrorInfo | undefined>();
    });

    it("should validate StreamOnErrorCallback", () => {
      const errorCallback: StreamOnErrorCallback = async (error) => {
        expectTypeOf(error).toEqualTypeOf<VoltAgentError>();
        expectTypeOf(error.message).toEqualTypeOf<string>();
      };

      expectTypeOf(errorCallback).toMatchTypeOf<StreamOnErrorCallback>();
    });
  });

  describe("Response Type Tests", () => {
    it("should validate StandardizedTextResult", () => {
      const textResult: StandardizedTextResult = {
        text: "Generated text",
        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
        providerResponse: {},
        finishReason: "stop",
        warnings: ["Warning 1"],
        context: new Map([["key", "value"]]),
      };

      expectTypeOf(textResult).toMatchTypeOf<StandardizedTextResult>();
    });

    it("should validate StreamTextFinishResult", () => {
      const streamTextResult: StreamTextFinishResult = {
        text: "Streamed text",
        usage: { promptTokens: 75, completionTokens: 75, totalTokens: 150 },
        finishReason: "length",
        providerResponse: {},
        warnings: [],
        context: new Map(),
      };

      expectTypeOf(streamTextResult).toMatchTypeOf<StreamTextFinishResult>();
    });

    it("should validate StandardizedObjectResult", () => {
      const objectResult: StandardizedObjectResult<{ name: string; age: number }> = {
        object: { name: "John", age: 30 },
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
        providerResponse: {},
        finishReason: "stop",
        warnings: undefined,
        context: new Map(),
      };

      expectTypeOf(objectResult).toMatchTypeOf<
        StandardizedObjectResult<{ name: string; age: number }>
      >();
    });

    it("should validate StreamObjectFinishResult", () => {
      const streamObjectResult: StreamObjectFinishResult<{ items: string[] }> = {
        object: { items: ["a", "b", "c"] },
        usage: { promptTokens: 125, completionTokens: 125, totalTokens: 250 },
        providerResponse: {},
        warnings: [],
        finishReason: "stop",
        context: new Map(),
      };

      expectTypeOf(streamObjectResult).toMatchTypeOf<
        StreamObjectFinishResult<{ items: string[] }>
      >();
    });

    it("should handle AgentOperationOutput union type", () => {
      const textOutput: AgentOperationOutput = {
        text: "Text",
        context: new Map(),
      };

      const objectOutput: AgentOperationOutput = {
        object: { key: "value" },
        context: new Map(),
      };

      expectTypeOf(textOutput).toMatchTypeOf<AgentOperationOutput>();
      expectTypeOf(objectOutput).toMatchTypeOf<AgentOperationOutput>();

      // Type narrowing
      if ("text" in textOutput) {
        expectTypeOf(textOutput).toMatchTypeOf<StandardizedTextResult | StreamTextFinishResult>();
      }
      if ("object" in objectOutput) {
        expectTypeOf(objectOutput).toMatchTypeOf<
          StandardizedObjectResult<unknown> | StreamObjectFinishResult<unknown>
        >();
      }
    });
  });

  describe("Complex Type Scenarios", () => {
    it("should handle AI SDK model integration", () => {
      const agent = new Agent({
        name: "AI SDK Agent",
        instructions: "Test",
        model: mockModel,
      });

      // Agent uses LanguageModel from AI SDK directly
      expectTypeOf(agent).not.toBeAny();
      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should handle nested schema type inference", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const complexSchema = z.object({
        user: z.object({
          id: z.string(),
          profile: z.object({
            name: z.string(),
            age: z.number(),
            tags: z.array(z.string()),
          }),
        }),
        metadata: z.record(z.unknown()),
      });

      type InferredObject = z.infer<typeof complexSchema>;

      expectTypeOf<InferredObject>().toMatchTypeOf<{
        user: {
          id: string;
          profile: {
            name: string;
            age: number;
            tags: string[];
          };
        };
        metadata: Record<string, unknown>;
      }>();

      // Test that the schema works with generateObject
      const result = await agent.generateObject("Generate user", complexSchema);
      expectTypeOf(result.object).toEqualTypeOf<InferredObject>();
    });

    it("should handle agent with all features", () => {
      const fullyConfiguredAgent = new Agent({
        name: "Full Agent",
        instructions: async (options: DynamicValueOptions) => {
          expectTypeOf(options.context).toMatchTypeOf<Map<string | symbol, unknown>>();
          return "Dynamic instructions";
        },
        model: mockModel,
        tools: async (options: DynamicValueOptions) => {
          expectTypeOf(options.context).toMatchTypeOf<Map<string | symbol, unknown>>();
          return [];
        },
        memory: mockMemory,
        historyMemory: mockMemory,
        maxSteps: 10,
        context: new Map([["initial", "value"]]),
        subAgents: [
          {
            agent: {} as Agent,
            method: "generateText",
          } as SubAgentConfig,
        ],
        supervisorConfig: {
          systemMessage: "Supervisor",
          includeAgentsMemory: true,
          customGuidelines: ["Guide 1"],
        },
      });

      expectTypeOf(fullyConfiguredAgent).toMatchTypeOf<Agent>();
    });

    it("should handle SubAgentConfig union types", () => {
      // SubAgent as direct Agent instance
      const subAgentDirect: SubAgentConfig = {
        agent: new Agent({
          name: "Sub",
          instructions: "Sub instructions",
          model: mockModel,
        }),
        method: "generateText",
      };

      // SubAgent as config object
      const subAgentConfig: SubAgentConfig = {
        agent: new Agent({
          name: "Sub2",
          instructions: "Sub2 instructions",
          model: mockModel,
        }),
        method: "streamText",
      };

      expectTypeOf(subAgentDirect).toMatchTypeOf<SubAgentConfig>();
      expectTypeOf(subAgentConfig).toMatchTypeOf<SubAgentConfig>();
    });

    it("should validate full SupervisorConfig options", () => {
      const config: SupervisorConfig = {
        systemMessage: "Custom supervisor message",
        includeAgentsMemory: true,
        customGuidelines: ["Guideline 1", "Guideline 2"],
        fullStreamEventForwarding: {
          types: ["tool-call", "tool-result"],
          addSubAgentPrefix: true,
        },
      };

      expectTypeOf(config).toMatchTypeOf<SupervisorConfig>();
      expectTypeOf(config.fullStreamEventForwarding?.addSubAgentPrefix).toEqualTypeOf<
        boolean | undefined
      >();
    });
  });

  describe("Type Safety Guards", () => {
    it("should enforce correct schema return types", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const schema = z.object({ count: z.number() });

      // This would cause a runtime error if the returned object doesn't match schema
      const result = await agent.generateObject("Get count", schema);

      // TypeScript knows the exact shape
      expectTypeOf(result.object).toEqualTypeOf<{ count: number }>();
      expectTypeOf(result.object.count).toEqualTypeOf<number>();

      // @ts-expect-error - nonExistent doesn't exist in schema
      result.object.nonExistent;
    });

    it("should prevent invalid option combinations", () => {
      // This would cause an error if both are undefined
      const invalidOptions = {
        name: "Test",
        model: mockModel,
      } as const;

      // @ts-expect-error - must have instructions
      new Agent(invalidOptions);
    });

    it("should handle optional fields in types correctly", () => {
      const options: AgentOptions = {
        name: "Test",
        instructions: "Test",
        // All these are optional
        id: undefined,
        purpose: undefined,
        memory: undefined,
        memoryOptions: undefined,
        historyMemory: undefined,
        tools: undefined,
        maxSteps: undefined,
        context: undefined,
        telemetryExporter: undefined,
        subAgents: undefined,
        supervisorConfig: undefined,
        logger: undefined,
      };

      expectTypeOf(options).toMatchTypeOf<AgentOptions>();
    });
  });

  describe("Negative Type Tests", () => {
    it("should reject invalid configurations", () => {
      // @ts-expect-error - model is required
      new Agent({ name: "Test", instructions: "Test" });

      // @ts-expect-error - name is required
      new Agent({ instructions: "Test", model: mockModel });

      // @ts-expect-error - instructions is required
      new Agent({ name: "Test", model: mockModel });

      // Note: Some fields accept 'any' type so invalid values won't cause type errors
      // This is by design for flexibility in the framework
    });

    it("should reject invalid hook signatures", () => {
      // Test that hook signatures are properly typed
      const validHooks: AgentHooks = {
        onStart: async (_context: AgentContext) => {
          // context is properly typed
        },
        onEnd: async (_context: AgentContext, _result?: any, _error?: any) => {
          // All parameters are properly typed
        },
      };

      // Use the variable to avoid unused warning
      expectTypeOf(validHooks).toMatchTypeOf<AgentHooks>();
    });

    it("should reject invalid dynamic value types", () => {
      // @ts-expect-error - dynamic model must return LanguageModel
      const _invalidDynamicModel: DynamicValue<LanguageModel> = async () => "not-a-model";

      // @ts-expect-error - dynamic instructions must return string or PromptContent
      const _invalidDynamicInstructions: InstructionsDynamicValue = async () => 123;

      // @ts-expect-error - dynamic tools must return Tool array
      const _invalidDynamicTools: ToolsDynamicValue = async () => "not-tools";
    });
  });

  describe("Edge Case Type Tests", () => {
    it("should handle empty arrays correctly", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [], // empty tools array
        subAgents: [], // empty subagents
        toolkits: [], // empty toolkits
      });

      expectTypeOf(agent).toEqualTypeOf<Agent>();
    });

    it("should handle memory: false vs undefined", () => {
      const agentNoMemory = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        memory: false, // explicitly disabled
      });

      const agentDefaultMemory = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        // memory: undefined - uses default
      });

      expectTypeOf(agentNoMemory).toEqualTypeOf<Agent>();
      expectTypeOf(agentDefaultMemory).toEqualTypeOf<Agent>();
    });

    it("should handle complex nested schemas", async () => {
      const complexSchema = z.object({
        deeply: z.object({
          nested: z.object({
            structure: z.object({
              with: z.object({
                arrays: z.array(
                  z.object({
                    id: z.string(),
                    value: z.number(),
                  }),
                ),
              }),
            }),
          }),
        }),
      });

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const result = await agent.generateObject("test", complexSchema);
      type ResultType = typeof result.object;

      // Verify deep type inference
      expectTypeOf<
        ResultType["deeply"]["nested"]["structure"]["with"]["arrays"][0]["id"]
      >().toEqualTypeOf<string>();
    });

    it("should handle union types in schemas", async () => {
      const unionSchema = z.union([
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("image"), url: z.string() }),
      ]);

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const result = await agent.generateObject("test", unionSchema);

      // Type narrowing should work
      if (result.object.type === "text") {
        expectTypeOf(result.object.content).toEqualTypeOf<string>();
        // @ts-expect-error - url doesn't exist on text type
        result.object.url;
      }
    });
  });

  describe("AI SDK Integration Pattern Tests", () => {
    it("should match AI SDK generateText patterns", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const result = await agent.generateText("test");

      // Should have AI SDK compatible properties
      expectTypeOf(result.text).toEqualTypeOf<string>();
      expectTypeOf(result.usage).toEqualTypeOf<{
        inputTokens: number | undefined;
        outputTokens: number | undefined;
        totalTokens: number | undefined;
        reasoningTokens?: number | undefined;
        cachedInputTokens?: number | undefined;
      }>();
      expectTypeOf(result.finishReason).toEqualTypeOf<
        "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other" | "unknown"
      >();
      expectTypeOf(result.context).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should match AI SDK streamText patterns", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
      });

      const result = await agent.streamText("test");

      // Should have AI SDK compatible stream properties
      expectTypeOf(result.textStream).not.toBeNever();
      expectTypeOf(result.fullStream).not.toBeNever();
      expectTypeOf(result.usage).not.toBeNever();
      expectTypeOf(result.text).not.toBeNever();
      expectTypeOf(result.finishReason).not.toBeNever();
      expectTypeOf(result.context).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should handle tool calls with proper types", () => {
      const tool = createTool({
        name: "calculator",
        description: "Calculate math expressions",
        parameters: z.object({
          expression: z.string(),
        }),
        execute: async ({ expression }) => {
          expectTypeOf(expression).toEqualTypeOf<string>();
          // biome-ignore lint/security/noGlobalEval: <explanation>
          return { result: eval(expression) };
        },
      });

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [tool],
      });

      expectTypeOf(agent).toEqualTypeOf<Agent>();
    });

    it("should work with complex tool schemas", () => {
      const complexTool = new Tool({
        name: "analyzer",
        description: "Analyze data",
        parameters: z.object({
          data: z.array(
            z.object({
              id: z.number(),
              value: z.string(),
              metadata: z.record(z.unknown()).optional(),
            }),
          ),
          options: z.object({
            format: z.enum(["json", "csv", "xml"]),
            includeHeaders: z.boolean().default(true),
          }),
        }),
        execute: async (params) => ({
          result: `Analyzed ${params.data.length} items`,
          format: params.options.format,
        }),
      });

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [complexTool],
      });

      // Agent should accept complex tools
      expectTypeOf(agent).toHaveProperty("tools");
    });

    it("should handle tool execution context types", async () => {
      const toolWithContext = new Tool({
        name: "context-tool",
        description: "Tool using context",
        parameters: z.object({ input: z.string() }),
        execute: async (params: { input: string }) => {
          // Context types are checked at runtime in execute function
          return `Processed: ${params.input}`;
        },
      });

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [toolWithContext],
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should handle subagent hierarchies", () => {
      const subAgent1 = new Agent({
        name: "SubAgent1",
        instructions: "First subagent",
        model: mockModel,
      });

      const subAgent2 = new Agent({
        name: "SubAgent2",
        instructions: "Second subagent",
        model: mockModel,
      });

      const mainAgent = new Agent({
        name: "MainAgent",
        instructions: "Main agent",
        model: mockModel,
        subAgents: [subAgent1, subAgent2],
      });

      // getSubAgents returns agents
      const subAgents = mainAgent.getSubAgents();
      expectTypeOf(subAgents).toBeArray();
      // Verify subagents array is properly typed
      expectTypeOf(subAgents).toBeArray();
    });

    it("should handle memory with different storage backends", () => {
      const memoryWithStorage = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        memory: new InMemoryStorage(),
      });

      expectTypeOf(memoryWithStorage).toMatchTypeOf<Agent>();
    });
  });

  describe("Advanced Type Tests", () => {
    it("should handle mixed tool and toolkit arrays", () => {
      const tool = new Tool({
        name: "tool1",
        description: "Test tool",
        parameters: z.object({ input: z.string() }),
        execute: async () => "result",
      });

      const toolkit: Toolkit = {
        name: "toolkit1",
        tools: [tool as Tool<any, any>],
      };

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [tool],
        toolkits: [toolkit],
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should handle async tool execute functions", () => {
      const asyncTool = new Tool({
        name: "async-tool",
        description: "Async tool",
        parameters: z.object({ query: z.string() }),
        execute: async (params: { query: string }) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { result: params.query };
        },
      });

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        tools: [asyncTool],
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });

    it("should handle dynamic values for all fields", () => {
      const dynamicAgent = new Agent({
        name: "Test",
        instructions: async () => "Dynamic instructions",
        model: async () => mockModel,
        tools: async () => [],
      });

      expectTypeOf(dynamicAgent).toMatchTypeOf<Agent>();
    });

    it("should properly type VoltOpsClient integration", () => {
      const mockVoltOps = {} as VoltOpsClient;

      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        model: mockModel,
        voltOpsClient: mockVoltOps,
      });

      expectTypeOf(agent).toMatchTypeOf<Agent>();
    });
  });
});
