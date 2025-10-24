import type { ModelMessage, ProviderOptions, SystemModelMessage } from "@ai-sdk/provider-utils";
import type { Span } from "@opentelemetry/api";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import type {
  StreamTextResult as AIStreamTextResult,
  CallSettings,
  GenerateObjectResult,
  GenerateTextResult,
  LanguageModel,
  StepResult,
  ToolSet,
  UIMessage,
} from "ai";
import {
  type AsyncIterableStream,
  type CallWarning,
  type FinishReason,
  type LanguageModelUsage,
  type Output,
  convertToModelMessages,
  createTextStreamResponse,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  pipeTextStreamToResponse,
  pipeUIMessageStreamToResponse,
  stepCountIs,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";
import { LogEvents, LoggerProxy } from "../logger";
import { ActionType, buildAgentLogMessage } from "../logger/message-builder";
import type { Memory, MemoryUpdateMode } from "../memory";
import { MemoryManager } from "../memory/manager/memory-manager";
import { type VoltAgentObservability, createVoltAgentObservability } from "../observability";
import { AgentRegistry } from "../registries/agent-registry";
import type { BaseRetriever } from "../retriever/retriever";
import type { Tool, Toolkit } from "../tool";
import { createTool } from "../tool";
import { ToolManager } from "../tool/manager";
import { randomUUID } from "../utils/id";
import { convertModelMessagesToUIMessages } from "../utils/message-converter";
import { NodeType, createNodeId } from "../utils/node-utils";
import { convertUsage } from "../utils/usage-converter";
import type { Voice } from "../voice";
import { VoltOpsClient as VoltOpsClientClass } from "../voltops/client";
import type { VoltOpsClient } from "../voltops/client";
import type { PromptContent, PromptHelper } from "../voltops/types";
import {
  createAbortError,
  createVoltAgentError,
  isClientHTTPError,
  isToolDeniedError,
} from "./errors";
import {
  type AgentEvalHost,
  type EnqueueEvalScoringArgs,
  enqueueEvalScoring as enqueueEvalScoringHelper,
} from "./eval";
import type { AgentHooks } from "./hooks";
import { AgentTraceContext, addModelAttributesToSpan } from "./open-telemetry/trace-context";
import type { BaseMessage, BaseTool, StepWithContent } from "./providers/base/types";
export type { AgentHooks } from "./hooks";
import { P, match } from "ts-pattern";
import type { StopWhen } from "../ai-types";
import type { SamplingPolicy } from "../eval/runtime";
import { ConversationBuffer } from "./conversation-buffer";
import {
  type NormalizedInputGuardrail,
  type NormalizedOutputGuardrail,
  runInputGuardrails as executeInputGuardrails,
  runOutputGuardrails as executeOutputGuardrails,
  normalizeInputGuardrailList,
  normalizeOutputGuardrailList,
} from "./guardrail";
import { MemoryPersistQueue } from "./memory-persist-queue";
import { sanitizeMessagesForModel } from "./message-normalizer";
import {
  type GuardrailPipeline,
  createAsyncIterableReadable,
  createGuardrailPipeline,
} from "./streaming/guardrail-stream";
import { SubAgentManager } from "./subagent";
import type { SubAgentConfig } from "./subagent/types";
import type { VoltAgentTextStreamPart } from "./subagent/types";
import type {
  AgentEvalConfig,
  AgentEvalOperationType,
  AgentFullState,
  AgentGuardrailState,
  AgentOptions,
  DynamicValue,
  DynamicValueOptions,
  InputGuardrail,
  InstructionsDynamicValue,
  OperationContext,
  OutputGuardrail,
  SupervisorConfig,
} from "./types";

const BUFFER_CONTEXT_KEY = Symbol("conversationBuffer");
const QUEUE_CONTEXT_KEY = Symbol("memoryPersistQueue");

// ============================================================================
// Types
// ============================================================================

/**
 * Context input type that accepts both Map and plain object
 */
export type ContextInput = Map<string | symbol, unknown> | Record<string | symbol, unknown>;

/**
 * Converts context input to Map
 */
function toContextMap(context?: ContextInput): Map<string | symbol, unknown> | undefined {
  if (!context) return undefined;
  return context instanceof Map ? context : new Map(Object.entries(context));
}

/**
 * Agent context with comprehensive tracking
 */
// AgentContext removed; OperationContext is used directly throughout

// AgentHooks type is defined in './hooks' and uses OperationContext

/**
 * Extended StreamTextResult that includes context
 */
export interface StreamTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  PARTIAL_OUTPUT = any,
> {
  // All methods from AIStreamTextResult
  readonly text: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["text"];
  readonly textStream: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["textStream"];
  readonly fullStream: AsyncIterable<VoltAgentTextStreamPart<TOOLS>>;
  readonly usage: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["usage"];
  readonly finishReason: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["finishReason"];
  // Experimental partial output stream for streaming structured objects
  readonly experimental_partialOutputStream?: AIStreamTextResult<
    TOOLS,
    PARTIAL_OUTPUT
  >["experimental_partialOutputStream"];
  toUIMessageStream: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["toUIMessageStream"];
  toUIMessageStreamResponse: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["toUIMessageStreamResponse"];
  pipeUIMessageStreamToResponse: AIStreamTextResult<
    TOOLS,
    PARTIAL_OUTPUT
  >["pipeUIMessageStreamToResponse"];
  pipeTextStreamToResponse: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["pipeTextStreamToResponse"];
  toTextStreamResponse: AIStreamTextResult<TOOLS, PARTIAL_OUTPUT>["toTextStreamResponse"];
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Extended StreamObjectResult that includes context
 */
export interface StreamObjectResultWithContext<T> {
  // Delegate to original streamObject result properties
  readonly object: Promise<T>;
  readonly partialObjectStream: ReadableStream<Partial<T>>;
  readonly textStream: AsyncIterableStream<string>;
  readonly warnings: Promise<CallWarning[] | undefined>;
  readonly usage: Promise<LanguageModelUsage>;
  readonly finishReason: Promise<FinishReason>;
  // Response conversion methods
  pipeTextStreamToResponse(response: any, init?: ResponseInit): void;
  toTextStreamResponse(init?: ResponseInit): Response;
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Extended GenerateTextResult that includes context
 */
export type GenerateTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  OUTPUT = any,
> = GenerateTextResult<TOOLS, OUTPUT> & {
  // Additional context field
  context: Map<string | symbol, unknown>;
};

/**
 * Extended GenerateObjectResult that includes context
 */
export interface GenerateObjectResultWithContext<T> extends GenerateObjectResult<T> {
  // Additional context field
  context: Map<string | symbol, unknown>;
}

/**
 * Renames providerOptions nack to providerMetadata
 * in all content parts in model messages after conversion by convertToModelMessages.
 * temporary fix for https://github.com/vercel/ai/issues/9731
 */
const convertToModelMessagesFix = (uiMessages: UIMessage[]) => {
  return renameProviderOptions(convertToModelMessages(uiMessages));
};

export function renameProviderOptions(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (!Array.isArray(msg.content)) return msg;

    const content = msg.content.map((part) => {
      if (part && typeof part === "object" && "providerOptions" in part) {
        const { providerOptions, ...rest } = part;
        return { ...rest, providerMetadata: providerOptions };
      }
      return part;
    });

    return { ...msg, content } as ModelMessage;
  });
}

function cloneGenerateTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  OUTPUT = any,
>(
  result: GenerateTextResult<TOOLS, OUTPUT>,
  overrides: Pick<GenerateTextResultWithContext<TOOLS, OUTPUT>, "text" | "context">,
): GenerateTextResultWithContext<TOOLS, OUTPUT> {
  const prototype = Object.getPrototypeOf(result);
  const clone = Object.create(prototype) as GenerateTextResultWithContext<TOOLS, OUTPUT>;
  const descriptors = Object.getOwnPropertyDescriptors(result);
  const overrideKeys = new Set(Object.keys(overrides));
  const baseDescriptors = Object.fromEntries(
    Object.entries(descriptors).filter(([key]) => !overrideKeys.has(key)),
  ) as PropertyDescriptorMap;

  Object.defineProperties(clone, baseDescriptors);

  for (const key of Object.keys(overrides) as Array<keyof typeof overrides>) {
    Object.defineProperty(clone, key, {
      value: overrides[key],
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  return clone;
}

/**
 * Base options for all generation methods
 * Extends AI SDK's CallSettings for full compatibility
 */
export interface BaseGenerationOptions extends Partial<CallSettings> {
  // === VoltAgent Specific ===
  // Context
  userId?: string;
  conversationId?: string;
  context?: ContextInput;
  elicitation?: (request: unknown) => Promise<unknown>;

  // Parent tracking
  parentAgentId?: string;
  parentOperationContext?: OperationContext;
  parentSpan?: Span; // Optional parent span for OpenTelemetry context propagation

  // Memory
  contextLimit?: number;

  // Semantic memory options
  semanticMemory?: {
    enabled?: boolean;
    semanticLimit?: number;
    semanticThreshold?: number;
    mergeStrategy?: "prepend" | "append" | "interleave";
  };

  // Steps control
  maxSteps?: number;
  /**
   * Custom stop condition for ai-sdk step execution.
   * When provided, this overrides VoltAgent's default `stepCountIs(maxSteps)`.
   * Use with care: incorrect predicates can cause early termination or
   * unbounded loops depending on provider behavior and tool usage.
   */
  stopWhen?: StopWhen;

  // Tools (can provide additional tools dynamically)
  tools?: (Tool<any, any> | Toolkit)[];

  // Hooks (can override agent hooks)
  hooks?: AgentHooks;

  // Guardrails (can override agent-level guardrails)
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<any>[];

  // Provider-specific options
  providerOptions?: ProviderOptions;

  // Experimental output (for structured generation)
  experimental_output?: ReturnType<typeof Output.object> | ReturnType<typeof Output.text>;

  // === Inherited from AI SDK CallSettings ===
  // maxOutputTokens, temperature, topP, topK,
  // presencePenalty, frequencyPenalty, stopSequences,
  // seed, maxRetries, abortSignal, headers
}

export type GenerateTextOptions = BaseGenerationOptions;
export type StreamTextOptions = BaseGenerationOptions & {
  onFinish?: (result: any) => void | Promise<void>;
};
export type GenerateObjectOptions = BaseGenerationOptions;
export type StreamObjectOptions = BaseGenerationOptions & {
  onFinish?: (result: any) => void | Promise<void>;
};

// ============================================================================
// Agent Implementation
// ============================================================================

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly purpose?: string;
  readonly instructions: InstructionsDynamicValue;
  readonly model: LanguageModel | DynamicValue<LanguageModel>;
  readonly dynamicTools?: DynamicValue<(Tool<any, any> | Toolkit)[]>;
  readonly hooks: AgentHooks;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly maxSteps: number;
  readonly stopWhen?: StopWhen;
  readonly markdown: boolean;
  readonly voice?: Voice;
  readonly retriever?: BaseRetriever;
  readonly supervisorConfig?: SupervisorConfig;
  private readonly context?: Map<string | symbol, unknown>;

  private readonly logger: Logger;
  private readonly memoryManager: MemoryManager;
  private readonly memory?: Memory | false;
  private defaultObservability?: VoltAgentObservability;
  private readonly toolManager: ToolManager;
  private readonly subAgentManager: SubAgentManager;
  private readonly voltOpsClient?: VoltOpsClient;
  private readonly prompts?: PromptHelper;
  private readonly evalConfig?: AgentEvalConfig;
  private readonly inputGuardrails: NormalizedInputGuardrail[];
  private readonly outputGuardrails: NormalizedOutputGuardrail[];

  constructor(options: AgentOptions) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.purpose = options.purpose;
    this.instructions = options.instructions;
    this.model = options.model;
    this.dynamicTools = typeof options.tools === "function" ? options.tools : undefined;
    this.hooks = options.hooks || {};
    this.temperature = options.temperature;
    this.maxOutputTokens = options.maxOutputTokens;
    this.maxSteps = options.maxSteps || 5;
    this.stopWhen = options.stopWhen;
    this.markdown = options.markdown ?? false;
    this.voice = options.voice;
    this.retriever = options.retriever;
    this.supervisorConfig = options.supervisorConfig;
    this.context = toContextMap(options.context);
    this.voltOpsClient = options.voltOpsClient;
    this.evalConfig = options.eval;
    this.inputGuardrails = normalizeInputGuardrailList(options.inputGuardrails || []);
    this.outputGuardrails = normalizeOutputGuardrailList(options.outputGuardrails || []);

    // Initialize logger - always use LoggerProxy for consistency
    // If external logger is provided, it will be used by LoggerProxy
    this.logger = new LoggerProxy(
      {
        component: "agent",
        agentId: this.id,
        modelName: this.getModelName(),
      },
      options.logger,
    );

    // Log agent creation
    this.logger.debug(`Agent created: ${this.name}`, {
      event: LogEvents.AGENT_CREATED,
      agentId: this.id,
      model: this.getModelName(),
      hasTools: !!options.tools,
      hasMemory: options.memory !== false,
      hasSubAgents: !!(options.subAgents && options.subAgents.length > 0),
    });

    // Store Memory
    this.memory = options.memory;

    // Initialize memory manager
    this.memoryManager = new MemoryManager(this.id, this.memory, {}, this.logger);

    // Initialize tool manager with static tools
    const staticTools = typeof options.tools === "function" ? [] : options.tools;
    this.toolManager = new ToolManager(staticTools, this.logger);
    if (options.toolkits) {
      this.toolManager.addItems(options.toolkits);
    }

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(
      this.name,
      options.subAgents || [],
      this.supervisorConfig,
    );

    // Initialize prompts helper with VoltOpsClient (agent's own or global)
    // Priority 1: Agent's own VoltOpsClient
    // Priority 2: Global VoltOpsClient from registry
    const voltOpsClient =
      this.voltOpsClient || AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (voltOpsClient) {
      this.prompts = voltOpsClient.createPromptHelper(this.id);
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Generate text response
   */
  async generateText(
    input: string | UIMessage[] | BaseMessage[],
    options?: GenerateTextOptions,
  ): Promise<GenerateTextResultWithContext> {
    const startTime = Date.now();
    const oc = this.createOperationContext(input, options);
    const methodLogger = oc.logger;

    // Wrap entire execution in root span for trace context
    const rootSpan = oc.traceContext.getRootSpan();
    return await oc.traceContext.withSpan(rootSpan, async () => {
      const guardrailSet = this.resolveGuardrailSets(options);
      const buffer = this.getConversationBuffer(oc);
      const persistQueue = this.getMemoryPersistQueue(oc);
      let effectiveInput: typeof input = input;
      try {
        effectiveInput = await executeInputGuardrails(
          input,
          oc,
          guardrailSet.input,
          "generateText",
          this,
        );

        const { messages, uiMessages, model, tools, maxSteps } = await this.prepareExecution(
          effectiveInput,
          oc,
          options,
        );

        const modelName = this.getModelName();
        const contextLimit = options?.contextLimit;

        // Add model attributes and all options
        addModelAttributesToSpan(
          rootSpan,
          modelName,
          options,
          this.maxOutputTokens,
          this.temperature,
        );

        // Add context to span
        const contextMap = Object.fromEntries(oc.context.entries());
        if (Object.keys(contextMap).length > 0) {
          rootSpan.setAttribute("agent.context", safeStringify(contextMap));
        }

        // Add messages (serialize to JSON string)
        rootSpan.setAttribute("agent.messages", safeStringify(messages));
        rootSpan.setAttribute("agent.messages.ui", safeStringify(uiMessages));

        // Add agent state snapshot for remote observability
        const agentState = this.getFullState();
        rootSpan.setAttribute("agent.stateSnapshot", safeStringify(agentState));

        // Log generation start with only event-specific context
        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.GENERATION_START,
            `Starting text generation with ${modelName}`,
          ),
          {
            event: LogEvents.AGENT_GENERATION_STARTED,
            operationType: "text",
            contextLimit,
            memoryEnabled: !!this.memoryManager.getMemory(),
            model: modelName,
            messageCount: messages?.length || 0,
            input: effectiveInput,
          },
        );

        // Call hooks
        await this.getMergedHooks(options).onStart?.({ agent: this, context: oc });

        // Event tracking now handled by OpenTelemetry spans

        // Setup abort signal listener
        this.setupAbortSignalListener(oc);

        methodLogger.debug("Starting agent llm call");

        methodLogger.debug("[LLM] - Generating text", {
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          maxSteps,
          tools: tools ? Object.keys(tools) : [],
        });

        // Extract VoltAgent-specific options
        const {
          userId,
          conversationId,
          parentAgentId,
          parentOperationContext,
          hooks,
          maxSteps: userMaxSteps,
          tools: userTools,
          experimental_output,
          providerOptions,
          ...aiSDKOptions
        } = options || {};

        const result = await generateText({
          model,
          messages,
          tools,
          // Default values
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          maxRetries: 3,
          stopWhen: options?.stopWhen ?? this.stopWhen ?? stepCountIs(maxSteps),
          // User overrides from AI SDK options
          ...aiSDKOptions,
          // Experimental output if provided
          experimental_output,
          // Provider-specific options
          providerOptions,
          // VoltAgent controlled (these should not be overridden)
          abortSignal: oc.abortController.signal,
          onStepFinish: this.createStepHandler(oc, options),
        });

        await persistQueue.flush(buffer, oc);

        const usageInfo = convertUsage(result.usage);
        const finalText = await executeOutputGuardrails({
          output: result.text,
          operationContext: oc,
          guardrails: guardrailSet.output,
          operation: "generateText",
          agent: this,
          metadata: {
            usage: usageInfo,
            finishReason: result.finishReason ?? null,
            warnings: result.warnings ?? null,
          },
        });

        await this.getMergedHooks(options).onEnd?.({
          conversationId: oc.conversationId || "",
          agent: this,
          output: {
            text: finalText,
            usage: usageInfo,
            providerResponse: result.response,
            finishReason: result.finishReason,
            warnings: result.warnings,
            context: oc.context,
          },
          error: undefined,
          context: oc,
        });

        // Log successful completion with usage details
        const providerUsage = result.usage;
        const tokenInfo = providerUsage ? `${providerUsage.totalTokens} tokens` : "no usage data";
        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.GENERATION_COMPLETE,
            `Text generation completed (${tokenInfo})`,
          ),
          {
            event: LogEvents.AGENT_GENERATION_COMPLETED,
            duration: Date.now() - startTime,
            finishReason: result.finishReason,
            usage: result.usage,
            toolCalls: result.toolCalls?.length || 0,
            text: finalText,
          },
        );

        // Add usage to span
        this.setTraceContextUsage(oc.traceContext, result.usage);
        oc.traceContext.setOutput(finalText);
        oc.traceContext.setFinishReason(result.finishReason);

        // Check if stopped by maxSteps
        if (result.steps && result.steps.length >= maxSteps) {
          oc.traceContext.setStopConditionMet(result.steps.length, maxSteps);
        }

        // Set output in operation context
        oc.output = finalText;

        this.enqueueEvalScoring({
          oc,
          output: finalText,
          operation: "generateText",
          metadata: {
            finishReason: result.finishReason,
            usage: result.usage ? JSON.parse(safeStringify(result.usage)) : undefined,
            toolCalls: result.toolCalls,
          },
        });

        // Close span after scheduling scorers
        oc.traceContext.end("completed");

        return cloneGenerateTextResultWithContext(result, {
          text: finalText,
          context: oc.context,
        });
      } catch (error) {
        await this.flushPendingMessagesOnError(oc).catch(() => {});
        return this.handleError(error as Error, oc, options, startTime);
      }
    });
  }

  /**
   * Stream text response
   */
  async streamText(
    input: string | UIMessage[] | BaseMessage[],
    options?: StreamTextOptions,
  ): Promise<StreamTextResultWithContext> {
    const startTime = Date.now();
    const oc = this.createOperationContext(input, options);

    // Wrap entire execution in root span to ensure all logs have trace context
    const rootSpan = oc.traceContext.getRootSpan();
    return await oc.traceContext.withSpan(rootSpan, async () => {
      const methodLogger = oc.logger; // Extract logger with executionId
      const guardrailSet = this.resolveGuardrailSets(options);
      const buffer = this.getConversationBuffer(oc);
      const persistQueue = this.getMemoryPersistQueue(oc);
      let effectiveInput: typeof input = input;
      try {
        effectiveInput = await executeInputGuardrails(
          input,
          oc,
          guardrailSet.input,
          "streamText",
          this,
        );

        // No need to initialize stream collection anymore - we'll use UIMessageStreamWriter

        const { messages, uiMessages, model, tools, maxSteps } = await this.prepareExecution(
          effectiveInput,
          oc,
          options,
        );

        const modelName = this.getModelName();
        const contextLimit = options?.contextLimit;

        // Add model attributes to root span if TraceContext exists
        // Input is now set during TraceContext creation in createContext
        if (oc.traceContext) {
          const rootSpan = oc.traceContext.getRootSpan();
          // Add model attributes and all options
          addModelAttributesToSpan(
            rootSpan,
            modelName,
            options,
            this.maxOutputTokens,
            this.temperature,
          );

          // Add context to span
          const contextMap = Object.fromEntries(oc.context.entries());
          if (Object.keys(contextMap).length > 0) {
            rootSpan.setAttribute("agent.context", safeStringify(contextMap));
          }

          // Add messages (serialize to JSON string)
          rootSpan.setAttribute("agent.messages", safeStringify(messages));
          rootSpan.setAttribute("agent.messages.ui", safeStringify(uiMessages));

          // Add agent state snapshot for remote observability
          const agentState = this.getFullState();
          rootSpan.setAttribute("agent.stateSnapshot", safeStringify(agentState));
        }

        // Log stream start
        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.STREAM_START,
            `Starting stream generation with ${modelName}`,
          ),
          {
            event: LogEvents.AGENT_STREAM_STARTED,
            operationType: "stream",
            contextLimit,
            memoryEnabled: !!this.memoryManager.getMemory(),
            model: modelName,
            messageCount: messages?.length || 0,
            input: effectiveInput,
          },
        );

        // Call hooks
        await this.getMergedHooks(options).onStart?.({ agent: this, context: oc });

        // Event tracking now handled by OpenTelemetry spans

        // Setup abort signal listener
        this.setupAbortSignalListener(oc);

        // Extract VoltAgent-specific options
        const {
          userId,
          conversationId,
          parentAgentId,
          parentOperationContext,
          hooks,
          maxSteps: userMaxSteps,
          tools: userTools,
          onFinish: userOnFinish,
          experimental_output,
          providerOptions,
          ...aiSDKOptions
        } = options || {};

        const guardrailStreamingEnabled = guardrailSet.output.length > 0;

        let guardrailPipeline: GuardrailPipeline | null = null;
        let sanitizedTextPromise!: Promise<string>;

        const result = streamText({
          model,
          messages,
          tools,
          // Default values
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
          maxRetries: 3,
          stopWhen: options?.stopWhen ?? this.stopWhen ?? stepCountIs(maxSteps),
          // User overrides from AI SDK options
          ...aiSDKOptions,
          // Experimental output if provided
          experimental_output,
          // Provider-specific options
          providerOptions,
          // VoltAgent controlled (these should not be overridden)
          abortSignal: oc.abortController.signal,
          onStepFinish: this.createStepHandler(oc, options),
          onError: (errorData) => {
            // Handle nested error structure from OpenAI and other providers
            // The error might be directly the error or wrapped in { error: ... }
            const actualError = (errorData as any)?.error || errorData;

            // Log the error
            methodLogger.error("Stream error occurred", {
              error: actualError,
              agentName: this.name,
              modelName: this.getModelName(),
            });

            // History update removed - using OpenTelemetry only

            // Event tracking now handled by OpenTelemetry spans

            // Call error hooks if they exist
            this.getMergedHooks(options).onError?.({
              agent: this,
              error: actualError as Error,
              context: oc,
            });

            // Close OpenTelemetry span with error status
            oc.traceContext.end("error", actualError as Error);

            // Don't re-throw - let the error be part of the stream
            // The onError callback should return void for AI SDK compatibility
          },
          onFinish: async (finalResult) => {
            await persistQueue.flush(buffer, oc);

            // History update removed - using OpenTelemetry only

            // Event tracking now handled by OpenTelemetry spans

            // Add usage to span
            this.setTraceContextUsage(oc.traceContext, finalResult.totalUsage);

            const usage = convertUsage(finalResult.totalUsage);
            let finalText: string;

            if (guardrailPipeline) {
              finalText = await sanitizedTextPromise;
            } else if (guardrailSet.output.length > 0) {
              finalText = await executeOutputGuardrails({
                output: finalResult.text,
                operationContext: oc,
                guardrails: guardrailSet.output,
                operation: "streamText",
                agent: this,
                metadata: {
                  usage,
                  finishReason: finalResult.finishReason ?? null,
                  warnings: finalResult.warnings ?? null,
                },
              });
            } else {
              finalText = finalResult.text;
            }

            const guardrailedResult =
              guardrailSet.output.length > 0 ? { ...finalResult, text: finalText } : finalResult;

            oc.traceContext.setOutput(finalText);
            oc.traceContext.setFinishReason(finalResult.finishReason);

            // Check if stopped by maxSteps
            const steps = finalResult.steps;
            if (steps && steps.length >= maxSteps) {
              oc.traceContext.setStopConditionMet(steps.length, maxSteps);
            }

            // Set output in operation context
            oc.output = finalText;
            // Call hooks with standardized output (stream finish result)
            await this.getMergedHooks(options).onEnd?.({
              conversationId: oc.conversationId || "",
              agent: this,
              output: {
                text: finalText,
                usage,
                providerResponse: finalResult.response,
                finishReason: finalResult.finishReason,
                warnings: finalResult.warnings,
                context: oc.context,
              },
              error: undefined,
              context: oc,
            });

            // Call user's onFinish if it exists
            if (userOnFinish) {
              await userOnFinish(guardrailedResult);
            }

            const tokenInfo = usage ? `${usage.totalTokens} tokens` : "no usage data";
            methodLogger.debug(
              buildAgentLogMessage(
                this.name,
                ActionType.GENERATION_COMPLETE,
                `Text generation completed (${tokenInfo})`,
              ),
              {
                event: LogEvents.AGENT_GENERATION_COMPLETED,
                duration: Date.now() - startTime,
                finishReason: finalResult.finishReason,
                usage: finalResult.usage,
                toolCalls: finalResult.toolCalls?.length || 0,
                text: finalText,
              },
            );

            this.enqueueEvalScoring({
              oc,
              output: finalText,
              operation: "streamText",
              metadata: {
                finishReason: finalResult.finishReason,
                usage: finalResult.totalUsage
                  ? JSON.parse(safeStringify(finalResult.totalUsage))
                  : undefined,
                toolCalls: finalResult.toolCalls,
              },
            });

            oc.traceContext.end("completed");
          },
        });

        // Capture the agent instance for use in helpers
        type ToUIMessageStreamOptions = Parameters<typeof result.toUIMessageStream>[0];
        type ToUIMessageStreamResponseOptions = Parameters<
          typeof result.toUIMessageStreamResponse
        >[0];
        type ToUIMessageStreamReturn = ReturnType<typeof result.toUIMessageStream>;
        type UIStreamChunk = ToUIMessageStreamReturn extends AsyncIterable<infer Chunk>
          ? Chunk
          : never;

        const agent = this;

        const createBaseFullStream = (): AsyncIterable<VoltAgentTextStreamPart> => {
          if (agent.subAgentManager.hasSubAgents()) {
            const createMergedFullStream =
              async function* (): AsyncIterable<VoltAgentTextStreamPart> {
                const { readable, writable } = new TransformStream<VoltAgentTextStreamPart>();
                const writer = writable.getWriter();

                oc.systemContext.set("fullStreamWriter", writer);

                const writeParentStream = async () => {
                  try {
                    for await (const part of result.fullStream) {
                      await writer.write(part as VoltAgentTextStreamPart);
                    }
                  } finally {
                    // noop, writer closed after draining merged stream
                  }
                };

                const parentPromise = writeParentStream();
                const reader = readable.getReader();

                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (value !== undefined) {
                      yield value;
                    }
                  }
                } finally {
                  reader.releaseLock();
                  await parentPromise;
                  await writer.close();
                }
              };

            return createMergedFullStream();
          }

          return result.fullStream;
        };

        const guardrailContext = guardrailStreamingEnabled
          ? {
              guardrails: guardrailSet.output,
              agent: this,
              operationContext: oc,
              operation: "streamText" as AgentEvalOperationType,
            }
          : null;

        const baseFullStreamForPipeline = guardrailStreamingEnabled
          ? createBaseFullStream()
          : undefined;

        if (guardrailStreamingEnabled) {
          guardrailPipeline = createGuardrailPipeline(
            baseFullStreamForPipeline as AsyncIterable<VoltAgentTextStreamPart>,
            result.textStream,
            guardrailContext,
          );
          sanitizedTextPromise = guardrailPipeline.finalizePromise.then(async () => {
            const sanitized = guardrailPipeline?.runner?.getSanitizedText();
            if (typeof sanitized === "string" && sanitized.length > 0) {
              return sanitized;
            }
            return await result.text;
          });
        } else {
          sanitizedTextPromise = result.text;
        }

        const getGuardrailAwareFullStream = (): AsyncIterable<VoltAgentTextStreamPart> => {
          if (guardrailPipeline) {
            return guardrailPipeline.fullStream;
          }
          return createBaseFullStream();
        };

        const getGuardrailAwareTextStream = (): AsyncIterableStream<string> => {
          if (guardrailPipeline) {
            return guardrailPipeline.textStream;
          }
          return result.textStream;
        };

        const getGuardrailAwareUIStream = (
          streamOptions?: ToUIMessageStreamOptions,
        ): ToUIMessageStreamReturn => {
          if (!guardrailPipeline) {
            return result.toUIMessageStream(streamOptions);
          }
          return guardrailPipeline.createUIStream(streamOptions) as ToUIMessageStreamReturn;
        };

        const createMergedUIStream = (
          streamOptions?: ToUIMessageStreamOptions,
        ): ToUIMessageStreamReturn => {
          const mergedStream = createUIMessageStream({
            execute: async ({ writer }) => {
              oc.systemContext.set("uiStreamWriter", writer);
              writer.merge(getGuardrailAwareUIStream(streamOptions));
            },
            onError: (error) => String(error),
          });

          return createAsyncIterableReadable<UIStreamChunk>(async (controller) => {
            const reader = mergedStream.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value !== undefined) {
                  controller.enqueue(value);
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            } finally {
              reader.releaseLock();
            }
          });
        };

        const toUIMessageStreamSanitized = (
          streamOptions?: ToUIMessageStreamOptions,
        ): ToUIMessageStreamReturn => {
          if (agent.subAgentManager.hasSubAgents()) {
            return createMergedUIStream(streamOptions);
          }
          return getGuardrailAwareUIStream(streamOptions);
        };

        const toUIMessageStreamResponseSanitized = (
          options?: ToUIMessageStreamResponseOptions,
        ): ReturnType<typeof result.toUIMessageStreamResponse> => {
          const streamOptions = options as ToUIMessageStreamOptions | undefined;
          const stream = agent.subAgentManager.hasSubAgents()
            ? createMergedUIStream(streamOptions)
            : getGuardrailAwareUIStream(streamOptions);
          const responseInit = options ? { ...options } : {};
          return createUIMessageStreamResponse({
            stream,
            ...responseInit,
          });
        };

        const pipeUIMessageStreamToResponseSanitized = (
          response: Parameters<typeof result.pipeUIMessageStreamToResponse>[0],
          init?: Parameters<typeof result.pipeUIMessageStreamToResponse>[1],
        ): void => {
          const streamOptions = init as ToUIMessageStreamOptions | undefined;
          const stream = agent.subAgentManager.hasSubAgents()
            ? createMergedUIStream(streamOptions)
            : getGuardrailAwareUIStream(streamOptions);
          const initOptions = init ? { ...init } : {};
          pipeUIMessageStreamToResponse({
            response,
            stream,
            ...initOptions,
          });
        };

        // Create a wrapper that includes context and delegates to the original result
        const resultWithContext: StreamTextResultWithContext = {
          text: sanitizedTextPromise,
          get textStream() {
            return getGuardrailAwareTextStream();
          },
          get fullStream() {
            return getGuardrailAwareFullStream();
          },
          usage: result.usage,
          finishReason: result.finishReason,
          get experimental_partialOutputStream() {
            return result.experimental_partialOutputStream;
          },
          toUIMessageStream: toUIMessageStreamSanitized as typeof result.toUIMessageStream,
          toUIMessageStreamResponse:
            toUIMessageStreamResponseSanitized as typeof result.toUIMessageStreamResponse,
          pipeUIMessageStreamToResponse:
            pipeUIMessageStreamToResponseSanitized as typeof result.pipeUIMessageStreamToResponse,
          pipeTextStreamToResponse: (response, init) => {
            pipeTextStreamToResponse({
              response,
              textStream: getGuardrailAwareTextStream(),
              ...(init ?? {}),
            });
          },
          toTextStreamResponse: (init) => {
            return createTextStreamResponse({
              textStream: getGuardrailAwareTextStream(),
              ...(init ?? {}),
            });
          },
          context: oc.context,
        };

        return resultWithContext;
      } catch (error) {
        await this.flushPendingMessagesOnError(oc).catch(() => {});
        return this.handleError(error as Error, oc, options, startTime);
      }
    });
  }

  /**
   * Generate structured object
   */
  async generateObject<T extends z.ZodType>(
    input: string | UIMessage[] | BaseMessage[],
    schema: T,
    options?: GenerateObjectOptions,
  ): Promise<GenerateObjectResultWithContext<z.infer<T>>> {
    const startTime = Date.now();
    const oc = this.createOperationContext(input, options);
    const methodLogger = oc.logger;

    // Wrap entire execution in root span for trace context
    const rootSpan = oc.traceContext.getRootSpan();
    return await oc.traceContext.withSpan(rootSpan, async () => {
      const guardrailSet = this.resolveGuardrailSets(options);
      let effectiveInput: typeof input = input;
      try {
        effectiveInput = await executeInputGuardrails(
          input,
          oc,
          guardrailSet.input,
          "generateObject",
          this,
        );
        const { messages, uiMessages, model } = await this.prepareExecution(
          effectiveInput,
          oc,
          options,
        );

        const modelName = this.getModelName();
        const schemaName = schema.description || "unknown";

        // Add model attributes and all options
        addModelAttributesToSpan(
          rootSpan,
          modelName,
          options,
          this.maxOutputTokens,
          this.temperature,
        );

        // Add context to span
        const contextMap = Object.fromEntries(oc.context.entries());
        if (Object.keys(contextMap).length > 0) {
          rootSpan.setAttribute("agent.context", safeStringify(contextMap));
        }

        // Add messages (serialize to JSON string)
        rootSpan.setAttribute("agent.messages", safeStringify(messages));
        rootSpan.setAttribute("agent.messages.ui", safeStringify(uiMessages));

        // Add agent state snapshot for remote observability
        const agentState = this.getFullState();
        rootSpan.setAttribute("agent.stateSnapshot", safeStringify(agentState));

        // Log generation start (object)
        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.GENERATION_START,
            `Starting object generation with ${modelName}`,
          ),
          {
            event: LogEvents.AGENT_GENERATION_STARTED,
            operationType: "object",
            schemaName,
            model: modelName,
            messageCount: messages?.length || 0,
            input: effectiveInput,
          },
        );

        // Call hooks
        await this.getMergedHooks(options).onStart?.({ agent: this, context: oc });

        // Event tracking now handled by OpenTelemetry spans

        // Extract VoltAgent-specific options
        const {
          userId,
          conversationId,
          parentAgentId,
          parentOperationContext,
          hooks,
          maxSteps: userMaxSteps,
          tools: userTools,
          providerOptions,
          ...aiSDKOptions
        } = options || {};

        const result = await generateObject({
          model,
          messages,
          output: "object",
          schema,
          // Default values
          maxOutputTokens: this.maxOutputTokens,
          temperature: this.temperature,
          maxRetries: 3,
          // User overrides from AI SDK options
          ...aiSDKOptions,
          // Provider-specific options
          providerOptions,
          // VoltAgent controlled
          abortSignal: oc.abortController.signal,
        });

        const usageInfo = convertUsage(result.usage);
        const finalObject = await executeOutputGuardrails({
          output: result.object,
          operationContext: oc,
          guardrails: guardrailSet.output,
          operation: "generateObject",
          agent: this,
          metadata: {
            usage: usageInfo,
            finishReason: result.finishReason ?? null,
            warnings: result.warnings ?? null,
          },
        });

        // Save the object response to memory
        if (oc.userId && oc.conversationId) {
          // Create UIMessage from the object response
          const message: UIMessage = {
            id: randomUUID(),
            role: "assistant",
            parts: [
              {
                type: "text",
                text: safeStringify(finalObject),
              },
            ],
          };

          // Save the message to memory
          await this.memoryManager.saveMessage(oc, message, oc.userId, oc.conversationId);

          // Add step to history
          const step: StepWithContent = {
            id: randomUUID(),
            type: "text",
            content: safeStringify(finalObject),
            role: "assistant",
            usage: usageInfo,
          };
          this.addStepToHistory(step, oc);
        }

        // History update removed - using OpenTelemetry only

        // Event tracking now handled by OpenTelemetry spans

        // Add usage to span
        this.setTraceContextUsage(oc.traceContext, result.usage);
        oc.traceContext.setOutput(finalObject);

        // Set output in operation context
        oc.output = finalObject;

        this.enqueueEvalScoring({
          oc,
          output: finalObject,
          operation: "generateObject",
          metadata: {
            finishReason: result.finishReason,
            usage: result.usage ? JSON.parse(safeStringify(result.usage)) : undefined,
            schemaName,
          },
        });

        oc.traceContext.end("completed");

        // Call hooks
        await this.getMergedHooks(options).onEnd?.({
          conversationId: oc.conversationId || "",
          agent: this,
          output: {
            object: finalObject,
            usage: usageInfo,
            providerResponse: (result as any).response,
            finishReason: result.finishReason,
            warnings: result.warnings,
            context: oc.context,
          },
          error: undefined,
          context: oc,
        });

        // Log successful completion
        const usage = result.usage;
        const tokenInfo = usage ? `${usage.totalTokens} tokens` : "no usage data";
        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.GENERATION_COMPLETE,
            `Object generation completed (${tokenInfo})`,
          ),
          {
            event: LogEvents.AGENT_GENERATION_COMPLETED,
            duration: Date.now() - startTime,
            finishReason: result.finishReason,
            usage: result.usage,
            schemaName,
          },
        );

        // Return result with same context reference for consistency
        return {
          ...result,
          object: finalObject,
          context: oc.context,
        };
      } catch (error) {
        await this.flushPendingMessagesOnError(oc).catch(() => {});
        return this.handleError(error as Error, oc, options, startTime);
      }
    });
  }

  /**
   * Stream structured object
   */
  async streamObject<T extends z.ZodType>(
    input: string | UIMessage[] | BaseMessage[],
    schema: T,
    options?: StreamObjectOptions,
  ): Promise<StreamObjectResultWithContext<z.infer<T>>> {
    const startTime = Date.now();
    const oc = this.createOperationContext(input, options);

    // Wrap entire execution in root span for trace context
    const rootSpan = oc.traceContext.getRootSpan();
    return await oc.traceContext.withSpan(rootSpan, async () => {
      const methodLogger = oc.logger; // Extract logger with executionId
      const guardrailSet = this.resolveGuardrailSets(options);
      let effectiveInput: typeof input = input;
      try {
        effectiveInput = await executeInputGuardrails(
          input,
          oc,
          guardrailSet.input,
          "streamObject",
          this,
        );

        const { messages, uiMessages, model } = await this.prepareExecution(
          effectiveInput,
          oc,
          options,
        );

        const modelName = this.getModelName();
        const schemaName = schema.description || "unknown";

        // Add model attributes and all options
        addModelAttributesToSpan(
          rootSpan,
          modelName,
          options,
          this.maxOutputTokens,
          this.temperature,
        );

        // Add context to span
        const contextMap = Object.fromEntries(oc.context.entries());
        if (Object.keys(contextMap).length > 0) {
          rootSpan.setAttribute("agent.context", safeStringify(contextMap));
        }

        // Add messages (serialize to JSON string)
        rootSpan.setAttribute("agent.messages", safeStringify(messages));
        rootSpan.setAttribute("agent.messages.ui", safeStringify(uiMessages));

        // Add agent state snapshot for remote observability
        const agentState = this.getFullState();
        rootSpan.setAttribute("agent.stateSnapshot", safeStringify(agentState));

        // Log stream object start
        methodLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.STREAM_START,
            `Starting object stream generation with ${modelName}`,
          ),
          {
            event: LogEvents.AGENT_STREAM_STARTED,
            operationType: "object",
            schemaName: schemaName,
            model: modelName,
            messageCount: messages?.length || 0,
            input: effectiveInput,
          },
        );

        // Call hooks
        await this.getMergedHooks(options).onStart?.({ agent: this, context: oc });

        // Event tracking now handled by OpenTelemetry spans

        // Extract VoltAgent-specific options
        const {
          userId,
          conversationId,
          parentAgentId,
          parentOperationContext,
          hooks,
          maxSteps: userMaxSteps,
          tools: userTools,
          onFinish: userOnFinish,
          providerOptions,
          ...aiSDKOptions
        } = options || {};

        let guardrailObjectPromise!: Promise<z.infer<T>>;
        let resolveGuardrailObject: ((value: z.infer<T>) => void) | undefined;
        let rejectGuardrailObject: ((reason: unknown) => void) | undefined;

        const result = streamObject({
          model,
          messages,
          output: "object",
          schema,
          // Default values
          maxOutputTokens: this.maxOutputTokens,
          temperature: this.temperature,
          maxRetries: 3,
          // User overrides from AI SDK options
          ...aiSDKOptions,
          // Provider-specific options
          providerOptions,
          // VoltAgent controlled
          abortSignal: oc.abortController.signal,
          onError: (errorData) => {
            // Handle nested error structure from OpenAI and other providers
            // The error might be directly the error or wrapped in { error: ... }
            const actualError = (errorData as any)?.error || errorData;

            // Log the error
            methodLogger.error("Stream object error occurred", {
              error: actualError,
              agentName: this.name,
              modelName: this.getModelName(),
              schemaName: schemaName,
            });

            // History update removed - using OpenTelemetry only

            // Event tracking now handled by OpenTelemetry spans

            // Call error hooks if they exist
            this.getMergedHooks(options).onError?.({
              agent: this,
              error: actualError as Error,
              context: oc,
            });

            // Close OpenTelemetry span with error status
            oc.traceContext.end("error", actualError as Error);
            rejectGuardrailObject?.(actualError);

            // Don't re-throw - let the error be part of the stream
            // The onError callback should return void for AI SDK compatibility
          },
          onFinish: async (finalResult: any) => {
            try {
              const usageInfo = convertUsage(finalResult.usage as any);
              let finalObject = finalResult.object as z.infer<T>;
              if (guardrailSet.output.length > 0) {
                finalObject = await executeOutputGuardrails({
                  output: finalResult.object as z.infer<T>,
                  operationContext: oc,
                  guardrails: guardrailSet.output,
                  operation: "streamObject",
                  agent: this,
                  metadata: {
                    usage: usageInfo,
                    finishReason: finalResult.finishReason ?? null,
                    warnings: finalResult.warnings ?? null,
                  },
                });
                resolveGuardrailObject?.(finalObject);
              }

              if (oc.userId && oc.conversationId) {
                const message: UIMessage = {
                  id: randomUUID(),
                  role: "assistant",
                  parts: [
                    {
                      type: "text",
                      text: safeStringify(finalObject),
                    },
                  ],
                };

                await this.memoryManager.saveMessage(oc, message, oc.userId, oc.conversationId);

                const step: StepWithContent = {
                  id: randomUUID(),
                  type: "text",
                  content: safeStringify(finalObject),
                  role: "assistant",
                  usage: usageInfo,
                };
                this.addStepToHistory(step, oc);
              }

              // Add usage to span
              this.setTraceContextUsage(oc.traceContext, finalResult.usage);
              oc.traceContext.setOutput(finalObject);

              // Set output in operation context
              oc.output = finalObject;

              await this.getMergedHooks(options).onEnd?.({
                conversationId: oc.conversationId || "",
                agent: this,
                output: {
                  object: finalObject,
                  usage: usageInfo,
                  providerResponse: finalResult.response,
                  finishReason: finalResult.finishReason,
                  warnings: finalResult.warnings,
                  context: oc.context,
                },
                error: undefined,
                context: oc,
              });

              if (userOnFinish) {
                const guardrailedResult =
                  guardrailSet.output.length > 0
                    ? { ...finalResult, object: finalObject }
                    : finalResult;
                await userOnFinish(guardrailedResult);
              }

              const usage = finalResult.usage as any;
              const tokenInfo = usage ? `${usage.totalTokens} tokens` : "no usage data";
              methodLogger.debug(
                buildAgentLogMessage(
                  this.name,
                  ActionType.GENERATION_COMPLETE,
                  `Object generation completed (${tokenInfo})`,
                ),
                {
                  event: LogEvents.AGENT_GENERATION_COMPLETED,
                  duration: Date.now() - startTime,
                  finishReason: finalResult.finishReason,
                  usage: finalResult.usage,
                  schemaName,
                },
              );

              this.enqueueEvalScoring({
                oc,
                output: finalObject,
                operation: "streamObject",
                metadata: {
                  finishReason: finalResult.finishReason,
                  usage: finalResult.usage
                    ? JSON.parse(safeStringify(finalResult.usage))
                    : undefined,
                  schemaName,
                },
              });

              oc.traceContext.end("completed");
            } catch (error) {
              rejectGuardrailObject?.(error);
              throw error;
            }
          },
        });

        if (guardrailSet.output.length > 0) {
          guardrailObjectPromise = new Promise<z.infer<T>>((resolve, reject) => {
            resolveGuardrailObject = resolve;
            rejectGuardrailObject = reject;
          });
        } else {
          guardrailObjectPromise = result.object;
        }

        // Create a wrapper that includes context and delegates to the original result
        // Use getters for streams to avoid ReadableStream locking issues
        const resultWithContext = {
          // Delegate to original properties
          object: guardrailObjectPromise,
          // Use getter for lazy access to avoid stream locking
          get partialObjectStream() {
            return result.partialObjectStream;
          },
          get textStream() {
            return result.textStream;
          },
          warnings: result.warnings,
          usage: result.usage,
          finishReason: result.finishReason,
          // Delegate response conversion methods
          pipeTextStreamToResponse: (response, init) =>
            result.pipeTextStreamToResponse(response, init),
          toTextStreamResponse: (init) => result.toTextStreamResponse(init),
          // Add our custom context
          context: oc.context,
        } as StreamObjectResultWithContext<z.infer<T>>;

        return resultWithContext;
      } catch (error) {
        await this.flushPendingMessagesOnError(oc).catch(() => {});
        return this.handleError(error as Error, oc, options, 0);
      }
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private resolveGuardrailSets(options?: {
    inputGuardrails?: InputGuardrail[];
    outputGuardrails?: OutputGuardrail<any>[];
  }): {
    input: NormalizedInputGuardrail[];
    output: NormalizedOutputGuardrail[];
  } {
    const optionInput = options?.inputGuardrails
      ? normalizeInputGuardrailList(options.inputGuardrails, this.inputGuardrails.length)
      : [];
    const optionOutput = options?.outputGuardrails
      ? normalizeOutputGuardrailList(options.outputGuardrails, this.outputGuardrails.length)
      : [];

    return {
      input: [...this.inputGuardrails, ...optionInput],
      output: [...this.outputGuardrails, ...optionOutput],
    };
  }

  /**
   * Common preparation for all execution methods
   */
  private async prepareExecution(
    input: string | UIMessage[] | BaseMessage[],
    oc: OperationContext,
    options?: BaseGenerationOptions,
  ): Promise<{
    messages: BaseMessage[];
    uiMessages: UIMessage[];
    model: LanguageModel;
    tools: Record<string, any>;
    maxSteps: number;
  }> {
    // Prepare messages (system + memory + input) as UIMessages
    const buffer = this.getConversationBuffer(oc);
    const uiMessages = await this.prepareMessages(input, oc, options, buffer);

    // Convert UIMessages to ModelMessages for the LLM
    const hooks = this.getMergedHooks(options);
    let messages = convertToModelMessagesFix(uiMessages);

    if (hooks.onPrepareModelMessages) {
      const result = await hooks.onPrepareModelMessages({
        modelMessages: messages,
        uiMessages,
        agent: this,
        context: oc,
      });
      if (result?.modelMessages) {
        messages = result.modelMessages;
      }
    }

    // Calculate maxSteps (use provided option or calculate based on subagents)
    const maxSteps = options?.maxSteps ?? this.calculateMaxSteps();

    // Resolve dynamic values
    const model = await this.resolveValue(this.model, oc);
    const dynamicToolList = (await this.resolveValue(this.dynamicTools, oc)) || [];

    // Merge agent tools with option tools
    const optionToolsArray = options?.tools || [];
    const adHocTools = [...dynamicToolList, ...optionToolsArray];

    // Prepare tools with execution context
    const tools = await this.prepareTools(adHocTools, oc, maxSteps, options);

    return {
      messages,
      uiMessages,
      model,
      tools,
      maxSteps,
    };
  }

  /**
   * Create execution context
   */
  // createContext removed; use createOperationContext directly

  /**
   * Create only the OperationContext (sync)
   * Transitional helper to gradually adopt OperationContext across methods
   */
  private createOperationContext(
    input: string | UIMessage[] | BaseMessage[],
    options?: BaseGenerationOptions,
  ): OperationContext {
    const operationId = randomUUID();
    const startTimeDate = new Date();

    // Prefer reusing an existing context instance to preserve reference across calls/subagents
    const runtimeContext = toContextMap(options?.context);
    const parentContext = options?.parentOperationContext?.context;

    // Determine authoritative base context reference without cloning
    let context: Map<string | symbol, unknown>;
    if (parentContext) {
      context = parentContext;
      // Parent context should remain authoritative; only fill in missing keys from runtime then agent
      if (runtimeContext) {
        for (const [k, v] of runtimeContext.entries()) {
          if (!context.has(k)) context.set(k, v);
        }
      }
      if (this.context) {
        for (const [k, v] of this.context.entries()) {
          if (!context.has(k)) context.set(k, v);
        }
      }
    } else if (runtimeContext) {
      // Use the user-provided context instance directly
      context = runtimeContext;
      // Fill defaults from agent-level context without overriding user values
      if (this.context) {
        for (const [k, v] of this.context.entries()) {
          if (!context.has(k)) context.set(k, v);
        }
      }
    } else if (this.context) {
      // Fall back to agent-level default context instance
      context = this.context;
    } else {
      // No context provided anywhere; create a fresh one
      context = new Map();
    }

    const logger = this.getContextualLogger(options?.parentAgentId).child({
      operationId,
      userId: options?.userId,
      conversationId: options?.conversationId,
      executionId: operationId,
    });

    const observability = this.getObservability();
    const traceContext = new AgentTraceContext(observability, this.name, {
      agentId: this.id,
      agentName: this.name,
      userId: options?.userId,
      conversationId: options?.conversationId,
      operationId,
      parentSpan: options?.parentSpan,
      parentAgentId: options?.parentAgentId,
      input,
    });

    // Use parent's AbortController if available, otherwise create new one
    const abortController =
      options?.parentOperationContext?.abortController || new AbortController();

    // Setup cascade abort only if we created a new controller
    if (!options?.parentOperationContext?.abortController && options?.abortSignal) {
      const externalSignal = options.abortSignal;
      externalSignal.addEventListener("abort", () => {
        if (!abortController.signal.aborted) {
          abortController.abort(externalSignal.reason);
        }
      });
    }

    const systemContext = new Map<string | symbol, unknown>();
    systemContext.set(BUFFER_CONTEXT_KEY, new ConversationBuffer(undefined, logger));
    systemContext.set(
      QUEUE_CONTEXT_KEY,
      new MemoryPersistQueue(this.memoryManager, { debounceMs: 200, logger }),
    );

    const elicitationHandler = options?.elicitation ?? options?.parentOperationContext?.elicitation;

    return {
      operationId,
      context,
      systemContext,
      isActive: true,
      logger,
      conversationSteps: options?.parentOperationContext?.conversationSteps || [],
      abortController,
      userId: options?.userId,
      conversationId: options?.conversationId,
      parentAgentId: options?.parentAgentId,
      traceContext,
      startTime: startTimeDate,
      elicitation: elicitationHandler,
      input,
      output: undefined,
    };
  }

  private getConversationBuffer(oc: OperationContext): ConversationBuffer {
    let buffer = oc.systemContext.get(BUFFER_CONTEXT_KEY) as ConversationBuffer | undefined;
    if (!buffer) {
      buffer = new ConversationBuffer();
      oc.systemContext.set(BUFFER_CONTEXT_KEY, buffer);
    }
    return buffer;
  }

  private getMemoryPersistQueue(oc: OperationContext): MemoryPersistQueue {
    let queue = oc.systemContext.get(QUEUE_CONTEXT_KEY) as MemoryPersistQueue | undefined;
    if (!queue) {
      queue = new MemoryPersistQueue(this.memoryManager, { logger: oc.logger });
      oc.systemContext.set(QUEUE_CONTEXT_KEY, queue);
    }
    return queue;
  }

  private async flushPendingMessagesOnError(oc: OperationContext): Promise<void> {
    const buffer = this.getConversationBuffer(oc);
    const queue = this.getMemoryPersistQueue(oc);

    if (!buffer || !queue) {
      return;
    }

    try {
      await queue.flush(buffer, oc);
    } catch (error) {
      oc.logger.debug("Failed to flush pending conversation messages after error", {
        error,
        conversationId: oc.conversationId,
        userId: oc.userId,
      });
      throw error;
    }
  }

  /**
   * Get contextual logger with parent tracking
   */
  private getContextualLogger(parentAgentId?: string): Logger {
    if (parentAgentId) {
      const parentAgent = AgentRegistry.getInstance().getAgent(parentAgentId);
      if (parentAgent) {
        return this.logger.child({
          parentAgentId,
          isSubAgent: true,
          delegationDepth: this.calculateDelegationDepth(parentAgentId),
        });
      }
    }
    return this.logger;
  }

  /**
   * Calculate delegation depth
   */
  private calculateDelegationDepth(parentAgentId: string | undefined): number {
    if (!parentAgentId) return 0;

    let depth = 1;
    let currentParentId = parentAgentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) break;
      visited.add(currentParentId);

      const parentIds = AgentRegistry.getInstance().getParentAgentIds(currentParentId);
      if (parentIds.length > 0) {
        depth++;
        currentParentId = parentIds[0];
      } else {
        break;
      }
    }

    return depth;
  }

  private enqueueEvalScoring(args: EnqueueEvalScoringArgs): void {
    enqueueEvalScoringHelper(this.createEvalHost(), args);
  }

  private createEvalHost(): AgentEvalHost {
    return {
      id: this.id,
      name: this.name,
      logger: this.logger,
      evalConfig: this.evalConfig,
      getObservability: () => this.getObservability(),
    };
  }

  /**
   * Get observability instance (lazy initialization)
   */
  /**
   * Get observability instance - checks global registry on every call
   * This ensures agents can use global observability when available
   * but still work standalone with their own instance
   */
  private getObservability(): VoltAgentObservability {
    const registry = AgentRegistry.getInstance();

    // Always check global registry first (it might have been set after agent creation)
    const globalObservability = registry.getGlobalObservability();
    if (globalObservability) {
      return globalObservability;
    }

    if (!this.defaultObservability) {
      this.defaultObservability = createVoltAgentObservability({
        serviceName: `agent-${this.name}`,
      });
    }

    return this.defaultObservability;
  }

  /**
   * Check if semantic search is supported
   */
  private hasSemanticSearchSupport(): boolean {
    // Check if MemoryManager has vector support
    const memory = this.memoryManager.getMemory();
    if (memory) {
      return memory?.hasVectorSupport?.() ?? false;
    }
    return false;
  }

  /**
   * Extract user query from input for semantic search
   */
  private extractUserQuery(input: string | UIMessage[] | BaseMessage[]): string | undefined {
    if (typeof input === "string") {
      return input;
    }
    if (!Array.isArray(input) || input.length === 0) return undefined;

    const isUI = (msg: any): msg is UIMessage => Array.isArray(msg?.parts);

    const userMessages = (input as any[]).filter((msg) => msg.role === "user");
    const lastUserMessage: any = userMessages.at(-1);

    if (!lastUserMessage) return undefined;

    if (isUI(lastUserMessage)) {
      const textParts = lastUserMessage.parts
        .filter((part: any) => part.type === "text" && typeof part.text === "string")
        .map((part: any) => part.text.trim())
        .filter(Boolean);
      if (textParts.length > 0) return textParts.join(" ");
      return undefined;
    }

    // ModelMessage path
    if (typeof lastUserMessage.content === "string") {
      const content = (lastUserMessage.content as string).trim();
      return content.length > 0 ? content : undefined;
    }
    if (Array.isArray(lastUserMessage.content)) {
      const textParts = (lastUserMessage.content as any[])
        .filter((part: any) => part.type === "text" && typeof part.text === "string")
        .map((part: any) => part.text.trim())
        .filter(Boolean);
      if (textParts.length > 0) return textParts.join(" ");
    }
    return undefined;
  }

  /**
   * Prepare messages with system prompt and memory
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy message preparation pipeline
  private async prepareMessages(
    input: string | UIMessage[] | BaseMessage[],
    oc: OperationContext,
    options: BaseGenerationOptions | undefined,
    buffer: ConversationBuffer,
  ): Promise<UIMessage[]> {
    const messages: UIMessage[] = [];

    // Get system message with retriever context and working memory
    const systemMessage = await this.getSystemMessage(input, oc, options);
    if (systemMessage) {
      const systemMessagesAsUI: UIMessage[] = (() => {
        if (typeof systemMessage === "string") {
          return [
            {
              id: randomUUID(),
              role: "system",
              parts: [
                {
                  type: "text",
                  text: systemMessage,
                },
              ],
            },
          ];
        }

        if (Array.isArray(systemMessage)) {
          return convertModelMessagesToUIMessages(systemMessage);
        }

        return convertModelMessagesToUIMessages([systemMessage]);
      })();

      for (const systemUIMessage of systemMessagesAsUI) {
        messages.push(systemUIMessage);
      }

      const instructionText = systemMessagesAsUI
        .flatMap((msg) =>
          msg.parts.flatMap((part) =>
            part.type === "text" && typeof (part as any).text === "string"
              ? [(part as any).text as string]
              : [],
          ),
        )
        .join("\n\n");

      if (instructionText) {
        oc.traceContext.setInstructions(instructionText);
      }
    }

    const canIUseMemory = options?.userId && options.conversationId;

    // Load memory context if available (already returns UIMessages)
    if (canIUseMemory) {
      // Check if we should use semantic search
      // Default to true if vector support is available
      const useSemanticSearch = options?.semanticMemory?.enabled ?? this.hasSemanticSearchSupport();

      // Extract user query for semantic search if enabled
      const currentQuery = useSemanticSearch ? this.extractUserQuery(input) : undefined;

      // Prepare memory read parameters
      const semanticLimit = options?.semanticMemory?.semanticLimit ?? 5;
      const semanticThreshold = options?.semanticMemory?.semanticThreshold ?? 0.7;
      const mergeStrategy = options?.semanticMemory?.mergeStrategy ?? "append";
      const isSemanticSearch = useSemanticSearch && currentQuery;

      const traceContext = oc.traceContext;

      if (traceContext) {
        // Create unified memory read span

        const spanInput = {
          query: isSemanticSearch ? currentQuery : input,
          userId: options?.userId,
          conversationId: options?.conversationId,
        };
        const memoryReadSpan = traceContext.createChildSpan("memory.read", "memory", {
          label: isSemanticSearch ? "Semantic Memory Read" : "Memory Context Read",
          attributes: {
            "memory.operation": "read",
            "memory.semantic": isSemanticSearch,
            input: safeStringify(spanInput),
            ...(isSemanticSearch && {
              "memory.semantic.limit": semanticLimit,
              "memory.semantic.threshold": semanticThreshold,
              "memory.semantic.merge_strategy": mergeStrategy,
            }),
          },
        });

        try {
          const memoryResult = await traceContext.withSpan(memoryReadSpan, async () => {
            if (isSemanticSearch) {
              // Semantic search
              const memMessages = await this.memoryManager.getMessages(
                oc,
                oc.userId,
                oc.conversationId,
                options?.contextLimit,
                {
                  useSemanticSearch: true,
                  currentQuery,
                  semanticLimit,
                  semanticThreshold,
                  mergeStrategy,
                  traceContext: traceContext,
                  parentMemorySpan: memoryReadSpan,
                },
              );
              buffer.ingestUIMessages(memMessages, true);
              return memMessages;
            }
            // Regular memory context
            // Convert model messages to UI for memory context if needed
            const inputForMemory =
              typeof input === "string"
                ? input
                : Array.isArray(input) && (input as any[])[0]?.parts
                  ? (input as UIMessage[])
                  : convertModelMessagesToUIMessages(input as BaseMessage[]);

            const result = await this.memoryManager.prepareConversationContext(
              oc,
              inputForMemory,
              oc.userId,
              oc.conversationId,
              options?.contextLimit,
            );

            // Update conversation ID
            oc.conversationId = result.conversationId;

            buffer.ingestUIMessages(result.messages, true);

            return result.messages;
          });

          const retrievedMessagesCount = Array.isArray(memoryResult) ? memoryResult.length : 0;

          traceContext.endChildSpan(memoryReadSpan, "completed", {
            output: memoryResult,
            attributes: {
              "memory.message_count": retrievedMessagesCount,
            },
          });

          // Ensure conversation ID exists for semantic search
          if (isSemanticSearch && !oc.conversationId) {
            oc.conversationId = randomUUID();
          }

          // Add memory messages
          messages.push(...memoryResult);

          // When using semantic search, also persist the current input in background
          // so user messages are stored and embedded consistently.
          if (isSemanticSearch && oc.userId && oc.conversationId) {
            try {
              const inputForMemory =
                typeof input === "string"
                  ? input
                  : Array.isArray(input) && (input as any[])[0]?.parts
                    ? (input as UIMessage[])
                    : convertModelMessagesToUIMessages(input as BaseMessage[]);
              this.memoryManager.queueSaveInput(oc, inputForMemory, oc.userId, oc.conversationId);
            } catch (_e) {
              // Non-fatal: background persistence should not block message preparation
            }
          }
        } catch (error) {
          traceContext.endChildSpan(memoryReadSpan, "error", {
            error: error as Error,
          });
          throw error;
        }
      }
    }

    // Add current input
    if (typeof input === "string") {
      messages.push({
        id: randomUUID(),
        role: "user",
        parts: [{ type: "text", text: input }],
      });
    } else if (Array.isArray(input)) {
      const first = (input as any[])[0];
      if (first && Array.isArray(first.parts)) {
        messages.push(...(input as UIMessage[]));
      } else {
        messages.push(...convertModelMessagesToUIMessages(input as BaseMessage[]));
      }
    }

    // Sanitize messages before passing them to the model-layer hooks
    const sanitizedMessages = sanitizeMessagesForModel(messages);

    // Allow hooks to modify sanitized messages (while exposing the raw set when needed)
    const hooks = this.getMergedHooks(options);
    if (hooks.onPrepareMessages) {
      const result = await hooks.onPrepareMessages({
        messages: sanitizedMessages,
        rawMessages: messages,
        agent: this,
        context: oc,
      });
      return result?.messages || sanitizedMessages;
    }

    return sanitizedMessages;
  }

  /**
   * Get system message with dynamic instructions and retriever context
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy system message assembly
  private async getSystemMessage(
    input: string | UIMessage[] | BaseMessage[],
    oc: OperationContext,
    options?: BaseGenerationOptions,
  ): Promise<BaseMessage | BaseMessage[]> {
    // Resolve dynamic instructions
    const promptHelper = VoltOpsClientClass.createPromptHelperWithFallback(
      this.id,
      this.name,
      typeof this.instructions === "function" ? "" : this.instructions,
      this.voltOpsClient,
    );

    const dynamicValueOptions: DynamicValueOptions = {
      context: oc.context,
      prompts: promptHelper,
    };

    const resolvedInstructions = await this.resolveValue(
      this.instructions,
      oc,
      dynamicValueOptions,
    );

    // Add VoltOps prompt metadata to OpenTelemetry trace if available
    if (
      typeof resolvedInstructions === "object" &&
      "type" in resolvedInstructions &&
      "metadata" in resolvedInstructions
    ) {
      const promptContent = resolvedInstructions as PromptContent;
      if (promptContent.metadata && oc.traceContext) {
        const rootSpan = oc.traceContext.getRootSpan();
        const metadata = promptContent.metadata;

        // Add each metadata field as a separate attribute
        if (metadata.prompt_id) {
          rootSpan.setAttribute("prompt.id", metadata.prompt_id);
        }
        if (metadata.prompt_version_id) {
          rootSpan.setAttribute("prompt.version_id", metadata.prompt_version_id);
        }
        if (metadata.name) {
          rootSpan.setAttribute("prompt.name", metadata.name);
        }
        if (metadata.version !== undefined) {
          rootSpan.setAttribute("prompt.version", metadata.version);
        }
        if (metadata.labels && metadata.labels.length > 0) {
          rootSpan.setAttribute("prompt.labels", safeStringify(metadata.labels));
        }
        if (metadata.tags && metadata.tags.length > 0) {
          rootSpan.setAttribute("prompt.tags", safeStringify(metadata.tags));
        }
        if (metadata.config) {
          rootSpan.setAttribute("prompt.config", safeStringify(metadata.config));
        }
      }
    }

    // Get retriever context if available
    let retrieverContext: string | null = null;
    if (this.retriever && input) {
      retrieverContext = await this.getRetrieverContext(input, oc);
    }

    // Get working memory instructions if available
    let workingMemoryContext: string | null = null;
    if (this.hasWorkingMemorySupport() && options?.conversationId) {
      const memory = this.memoryManager.getMemory();

      if (memory) {
        // Get full working memory instructions with current data
        const workingMemoryInstructions = await memory.getWorkingMemoryInstructions({
          conversationId: options.conversationId,
          userId: options.userId,
        });

        if (workingMemoryInstructions) {
          workingMemoryContext = `\n\n${workingMemoryInstructions}`;
        }

        // Add working memory attributes to span for observability
        if (oc.traceContext) {
          const rootSpan = oc.traceContext.getRootSpan();

          // Get the raw working memory content
          const workingMemoryContent = await memory.getWorkingMemory({
            conversationId: options.conversationId,
            userId: options.userId,
          });

          if (workingMemoryContent) {
            rootSpan.setAttribute("agent.workingMemory.content", workingMemoryContent);
            rootSpan.setAttribute("agent.workingMemory.enabled", true);

            // Detect format
            const format = memory.getWorkingMemoryFormat ? memory.getWorkingMemoryFormat() : null;
            rootSpan.setAttribute("agent.workingMemory.format", format || "text");

            // Add timestamp
            rootSpan.setAttribute("agent.workingMemory.lastUpdated", new Date().toISOString());
          } else {
            rootSpan.setAttribute("agent.workingMemory.enabled", true);
          }
        }
      }
    } else if (oc.traceContext) {
      // Working memory not supported/configured
      const rootSpan = oc.traceContext.getRootSpan();
      rootSpan.setAttribute("agent.workingMemory.enabled", false);
    }

    // Handle different instruction types
    if (typeof resolvedInstructions === "object" && "type" in resolvedInstructions) {
      const promptContent = resolvedInstructions as PromptContent;

      if (promptContent.type === "chat" && promptContent.messages) {
        const messages = [...promptContent.messages];

        // Add retriever context and working memory to last system message if available
        const additionalContext = [
          retrieverContext ? `Relevant Context:\n${retrieverContext}` : null,
          workingMemoryContext,
        ]
          .filter(Boolean)
          .join("\n\n");

        if (additionalContext) {
          const lastSystemIndex = messages
            .map((m, i) => ({ message: m, index: i }))
            .filter(({ message }) => message.role === "system")
            .pop()?.index;

          if (lastSystemIndex !== undefined) {
            const existingMessage = messages[lastSystemIndex];
            messages[lastSystemIndex] = {
              ...existingMessage,
              content: `${existingMessage.content}\n\n${additionalContext}`,
            } as typeof existingMessage;
          } else {
            messages.push({
              role: "system",
              content: additionalContext,
            } as SystemModelMessage);
          }
        }

        return messages;
      }

      if (promptContent.type === "text") {
        let content = promptContent.text || "";

        // Add toolkit instructions
        content = this.addToolkitInstructions(content);

        // Add markdown instruction
        if (this.markdown) {
          content = `${content}\n\nUse markdown to format your answers.`;
        }

        // Add retriever context
        if (retrieverContext) {
          content = `${content}\n\nRelevant Context:\n${retrieverContext}`;
        }

        // Add working memory context
        if (workingMemoryContext) {
          content = `${content}${workingMemoryContext}`;
        }

        // Add supervisor instructions if needed
        if (this.subAgentManager.hasSubAgents()) {
          const agentsMemory = await this.prepareAgentsMemory(oc);
          content = this.subAgentManager.generateSupervisorSystemMessage(
            content,
            agentsMemory,
            this.supervisorConfig,
          );
        }

        return {
          role: "system",
          content: `You are ${this.name}. ${content}`,
        };
      }
    }

    // Default string instructions
    let content = typeof resolvedInstructions === "string" ? resolvedInstructions : "";

    // Add toolkit instructions
    content = this.addToolkitInstructions(content);

    // Add markdown instruction
    if (this.markdown) {
      content = `${content}\n\nUse markdown to format your answers.`;
    }

    // Add retriever context
    if (retrieverContext) {
      content = `${content}\n\nRelevant Context:\n${retrieverContext}`;
    }

    // Add working memory context
    if (workingMemoryContext) {
      content = `${content}${workingMemoryContext}`;
    }

    // Add supervisor instructions if needed
    if (this.subAgentManager.hasSubAgents()) {
      const agentsMemory = await this.prepareAgentsMemory(oc);
      content = this.subAgentManager.generateSupervisorSystemMessage(
        content,
        agentsMemory,
        this.supervisorConfig,
      );
    }

    return {
      role: "system",
      content: `You are ${this.name}. ${content}`,
    };
  }

  /**
   * Add toolkit instructions
   */
  private addToolkitInstructions(baseInstructions: string): string {
    const toolkits = this.toolManager.getToolkits();
    let toolInstructions = "";

    for (const toolkit of toolkits) {
      if (toolkit.addInstructions && toolkit.instructions) {
        toolInstructions += `\n\n${toolkit.instructions}`;
      }
    }

    return baseInstructions + toolInstructions;
  }

  /**
   * Prepare agents memory for supervisor
   */
  private async prepareAgentsMemory(oc: OperationContext): Promise<string> {
    try {
      const subAgents = this.subAgentManager.getSubAgents();
      if (subAgents.length === 0) return "";

      // Get recent conversation steps
      const steps = oc.conversationSteps || [];
      const formattedMemory = steps
        .filter((step) => step.role !== "system" && step.role === "assistant")
        .map((step) => `${step.role}: ${step.content}`)
        .join("\n\n");

      return formattedMemory || "No previous agent interactions found.";
    } catch (error) {
      this.logger.warn("Error preparing agents memory", { error });
      return "Error retrieving agent history.";
    }
  }

  /**
   * Get retriever context
   */
  private async getRetrieverContext(
    input: string | UIMessage[] | BaseMessage[],
    oc: OperationContext,
  ): Promise<string | null> {
    if (!this.retriever) return null;

    const startTime = Date.now();
    const retrieverLogger = oc.logger.child({
      operation: "retriever",
      retrieverId: this.retriever.tool.name,
    });

    retrieverLogger.debug(buildAgentLogMessage(this.name, ActionType.START, "Retrieving context"), {
      event: LogEvents.RETRIEVER_SEARCH_STARTED,
      input,
    });

    // Create OpenTelemetry span for retriever using TraceContext
    const retrieverSpan = oc.traceContext.createChildSpan("retriever.search", "retriever", {
      label: this.retriever.tool.name || "Retriever",
      attributes: {
        "retriever.name": this.retriever.tool.name || "Retriever",
        input: typeof input === "string" ? input : safeStringify(input),
      },
    });

    // Event tracking now handled by OpenTelemetry spans

    try {
      // Prepare retriever input: pass through if ModelMessages, convert if UIMessage, or string
      const retrieverInput =
        typeof input === "string"
          ? input
          : Array.isArray(input) && (input as any[])[0]?.content !== undefined
            ? (input as BaseMessage[])
            : convertToModelMessagesFix(input as UIMessage[]);

      // Execute retriever with the span context
      const retrievedContent = await oc.traceContext.withSpan(retrieverSpan, async () => {
        if (!this.retriever) return null;
        return await this.retriever.retrieve(retrieverInput, {
          context: oc.context,
          logger: retrieverLogger,
        });
      });

      if (retrievedContent?.trim()) {
        const documentCount = retrievedContent
          .split("\n")
          .filter((line: string) => line.trim()).length;

        retrieverLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.COMPLETE,
            `Retrieved ${documentCount} documents`,
          ),
          {
            event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
            documentCount,
            duration: Date.now() - startTime,
          },
        );

        // Event tracking now handled by OpenTelemetry spans

        // End OpenTelemetry span successfully
        oc.traceContext?.endChildSpan(retrieverSpan, "completed", {
          output: retrievedContent,
          attributes: {
            "retriever.document_count": documentCount,
          },
        });

        return retrievedContent;
      }

      // End span if no content retrieved
      oc.traceContext?.endChildSpan(retrieverSpan, "completed", {
        output: null,
        attributes: {
          "retriever.document_count": 0,
        },
      });

      return null;
    } catch (error) {
      // Event tracking now handled by OpenTelemetry spans

      // End OpenTelemetry span with error
      oc.traceContext.endChildSpan(retrieverSpan, "error", {
        error: error as Error,
      });

      retrieverLogger.error(
        buildAgentLogMessage(
          this.name,
          ActionType.ERROR,
          `Retriever failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
        {
          event: LogEvents.RETRIEVER_SEARCH_FAILED,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        },
      );

      this.logger.warn("Failed to retrieve context", { error, agentId: this.id });
      return null;
    }
  }

  /**
   * Resolve dynamic value
   */
  private async resolveValue<T>(
    value: T | DynamicValue<T>,
    oc: OperationContext,
    options?: DynamicValueOptions,
  ): Promise<T> {
    if (typeof value === "function") {
      const dynamicValue = value as DynamicValue<T>;
      const resolveOptions: DynamicValueOptions =
        options ||
        (this.prompts
          ? {
              context: oc.context,
              prompts: this.prompts,
            }
          : {
              context: oc.context,
              prompts: {
                getPrompt: async () => ({ type: "text" as const, text: "" }),
              },
            });
      return await dynamicValue(resolveOptions);
    }
    return value;
  }

  /**
   * Prepare tools with execution context
   */
  private async prepareTools(
    adHocTools: (BaseTool | Toolkit)[],
    oc: OperationContext,
    maxSteps: number,
    options?: BaseGenerationOptions,
  ): Promise<Record<string, any>> {
    const baseTools = this.toolManager.combineStaticAndRuntimeBaseTools(adHocTools);

    // Add delegate tool if we have subagents
    if (this.subAgentManager.hasSubAgents()) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this as any, // Type workaround
        currentHistoryEntryId: oc.operationId,
        operationContext: oc,
        maxSteps: maxSteps,
        conversationId: options?.conversationId,
        userId: options?.userId,
      });
      baseTools.push(delegateTool);
    }

    // Add working memory tools if Memory V2 with working memory is configured
    const workingMemoryTools = this.createWorkingMemoryTools(options);
    if (workingMemoryTools.length > 0) {
      baseTools.push(...workingMemoryTools);
    }

    // Convert to AI SDK tools with context injection
    const aiTools = this.convertTools(baseTools, oc, options);

    // Pass through the provider tools untouched as they are
    const providerTools = this.toolManager.getProviderTools();
    for (const tool of providerTools) {
      aiTools[tool.name] = tool;
    }

    return aiTools;
  }

  /**
   * Validate tool output against optional output schema.
   */
  private async validateToolOutput(result: any, tool: Tool<any, any>): Promise<any> {
    if (!tool.outputSchema?.safeParse) {
      return result;
    }

    // Validate output if schema provided
    const parseResult = tool.outputSchema.safeParse(result);
    if (!parseResult.success) {
      const error = new Error(`Output validation failed: ${parseResult.error.message}`);
      Object.assign(error, {
        validationErrors: parseResult.error.errors,
        actualOutput: result,
      });

      throw error;
    }

    return parseResult.data;
  }

  /**
   * Convert VoltAgent tools to AI SDK format with context injection
   */
  private convertTools(
    tools: Tool<any, any>[],
    oc: OperationContext,
    options?: BaseGenerationOptions,
  ): Record<string, any> {
    const aiTools: Record<string, any> = {};
    const hooks = this.getMergedHooks(options);

    for (const tool of tools) {
      aiTools[tool.name] = {
        description: tool.description,
        inputSchema: tool.parameters, // AI SDK will convert this to JSON Schema internally
      };

      if (tool.isClientSide()) {
        continue;
      }

      aiTools[tool.name] = {
        ...aiTools[tool.name],
        execute: async (args: any) => {
          // Event tracking now handled by OpenTelemetry spans

          // Create tool span using TraceContext
          const toolSpan = oc.traceContext.createChildSpan(`tool.execution:${tool.name}`, "tool", {
            label: tool.name,
            attributes: {
              "tool.name": tool.name,
              "tool.call.id": randomUUID(),
              input: args ? safeStringify(args) : undefined,
            },
            kind: SpanKind.CLIENT,
          });

          // Push execution metadata into systemContext for tools to consume
          oc.systemContext.set("agentId", this.id);
          oc.systemContext.set("historyEntryId", oc.operationId);
          oc.systemContext.set("parentToolSpan", toolSpan);

          // Execute tool and handle span lifecycle
          return await oc.traceContext.withSpan(toolSpan, async () => {
            try {
              // Call tool start hook - can throw ToolDeniedError
              await hooks.onToolStart?.({ agent: this, tool, context: oc, args });

              // Execute tool with OperationContext directly
              if (!tool.execute) {
                throw new Error(`Tool ${tool.name} does not have "execute" method`);
              }
              const result = await tool.execute(args, oc);
              const validatedResult = await this.validateToolOutput(result, tool);

              // End OTEL span
              toolSpan.setAttribute("output", safeStringify(result));
              toolSpan.setStatus({ code: SpanStatusCode.OK });
              toolSpan.end();

              // Event tracking now handled by OpenTelemetry spans

              // Call tool end hook
              await hooks.onToolEnd?.({
                agent: this,
                tool,
                output: validatedResult,
                error: undefined,
                context: oc,
              });

              return result;
            } catch (e) {
              const error = e instanceof Error ? e : new Error(String(e));
              //POJO error
              const errorResult = { error: true, ...error };

              toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
              toolSpan.recordException(error);
              toolSpan.end();

              await hooks.onToolEnd?.({
                agent: this,
                tool,
                output: undefined,
                error: errorResult as any,
                context: oc,
              });

              if (isToolDeniedError(e)) {
                oc.abortController.abort(e);
              }

              return errorResult;
            } finally {
              // End the span if it was created
              oc.traceContext.endChildSpan(toolSpan, "completed", {});
            }
          }); // End of withSpan
        }, // End of execute function
      };
    }

    return aiTools;
  }

  /**
   * Create step handler for memory and hooks
   */
  private createStepHandler(oc: OperationContext, options?: BaseGenerationOptions) {
    const buffer = this.getConversationBuffer(oc);

    return async (event: StepResult<ToolSet>) => {
      // Instead of saving immediately, collect steps in context for batch processing in onFinish
      if (event.content && Array.isArray(event.content)) {
        // Store the step content in context for later processing
        if (!oc.systemContext.has("conversationSteps")) {
          oc.systemContext.set("conversationSteps", []);
        }
        const conversationSteps = oc.systemContext.get(
          "conversationSteps",
        ) as StepResult<ToolSet>[];
        conversationSteps.push(event);

        // Log each content part
        for (const part of event.content) {
          if (part.type === "text") {
            oc.logger.debug("Step: Text generated", {
              event: LogEvents.AGENT_STEP_TEXT,
              textPreview: part.text.substring(0, 100),
              length: part.text.length,
            });
          } else if (part.type === "reasoning") {
            oc.logger.debug("Step: Reasoning generated", {
              event: LogEvents.AGENT_STEP_TEXT,
              textPreview: part.text.substring(0, 100),
              length: part.text.length,
            });
          } else if (part.type === "tool-call") {
            oc.logger.debug(`Step: Calling tool '${part.toolName}'`, {
              event: LogEvents.AGENT_STEP_TOOL_CALL,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              arguments: part.input,
            });

            oc.logger.debug(
              buildAgentLogMessage(this.name, ActionType.TOOL_CALL, `Executing ${part.toolName}`),
              {
                event: LogEvents.TOOL_EXECUTION_STARTED,
                toolName: part.toolName,
                toolCallId: part.toolCallId,
                args: part.input,
              },
            );
          } else if (part.type === "tool-result") {
            oc.logger.debug(`Step: Tool '${part.toolName}' completed`, {
              event: LogEvents.AGENT_STEP_TOOL_RESULT,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              result: part.output,
              hasError: Boolean(
                part.output && typeof part.output === "object" && "error" in part.output,
              ),
            });
          } else if (part.type === "tool-error") {
            oc.logger.debug(`Step: Tool '${part.toolName}' error`, {
              event: LogEvents.AGENT_STEP_TOOL_RESULT,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              error: part.error,
              hasError: true,
            });
          }
        }
      }

      const responseMessages = event.response?.messages as ModelMessage[] | undefined;
      if (responseMessages && responseMessages.length > 0) {
        buffer.addModelMessages(responseMessages, "response");
      }

      // Call hooks
      const hooks = this.getMergedHooks(options);
      await hooks.onStepFinish?.({ agent: this, step: event, context: oc });
    };
  }

  /**
   * Add step to history - now only tracks in conversation steps
   */
  private async addStepToHistory(step: StepWithContent, oc: OperationContext): Promise<void> {
    // Track in conversation steps
    if (oc.conversationSteps) {
      oc.conversationSteps.push(step);
    }
  }

  /**
   * Merge agent hooks with options hooks
   */
  private getMergedHooks(options?: { hooks?: AgentHooks }): AgentHooks {
    if (!options?.hooks) {
      return this.hooks;
    }

    return {
      onStart: async (...args) => {
        await options.hooks?.onStart?.(...args);
        await this.hooks.onStart?.(...args);
      },
      onEnd: async (...args) => {
        await options.hooks?.onEnd?.(...args);
        await this.hooks.onEnd?.(...args);
      },
      onError: async (...args) => {
        await options.hooks?.onError?.(...args);
        await this.hooks.onError?.(...args);
      },
      onHandoff: async (...args) => {
        await options.hooks?.onHandoff?.(...args);
        await this.hooks.onHandoff?.(...args);
      },
      onToolStart: async (...args) => {
        await options.hooks?.onToolStart?.(...args);
        await this.hooks.onToolStart?.(...args);
      },
      onToolEnd: async (...args) => {
        await options.hooks?.onToolEnd?.(...args);
        await this.hooks.onToolEnd?.(...args);
      },
      onStepFinish: async (...args) => {
        await options.hooks?.onStepFinish?.(...args);
        await this.hooks.onStepFinish?.(...args);
      },
      onPrepareMessages: options.hooks?.onPrepareMessages || this.hooks.onPrepareMessages,
      onPrepareModelMessages:
        options.hooks?.onPrepareModelMessages || this.hooks.onPrepareModelMessages,
    };
  }

  /**
   * Setup abort signal listener
   */
  private setupAbortSignalListener(oc: OperationContext): void {
    if (!oc.abortController) return;

    const signal = oc.abortController.signal;
    signal.addEventListener("abort", async () => {
      // Mark operation as inactive
      oc.isActive = false;

      if (isClientHTTPError(signal.reason)) {
        oc.cancellationError = signal.reason;
      } else {
        const abortReason = match(signal.reason)
          .with(P.string, (reason) => reason)
          .with({ message: P.string }, (reason) => reason.message)
          .otherwise(() => "Operation cancelled");
        oc.cancellationError = createAbortError(abortReason);
      }
      // Track cancellation in OpenTelemetry
      if (oc.traceContext) {
        const rootSpan = oc.traceContext.getRootSpan();
        rootSpan.setAttribute("agent.state", "cancelled");
        rootSpan.setAttribute("cancelled", true);
        rootSpan.setAttribute("cancellation.reason", oc.cancellationError.message);
        rootSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: oc.cancellationError.message,
        });
        rootSpan.recordException(oc.cancellationError);
        rootSpan.end();
      }

      // Call onEnd hook with cancellation error
      const hooks = this.getMergedHooks();
      await hooks.onEnd?.({
        conversationId: oc.conversationId || "",
        agent: this,
        output: undefined,
        error: oc.cancellationError,
        context: oc,
      });
    });
  }

  /**
   * Handle errors
   */
  private async handleError(
    error: Error,
    oc: OperationContext,
    options?: BaseGenerationOptions,
    startTime?: number,
  ): Promise<never> {
    // Check if cancelled
    if (!oc.isActive && oc.cancellationError) {
      throw oc.cancellationError;
    }

    const voltagentError = createVoltAgentError(error);

    oc.traceContext.end("error", error);

    // Call hooks
    const hooks = this.getMergedHooks(options);
    await hooks.onEnd?.({
      conversationId: oc.conversationId || "",
      agent: this,
      output: undefined,
      error: voltagentError,
      context: oc,
    });
    await hooks.onError?.({ agent: this, error: voltagentError, context: oc });

    // Log error
    oc.logger.error("Generation failed", {
      event: LogEvents.AGENT_GENERATION_FAILED,
      duration: startTime ? Date.now() - startTime : undefined,
      error: {
        message: voltagentError.message,
        code: voltagentError.code,
        stage: voltagentError.stage,
      },
    });

    throw error;
  }

  // ============================================================================
  // Public Utility Methods
  // ============================================================================

  /**
   * Calculate max steps based on SubAgents
   */
  private calculateMaxSteps(): number {
    return this.subAgentManager.calculateMaxSteps(this.maxSteps);
  }

  /**
   * Get the model name
   */
  public getModelName(): string {
    if (typeof this.model === "function") {
      return "dynamic";
    }
    if (typeof this.model === "string") {
      return this.model;
    }
    return this.model.modelId || "unknown";
  }

  /**
   * Get full agent state
   */
  public getFullState(): AgentFullState {
    const cloneRecord = (value: unknown): Record<string, unknown> | null => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
      }
      const result = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(
          ([, entryValue]) => typeof entryValue !== "function",
        ),
      );
      return Object.keys(result).length > 0 ? result : null;
    };

    const slugifyGuardrailIdentifier = (value: string): string => {
      return (
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "guardrail"
      );
    };

    const mapGuardrails = (
      guardrailList: Array<NormalizedInputGuardrail | NormalizedOutputGuardrail>,
      direction: "input" | "output",
    ): AgentGuardrailState[] => {
      return guardrailList.map((guardrail, index) => {
        const baseIdentifier = guardrail.id ?? guardrail.name ?? `${direction}-${index + 1}`;
        const slug = slugifyGuardrailIdentifier(String(baseIdentifier));
        const metadata = cloneRecord(guardrail.metadata ?? null);

        const state: AgentGuardrailState = {
          id: guardrail.id,
          name: guardrail.name,
          direction,
          node_id: createNodeId(NodeType.GUARDRAIL, `${direction}-${slug || index + 1}`, this.id),
        };

        if (guardrail.description) {
          state.description = guardrail.description;
        }
        if (guardrail.severity) {
          state.severity = guardrail.severity;
        }
        if (guardrail.tags && guardrail.tags.length > 0) {
          state.tags = [...guardrail.tags];
        }
        if (metadata) {
          state.metadata = metadata;
        }

        return state;
      });
    };

    const guardrails = {
      input: mapGuardrails(this.inputGuardrails, "input"),
      output: mapGuardrails(this.outputGuardrails, "output"),
    };

    const scorerEntries = Object.entries(this.evalConfig?.scorers ?? {});
    const scorers =
      scorerEntries.length > 0
        ? scorerEntries.map(([key, scorerConfig]) => {
            const definition =
              typeof scorerConfig.scorer === "object" && scorerConfig.scorer !== null
                ? (scorerConfig.scorer as {
                    id?: string;
                    name?: string;
                    metadata?: unknown;
                    sampling?: SamplingPolicy;
                  })
                : undefined;
            const scorerId = String(scorerConfig.id ?? definition?.id ?? key);
            const scorerName =
              (typeof definition?.name === "string" && definition.name.trim().length > 0
                ? definition.name
                : undefined) ?? scorerId;
            const sampling =
              scorerConfig.sampling ?? definition?.sampling ?? this.evalConfig?.sampling;
            const metadata = cloneRecord(definition?.metadata ?? null);
            const params =
              typeof scorerConfig.params === "function" ? null : cloneRecord(scorerConfig.params);

            return {
              key,
              id: scorerId,
              name: scorerName,
              sampling,
              metadata,
              params,
              node_id: createNodeId(NodeType.SCORER, scorerId, this.id),
            };
          })
        : [];

    return {
      id: this.id,
      name: this.name,
      instructions:
        typeof this.instructions === "function" ? "Dynamic instructions" : this.instructions,
      status: "idle",
      model: this.getModelName(),
      node_id: createNodeId(NodeType.AGENT, this.id),

      tools: this.toolManager.getTools().map((tool) => ({
        ...tool,
        node_id: createNodeId(NodeType.TOOL, tool.name, this.id),
      })),

      subAgents: this.subAgentManager.getSubAgentDetails().map((subAgent) => ({
        ...subAgent,
        node_id: createNodeId(NodeType.SUBAGENT, subAgent.id),
      })),

      memory: {
        ...this.memoryManager.getMemoryState(),
        node_id: createNodeId(NodeType.MEMORY, this.id),
        // Add vector DB and embedding info if Memory V2 is configured
        vectorDB:
          this.memory && typeof this.memory === "object" && this.memory.getVectorAdapter?.()
            ? {
                enabled: true,
                adapter: this.memory.getVectorAdapter()?.constructor.name || "Unknown",
                dimension: this.memory.getEmbeddingAdapter?.()?.getDimensions() || 0,
                status: "idle",
                node_id: createNodeId(NodeType.VECTOR, this.id),
              }
            : null,
        embeddingModel:
          this.memory && typeof this.memory === "object" && this.memory.getEmbeddingAdapter?.()
            ? {
                enabled: true,
                model: this.memory.getEmbeddingAdapter()?.getModelName() || "unknown",
                dimension: this.memory.getEmbeddingAdapter()?.getDimensions() || 0,
                status: "idle",
                node_id: createNodeId(NodeType.EMBEDDING, this.id),
              }
            : null,
      },

      retriever: this.retriever
        ? {
            name: this.retriever.tool.name,
            description: this.retriever.tool.description,
            status: "idle",
            node_id: createNodeId(NodeType.RETRIEVER, this.retriever.tool.name, this.id),
          }
        : null,
      scorers,
      guardrails:
        guardrails.input.length > 0 || guardrails.output.length > 0 ? guardrails : undefined,
    };
  }

  /**
   * Add tools or toolkits to the agent
   */
  public addTools(tools: (Tool<any, any> | Toolkit)[]): { added: (Tool<any, any> | Toolkit)[] } {
    this.toolManager.addItems(tools);
    return { added: tools };
  }

  /**
   * Remove one or more tools by name
   * @param toolNames - Array of tool names to remove
   * @returns Object containing successfully removed tool names
   */
  public removeTools(toolNames: string[]): { removed: string[] } {
    const removed: string[] = [];
    for (const name of toolNames) {
      if (this.toolManager.removeTool(name)) {
        removed.push(name);
      }
    }

    this.logger.debug(`Removed ${removed.length} tools`, {
      removed,
      requested: toolNames,
    });

    return { removed };
  }

  /**
   * Remove a toolkit by name
   * @param toolkitName - Name of the toolkit to remove
   * @returns true if the toolkit was removed, false if it wasn't found
   */
  public removeToolkit(toolkitName: string): boolean {
    const result = this.toolManager.removeToolkit(toolkitName);

    if (result) {
      this.logger.debug(`Removed toolkit: ${toolkitName}`);
    } else {
      this.logger.debug(`Toolkit not found: ${toolkitName}`);
    }

    return result;
  }

  /**
   * Add a sub-agent
   */
  public addSubAgent(agentConfig: SubAgentConfig): void {
    this.subAgentManager.addSubAgent(agentConfig);

    // Add delegate tool if this is the first sub-agent
    if (this.subAgentManager.getSubAgents().length === 1) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this as any,
      });
      this.toolManager.addTool(delegateTool);
    }
  }

  /**
   * Remove a sub-agent
   */
  public removeSubAgent(agentId: string): void {
    this.subAgentManager.removeSubAgent(agentId);

    // Remove delegate tool if no sub-agents left
    if (this.subAgentManager.getSubAgents().length === 0) {
      this.toolManager.removeTool("delegate_task");
    }
  }

  /**
   * Get all tools
   */
  public getTools() {
    return this.toolManager.getTools();
  }

  /**
   * Get tools for API
   */
  public getToolsForApi() {
    return this.toolManager.getToolsForApi();
  }

  /**
   * Get all sub-agents
   */
  public getSubAgents(): SubAgentConfig[] {
    return this.subAgentManager.getSubAgents();
  }

  /**
   * Unregister this agent
   */
  public unregister(): void {
    // Agent unregistration tracked via OpenTelemetry
  }

  /**
   * Check if telemetry is configured
   * Returns true if VoltOpsClient with observability is configured
   */
  public isTelemetryConfigured(): boolean {
    // Check if observability is configured
    const observability = this.getObservability();
    if (!observability) {
      return false;
    }

    // Check if VoltOpsClient is available for remote export
    // Priority: Agent's own VoltOpsClient, then global one
    const voltOpsClient =
      this.voltOpsClient || AgentRegistry.getInstance().getGlobalVoltOpsClient();

    return voltOpsClient !== undefined;
  }

  /**
   * Get memory manager
   */
  public getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * Get tool manager
   */
  public getToolManager(): ToolManager {
    return this.toolManager;
  }

  /**
   * Get Memory instance if available
   */
  public getMemory(): Memory | false | undefined {
    if (this.memory === false) {
      return false;
    }

    return this.memory ?? this.memoryManager.getMemory();
  }

  /**
   * Convert this agent into a tool that can be used by other agents.
   * This enables supervisor/coordinator patterns where one agent can delegate
   * work to other specialized agents.
   *
   * @param options - Optional configuration for the tool
   * @param options.name - Custom name for the tool (defaults to `${agent.id}_tool`)
   * @param options.description - Custom description (defaults to agent's purpose or auto-generated)
   * @param options.parametersSchema - Custom input schema (defaults to { prompt: string })
   *
   * @returns A Tool instance that executes this agent
   *
   * @example
   * ```typescript
   * const writerAgent = new Agent({
   *   id: "writer",
   *   purpose: "Writes blog posts",
   *   // ... other config
   * });
   *
   * const editorAgent = new Agent({
   *   id: "editor",
   *   purpose: "Edits content",
   *   // ... other config
   * });
   *
   * // Supervisor agent that uses both as tools
   * const supervisorAgent = new Agent({
   *   id: "supervisor",
   *   instructions: "First call writer, then editor",
   *   tools: [
   *     writerAgent.toTool(),
   *     editorAgent.toTool()
   *   ]
   * });
   * ```
   */
  public toTool(options?: {
    name?: string;
    description?: string;
    parametersSchema?: z.ZodObject<any>;
  }): Tool<any, any> {
    const toolName = options?.name || `${this.id}_tool`;
    const toolDescription =
      options?.description || this.purpose || `Executes the ${this.name} agent to complete a task`;

    const parametersSchema =
      options?.parametersSchema ||
      z.object({
        prompt: z.string().describe("The prompt or task to send to the agent"),
      });

    return createTool({
      name: toolName,
      description: toolDescription,
      parameters: parametersSchema,
      execute: async (args, context) => {
        // Extract the prompt from args
        const prompt = (args as any).prompt || args;

        // Generate response using this agent
        const result = await this.generateText(prompt, {
          // Pass through the operation context if available
          parentOperationContext: context,
          conversationId: context?.conversationId,
          userId: context?.userId,
        });

        // Return the text result
        return {
          text: result.text,
          usage: result.usage,
        };
      },
    });
  }

  /**
   * Check if working memory is supported
   */
  private hasWorkingMemorySupport(): boolean {
    const memory = this.memoryManager.getMemory();
    return memory?.hasWorkingMemorySupport?.() ?? false;
  }

  /**
   * Set usage information on trace context
   * Maps AI SDK's LanguageModelUsage to trace context format
   */
  private setTraceContextUsage(traceContext: AgentTraceContext, usage?: LanguageModelUsage): void {
    if (!usage) return;

    traceContext.setUsage({
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cachedTokens: usage.cachedInputTokens,
      reasoningTokens: usage.reasoningTokens,
    });
  }

  /**
   * Create working memory tools if configured
   */
  private createWorkingMemoryTools(options?: BaseGenerationOptions): Tool<any, any>[] {
    if (!this.hasWorkingMemorySupport()) {
      return [];
    }

    const memoryManager = this.memoryManager as unknown as MemoryManager;
    const memory = memoryManager.getMemory();

    if (!memory) {
      return [];
    }

    const tools: Tool<any, any>[] = [];

    // Get Working Memory tool
    tools.push(
      createTool({
        name: "get_working_memory",
        description: "Get the current working memory content for this conversation or user",
        parameters: z.object({}),
        execute: async () => {
          const content = await memory.getWorkingMemory({
            conversationId: options?.conversationId,
            userId: options?.userId,
          });
          return content || "No working memory content found.";
        },
      }),
    );

    // Update Working Memory tool
    const schema = memory.getWorkingMemorySchema();
    const template = memory.getWorkingMemoryTemplate();

    // Build parameters based on schema
    const baseParams = schema
      ? { content: schema }
      : { content: z.string().describe("The content to store in working memory") };

    const modeParam = {
      mode: z
        .enum(["replace", "append"])
        .default("append")
        .describe(
          "How to update: 'append' (default - safely merge with existing) or 'replace' (complete overwrite - DELETES other fields!)",
        ),
    };

    tools.push(
      createTool({
        name: "update_working_memory",
        description: template
          ? `Update working memory. Default mode is 'append' which safely merges new data. Only use 'replace' if you want to COMPLETELY OVERWRITE all data. Current data is in <current_context>. Template: ${template}`
          : `Update working memory with important context. Default mode is 'append' which safely merges new data. Only use 'replace' if you want to COMPLETELY OVERWRITE all data. Current data is in <current_context>.`,
        parameters: z.object({ ...baseParams, ...modeParam }),
        execute: async ({ content, mode }, oc) => {
          await memory.updateWorkingMemory({
            conversationId: options?.conversationId,
            userId: options?.userId,
            content,
            options: {
              mode: mode as MemoryUpdateMode | undefined,
            },
          });

          // Update root span with final content
          if (oc?.traceContext) {
            const finalContent = await memory.getWorkingMemory({
              conversationId: options?.conversationId,
              userId: options?.userId,
            });
            const rootSpan = oc.traceContext.getRootSpan();
            rootSpan.setAttribute("agent.workingMemory.finalContent", finalContent || "");
            rootSpan.setAttribute("agent.workingMemory.lastUpdateTime", new Date().toISOString());
          }

          return `Working memory ${mode === "replace" ? "replaced" : "updated (appended)"} successfully.`;
        },
      }),
    );

    // Clear Working Memory tool (optional, might not always be needed)
    tools.push(
      createTool({
        name: "clear_working_memory",
        description: "Clear the working memory content",
        parameters: z.object({}),
        execute: async (_, oc) => {
          await memory.clearWorkingMemory({
            conversationId: options?.conversationId,
            userId: options?.userId,
          });

          // Update root span to indicate cleared state
          if (oc?.traceContext) {
            const rootSpan = oc.traceContext.getRootSpan();
            rootSpan.setAttribute("agent.workingMemory.finalContent", "");
            rootSpan.setAttribute("agent.workingMemory.lastUpdateTime", new Date().toISOString());
          }

          return "Working memory cleared.";
        },
      }),
    );

    return tools;
  }
}
