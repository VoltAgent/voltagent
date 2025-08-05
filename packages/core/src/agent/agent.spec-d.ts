import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { LibSQLStorage } from "../memory/libsql";
import { createTool } from "../tool";
import type { VoltOpsClient } from "../voltops/client";
import type { DynamicValueOptions } from "../voltops/types";
import { Agent } from "./agent";
import type {
  AgentHooks,
  OnEndHookArgs,
  OnHandoffHookArgs,
  OnStartHookArgs,
  OnToolEndHookArgs,
  OnToolStartHookArgs,
} from "./hooks";
import type { LLMProvider } from "./providers";
import type { StepWithContent } from "./providers/base/types";
import type { SubAgentConfig } from "./subagent/types";
import type {
  AgentOperationOutput,
  AgentOptions,
  GenerateObjectResponse,
  GenerateTextResponse,
  InstructionsDynamicValue,
  InternalGenerateOptions,
  ModelDynamicValue,
  ModelType,
  ProviderInstance,
  ProviderOptions,
  ProviderType,
  PublicGenerateOptions,
  StandardizedObjectResult,
  StandardizedTextResult,
  StreamObjectFinishResult,
  StreamObjectResponse,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  StreamTextResponse,
  SupervisorConfig,
  ToolErrorInfo,
  ToolsDynamicValue,
  UserContext,
  VoltAgentError,
} from "./types";

describe("Agent Type System", () => {
  // Mock providers for testing
  const mockProvider = {} as LLMProvider<any>;
  const mockOpenAIProvider = {} as LLMProvider<any>;
  const mockVoltOpsClient = {} as VoltOpsClient;
  const mockMemory = {} as LibSQLStorage;

  describe("Agent Constructor Type Inference", () => {
    it("should infer provider type correctly", () => {
      const agent = new Agent({
        name: "Test Agent",
        instructions: "Test instructions",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      expectTypeOf(agent).toMatchTypeOf<Agent<{ llm: LLMProvider<any> }>>();
    });

    it("should enforce required fields in AgentOptions", () => {
      // @ts-expect-error - missing required fields
      new Agent({});

      // @ts-expect-error - missing name
      new Agent({
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      // Valid with minimal required fields
      new Agent({
        name: "Test",
        instructions: "Test instructions",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });
    });

    it("should handle conditional instructions/description fields", () => {
      // Valid with instructions
      new Agent({
        name: "Test",
        instructions: "Test instructions",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      // Valid with description (deprecated)
      new Agent({
        name: "Test",
        description: "Test description",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      // @ts-expect-error - cannot have both undefined
      new Agent({
        name: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });
    });

    it("should accept optional fields", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
        id: "custom-id",
        purpose: "Test purpose",
        memory: mockMemory,
        historyMemory: mockMemory,
        tools: [],
        maxSteps: 10,
        userContext: new Map(),
        voltOpsClient: mockVoltOpsClient,
        subAgents: [],
        supervisorConfig: {
          systemMessage: "Custom message",
          includeAgentsMemory: true,
          customGuidelines: ["Guideline 1"],
        },
      });

      expectTypeOf(agent).toMatchTypeOf<Agent<{ llm: LLMProvider<any> }>>();
    });
  });

  describe("Dynamic Value Types", () => {
    it("should handle InstructionsDynamicValue", () => {
      // Static string
      const staticInstructions: InstructionsDynamicValue = "Static instructions";
      expectTypeOf(staticInstructions).toMatchTypeOf<InstructionsDynamicValue>();

      // Dynamic value function
      const dynamicInstructions: InstructionsDynamicValue = async (options) => {
        expectTypeOf(options).toMatchTypeOf<{ userContext?: UserContext }>();
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
        expectTypeOf(options).toMatchTypeOf<{ userContext?: UserContext }>();
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
        expectTypeOf(options).toMatchTypeOf<{ userContext?: UserContext }>();
        return [tool];
      };
      expectTypeOf(dynamicTools).toMatchTypeOf<ToolsDynamicValue>();
    });
  });

  describe("Type Helper Tests", () => {
    it("should extract provider instance type", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      type ExtractedProvider = ProviderInstance<typeof agent>;
      expectTypeOf<ExtractedProvider>().toEqualTypeOf<LLMProvider<any>>();
    });

    it("should extract model type", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockOpenAIProvider,
        model: "gpt-4",
      });

      type ExtractedModel = ModelType<typeof agent>;
      expectTypeOf<ExtractedModel>().toMatchTypeOf<unknown>();
    });

    it("should extract provider type parameter", () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      type ExtractedProviderType = ProviderType<typeof agent>;
      expectTypeOf<ExtractedProviderType>().toMatchTypeOf<unknown>();
    });
  });

  describe("Method Return Type Tests", () => {
    it("should infer generateText return type", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      const result = await agent.generateText("Test input");
      expectTypeOf(result).toMatchTypeOf<GenerateTextResponse<typeof agent>>();
      expectTypeOf(result.text).toEqualTypeOf<string>();
      expectTypeOf(result.userContext).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should infer streamText return type", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockOpenAIProvider,
        model: "gpt-4",
      });

      const result = await agent.streamText("Test input");
      expectTypeOf(result).toMatchTypeOf<StreamTextResponse<typeof agent>>();
      expectTypeOf(result.textStream).toMatchTypeOf<AsyncIterable<any> | undefined>();
      expectTypeOf(result.userContext).toMatchTypeOf<UserContext | undefined>();
    });

    it("should infer generateObject return type with schema", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = await agent.generateObject("Test input", schema);
      expectTypeOf(result).toMatchTypeOf<GenerateObjectResponse<typeof agent, typeof schema>>();
      expectTypeOf(result.object).toEqualTypeOf<{ name: string; age: number }>();
      expectTypeOf(result.userContext).toEqualTypeOf<Map<string | symbol, unknown>>();
    });

    it("should infer streamObject return type with schema", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockOpenAIProvider,
        model: "gpt-4",
      });

      const schema = z.object({
        items: z.array(z.string()),
        total: z.number(),
      });

      const result = await agent.streamObject("Test input", schema);
      expectTypeOf(result).toMatchTypeOf<StreamObjectResponse<typeof agent, typeof schema>>();
      expectTypeOf(result.objectStream).toMatchTypeOf<AsyncIterable<any> | undefined>();
      expectTypeOf(result.userContext).toMatchTypeOf<UserContext | undefined>();
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
        userContext: new Map(),
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
        onStepFinish: async (step) => {
          expectTypeOf(step).toMatchTypeOf<StepWithContent>();
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
  });

  describe("UserContext Type Tests", () => {
    it("should handle UserContext as Map", () => {
      const userContext: UserContext = new Map<string | symbol, unknown>();
      userContext.set("key", "value");
      userContext.set(Symbol("sym"), 123);

      expectTypeOf(userContext).toEqualTypeOf<UserContext>();
      expectTypeOf(userContext.get("key")).toEqualTypeOf<unknown>();
    });
  });

  describe("Hook Type Tests", () => {
    it("should validate AgentHooks structure", () => {
      const hooks: AgentHooks = {
        onStart: async (args: OnStartHookArgs) => {
          expectTypeOf(args.agent).toMatchTypeOf<Agent<any>>();
          expectTypeOf(args.context).toMatchTypeOf<{ operationId: string }>();
        },
        onEnd: async (args: OnEndHookArgs) => {
          expectTypeOf(args.conversationId).toEqualTypeOf<string>();
          expectTypeOf(args.agent).toMatchTypeOf<Agent<any>>();
          expectTypeOf(args.output).toMatchTypeOf<AgentOperationOutput | undefined>();
          expectTypeOf(args.error).toMatchTypeOf<VoltAgentError | undefined>();
          expectTypeOf(args.context).toMatchTypeOf<{ operationId: string }>();
        },
        onHandoff: async (args: OnHandoffHookArgs) => {
          expectTypeOf(args.agent).toMatchTypeOf<Agent<any>>();
          expectTypeOf(args.source).toMatchTypeOf<Agent<any>>();
        },
        onToolStart: async (args: OnToolStartHookArgs) => {
          expectTypeOf(args.agent).toMatchTypeOf<Agent<any>>();
          expectTypeOf(args.tool).toMatchTypeOf<{ name: string }>();
          expectTypeOf(args.context).toMatchTypeOf<{ operationId: string }>();
        },
        onToolEnd: async (args: OnToolEndHookArgs) => {
          expectTypeOf(args.agent).toMatchTypeOf<Agent<any>>();
          expectTypeOf(args.tool).toMatchTypeOf<{ name: string }>();
          expectTypeOf(args.output).toEqualTypeOf<unknown | undefined>();
          expectTypeOf(args.error).toMatchTypeOf<VoltAgentError | undefined>();
          expectTypeOf(args.context).toMatchTypeOf<{ operationId: string }>();
        },
      };

      expectTypeOf(hooks).toMatchTypeOf<AgentHooks>();
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
        userContext: new Map([["key", "value"]]),
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
        userContext: new Map(),
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
        userContext: new Map(),
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
        userContext: new Map(),
      };

      expectTypeOf(streamObjectResult).toMatchTypeOf<
        StreamObjectFinishResult<{ items: string[] }>
      >();
    });

    it("should handle AgentOperationOutput union type", () => {
      const textOutput: AgentOperationOutput = {
        text: "Text",
        userContext: new Map(),
      };

      const objectOutput: AgentOperationOutput = {
        object: { key: "value" },
        userContext: new Map(),
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
    it("should handle provider-specific response type inference", () => {
      const anthropicAgent = new Agent({
        name: "Anthropic Agent",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
      });

      const openaiAgent = new Agent({
        name: "OpenAI Agent",
        instructions: "Test",
        llm: mockOpenAIProvider,
        model: "gpt-4",
      });

      // Provider-specific types would differ in their internal structure
      // but both conform to the same interface
      expectTypeOf(anthropicAgent).not.toBeAny();
      expectTypeOf(openaiAgent).not.toBeAny();
    });

    it("should handle nested schema type inference", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
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
          expectTypeOf(options.userContext).toMatchTypeOf<Map<string | symbol, unknown>>();
          return "Dynamic instructions";
        },
        llm: mockProvider,
        model: async (options: DynamicValueOptions) => {
          expectTypeOf(options.userContext).toMatchTypeOf<Map<string | symbol, unknown>>();
          return "gpt-4o-mini";
        },
        tools: async (options: DynamicValueOptions) => {
          expectTypeOf(options.userContext).toMatchTypeOf<Map<string | symbol, unknown>>();
          return [];
        },
        memory: mockMemory,
        historyMemory: mockMemory,
        maxSteps: 10,
        userContext: new Map([["initial", "value"]]),
        subAgents: [
          {
            agent: {} as Agent<any>,
            method: "generateText",
          } as SubAgentConfig,
        ],
        supervisorConfig: {
          systemMessage: "Supervisor",
          includeAgentsMemory: true,
          customGuidelines: ["Guide 1"],
        },
      });

      expectTypeOf(fullyConfiguredAgent).toMatchTypeOf<Agent<{ llm: LLMProvider<any> }>>();
    });
  });

  describe("Type Safety Guards", () => {
    it("should enforce correct schema return types", async () => {
      const agent = new Agent({
        name: "Test",
        instructions: "Test",
        llm: mockProvider,
        model: "gpt-4o-mini",
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
        llm: mockProvider,
        model: "gpt-4o-mini",
      } as const;

      // @ts-expect-error - must have either instructions or description
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
        userContext: undefined,
        telemetryExporter: undefined,
        subAgents: undefined,
        supervisorConfig: undefined,
        logger: undefined,
      };

      expectTypeOf(options).toMatchTypeOf<AgentOptions>();
    });
  });
});
