import { isDeepStrictEqual } from "node:util";
import type {
  AssistantModelMessage,
  ModelMessage,
  ProviderOptions,
  SystemModelMessage,
  ToolExecutionOptions,
  ToolModelMessage,
} from "@ai-sdk/provider-utils";
import type { Span } from "@opentelemetry/api";
import { SpanKind, SpanStatusCode, context as otelContext } from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import { safeStringify } from "@voltagent/internal/utils";
import type {
  StreamTextResult as AIStreamTextResult,
  Tool as AITool,
  CallSettings,
  GenerateObjectResult,
  GenerateTextResult,
  LanguageModel,
  PrepareStepFunction,
  StepResult,
  ToolChoice,
  ToolSet,
  UIMessage,
} from "ai";
import {
  type AsyncIterableStream,
  type FinishReason,
  type InferGenerateOutput,
  type LanguageModelUsage,
  type Output,
  type Warning,
  consumeStream,
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
import { Memory } from "../memory";
import type { MemoryUpdateMode } from "../memory";
import { MemoryManager } from "../memory/manager/memory-manager";
import type { ConversationTitleConfig, ConversationTitleGenerator } from "../memory/types";
import { type VoltAgentObservability, createVoltAgentObservability } from "../observability";
import { TRIGGER_CONTEXT_KEY } from "../observability/context-keys";
import { type ObservabilityFlushState, flushObservability } from "../observability/utils";
import { AgentRegistry } from "../registries/agent-registry";
import { ModelProviderRegistry } from "../registries/model-provider-registry";
import type { BaseRetriever } from "../retriever/retriever";
import type { ProviderTool, Tool, ToolExecutionResult, Toolkit, VercelTool } from "../tool";
import { createTool } from "../tool";
import { isProviderTool } from "../tool/manager";
import { ToolManager } from "../tool/manager";
import { createEmbeddingToolSearchStrategy } from "../tool/routing";
import {
  TOOL_ROUTING_CALL_TOOL_NAME,
  TOOL_ROUTING_INTERNAL_TOOL_SYMBOL,
  TOOL_ROUTING_SEARCH_TOOL_NAME,
} from "../tool/routing/constants";
import type {
  ToolRoutingConfig,
  ToolSearchCandidate,
  ToolSearchResult,
  ToolSearchResultItem,
  ToolSearchSelection,
  ToolSearchStrategy,
} from "../tool/routing/types";
import { randomUUID } from "../utils/id";
import { convertModelMessagesToUIMessages } from "../utils/message-converter";
import { NodeType, createNodeId } from "../utils/node-utils";
import { zodSchemaToJsonUI } from "../utils/toolParser";
import { convertUsage } from "../utils/usage-converter";
import { normalizeFinishUsageStream, resolveFinishUsage } from "../utils/usage-normalizer";
import type { Voice } from "../voice";
import { VoltOpsClient as VoltOpsClientClass } from "../voltops/client";
import type { VoltOpsClient } from "../voltops/client";
import type { PromptContent, PromptHelper } from "../voltops/types";
import { buildToolErrorResult } from "./error-utils";
import {
  ToolDeniedError,
  createAbortError,
  createBailError,
  createVoltAgentError,
  isBailError,
  isClientHTTPError,
  isMiddlewareAbortError,
  isToolDeniedError,
  isVoltAgentError,
} from "./errors";
import {
  type AgentEvalHost,
  type EnqueueEvalScoringArgs,
  enqueueEvalScoring as enqueueEvalScoringHelper,
} from "./eval";
import type { AgentHooks, OnToolEndHookResult } from "./hooks";
import { AgentTraceContext, addModelAttributesToSpan } from "./open-telemetry/trace-context";
import type {
  BaseMessage,
  BaseTool,
  StepWithContent,
  ToolExecuteOptions,
  UsageInfo,
} from "./providers/base/types";
export type { AgentHooks } from "./hooks";
import { P, match } from "ts-pattern";
import type { StopWhen } from "../ai-types";
import type { SamplingPolicy } from "../eval/runtime";
import type { ConversationStepRecord } from "../memory/types";
import { applySummarization } from "./apply-summarization";
import {
  AGENT_REF_CONTEXT_KEY,
  FORCED_TOOL_CHOICE_CONTEXT_KEY,
  TOOL_ROUTING_CONTEXT_KEY,
  TOOL_ROUTING_SEARCHED_TOOLS_CONTEXT_KEY,
} from "./context-keys";
import { ConversationBuffer } from "./conversation-buffer";
import {
  type NormalizedInputGuardrail,
  type NormalizedOutputGuardrail,
  runInputGuardrails as executeInputGuardrails,
  runOutputGuardrails as executeOutputGuardrails,
  normalizeInputGuardrailList,
  normalizeOutputGuardrailList,
} from "./guardrail";
import {
  AGENT_METADATA_CONTEXT_KEY,
  type AgentMetadataContextValue,
  MemoryPersistQueue,
} from "./memory-persist-queue";
import { sanitizeMessagesForModel } from "./message-normalizer";
import {
  type NormalizedInputMiddleware,
  type NormalizedOutputMiddleware,
  normalizeInputMiddlewareList,
  normalizeOutputMiddlewareList,
  runInputMiddlewares,
  runOutputMiddlewares,
} from "./middleware";
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
  AgentFeedbackMetadata,
  AgentFeedbackOptions,
  AgentFullState,
  AgentGuardrailState,
  AgentModelConfig,
  AgentModelValue,
  AgentOptions,
  AgentSummarizationOptions,
  AgentToolRoutingState,
  ApiToolInfo,
  DynamicValue,
  DynamicValueOptions,
  InputGuardrail,
  InputMiddleware,
  InstructionsDynamicValue,
  OperationContext,
  OutputGuardrail,
  OutputMiddleware,
  SupervisorConfig,
} from "./types";

const BUFFER_CONTEXT_KEY = Symbol("conversationBuffer");
const QUEUE_CONTEXT_KEY = Symbol("memoryPersistQueue");
const STEP_PERSIST_COUNT_KEY = Symbol("persistedStepCount");
const ABORT_LISTENER_ATTACHED_KEY = Symbol("abortListenerAttached");
const MIDDLEWARE_RETRY_FEEDBACK_KEY = Symbol("middlewareRetryFeedback");
const DEFAULT_FEEDBACK_KEY = "satisfaction";
const DEFAULT_CONVERSATION_TITLE_PROMPT = [
  "You generate concise titles for new conversations.",
  "Summarize the user's first message in a short phrase.",
  "Keep it under 80 characters and return only the title.",
].join("\n");
const DEFAULT_CONVERSATION_TITLE_MAX_OUTPUT_TOKENS = 32;
const DEFAULT_CONVERSATION_TITLE_MAX_CHARS = 80;
const CONVERSATION_TITLE_INPUT_MAX_CHARS = 2000;
const DEFAULT_TOOL_SEARCH_TOP_K = 1;

type ResponseMessage = AssistantModelMessage | ToolModelMessage;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isAssistantContentPart = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case "text":
    case "reasoning":
      return typeof value.text === "string";
    case "tool-call":
    case "tool-result":
      return hasNonEmptyString(value.toolCallId) && hasNonEmptyString(value.toolName);
    case "tool-approval-request":
      return hasNonEmptyString(value.toolCallId) && hasNonEmptyString(value.approvalId);
    case "image":
      return "image" in value && value.image != null;
    case "file":
      return hasNonEmptyString(value.mediaType) && "data" in value && value.data != null;
    default:
      return false;
  }
};

const isToolContentPart = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.type) {
    case "tool-result":
      return hasNonEmptyString(value.toolCallId) && hasNonEmptyString(value.toolName);
    case "tool-approval-response":
      return hasNonEmptyString(value.approvalId) && typeof value.approved === "boolean";
    default:
      return false;
  }
};

const isResponseMessage = (value: unknown): value is ResponseMessage => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.role === "assistant") {
    if (typeof value.content === "string") {
      return true;
    }
    if (Array.isArray(value.content)) {
      return value.content.every(isAssistantContentPart);
    }
    return false;
  }

  if (value.role === "tool") {
    return Array.isArray(value.content) && value.content.every(isToolContentPart);
  }

  return false;
};

const filterResponseMessages = (messages: unknown): ModelMessage[] | undefined => {
  if (!Array.isArray(messages)) {
    return undefined;
  }

  const filtered = messages.filter(isResponseMessage);
  return filtered.length > 0 ? filtered : undefined;
};

const searchToolsParameters = z.object({
  query: z.string().describe("User request or query to search tools for."),
  topK: z.number().int().positive().optional().describe("Maximum number of tools to return."),
});

const searchToolsOutputSchema = z.object({
  query: z.string(),
  selections: z.array(
    z.object({
      name: z.string(),
      score: z.number().optional(),
      reason: z.string().optional(),
    }),
  ),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      tags: z.array(z.string()).nullable(),
      parametersSchema: z.any().nullable(),
      outputSchema: z.any().nullable(),
      score: z.number().optional(),
      reason: z.string().optional(),
    }),
  ),
});

const callToolParameters = z.object({
  name: z.string().describe("The exact name of the tool to call."),
  args: z
    .record(z.string(), z.any())
    .nullable()
    .optional()
    .default({})
    .describe("Arguments to pass to the tool."),
});

// ============================================================================
// Types
// ============================================================================

export type OutputSpec = Output.Output<unknown, unknown>;
type OutputValue<OUTPUT extends OutputSpec> = InferGenerateOutput<OUTPUT>;

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

function sanitizeConversationTitle(text: string, maxLength: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  const unquoted = trimmed.replace(/^["'`]+|["'`]+$/g, "");
  if (!Number.isFinite(maxLength) || maxLength <= 0) {
    return unquoted;
  }

  return unquoted.length > maxLength ? unquoted.slice(0, maxLength).trim() : unquoted;
}

/**
 * Agent context with comprehensive tracking
 */
// AgentContext removed; OperationContext is used directly throughout

// AgentHooks type is defined in './hooks' and uses OperationContext

/**
 * Extended StreamTextResult that includes context
 */
export type StreamTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  OUTPUT = unknown,
> = {
  // All methods from AIStreamTextResult
  readonly text: AIStreamTextResult<TOOLS, any>["text"];
  readonly textStream: AIStreamTextResult<TOOLS, any>["textStream"];
  readonly fullStream: AsyncIterable<VoltAgentTextStreamPart<TOOLS>>;
  readonly usage: AIStreamTextResult<TOOLS, any>["usage"];
  readonly finishReason: AIStreamTextResult<TOOLS, any>["finishReason"];
  // Partial output stream for streaming structured objects
  readonly partialOutputStream?: AIStreamTextResult<TOOLS, any>["partialOutputStream"];
  toUIMessageStream: AIStreamTextResult<TOOLS, any>["toUIMessageStream"];
  toUIMessageStreamResponse: AIStreamTextResult<TOOLS, any>["toUIMessageStreamResponse"];
  pipeUIMessageStreamToResponse: AIStreamTextResult<TOOLS, any>["pipeUIMessageStreamToResponse"];
  pipeTextStreamToResponse: AIStreamTextResult<TOOLS, any>["pipeTextStreamToResponse"];
  toTextStreamResponse: AIStreamTextResult<TOOLS, any>["toTextStreamResponse"];
  // Additional context field
  context: Map<string | symbol, unknown>;
  // Feedback metadata for the trace, if enabled
  feedback?: AgentFeedbackMetadata | null;
} & Record<never, OUTPUT>;

/**
 * Extended StreamObjectResult that includes context
 */
export interface StreamObjectResultWithContext<T> {
  // Delegate to original streamObject result properties
  readonly object: Promise<T>;
  readonly partialObjectStream: ReadableStream<Partial<T>>;
  readonly textStream: AsyncIterableStream<string>;
  readonly warnings: Promise<Warning[] | undefined>;
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
type BaseGenerateTextResult<TOOLS extends ToolSet = Record<string, any>> = Omit<
  GenerateTextResult<TOOLS, any>,
  "experimental_output" | "output"
> & {
  experimental_output: unknown;
  output: unknown;
};

export interface GenerateTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  OUTPUT extends OutputSpec = OutputSpec,
> extends BaseGenerateTextResult<TOOLS> {
  // Additional context field
  context: Map<string | symbol, unknown>;
  // Typed structured output override if provided by callers
  experimental_output: OutputValue<OUTPUT>;
  output: OutputValue<OUTPUT>;
  // Feedback metadata for the trace, if enabled
  feedback?: AgentFeedbackMetadata | null;
}

type LLMOperation =
  | "streamText"
  | "generateText"
  | "streamObject"
  | "generateObject"
  | "generateTitle";

/**
 * Extended GenerateObjectResult that includes context
 */
export interface GenerateObjectResultWithContext<T> extends GenerateObjectResult<T> {
  // Additional context field
  context: Map<string | symbol, unknown>;
}

function cloneGenerateTextResultWithContext<
  TOOLS extends ToolSet = Record<string, any>,
  OUTPUT extends OutputSpec = OutputSpec,
>(
  result: GenerateTextResult<TOOLS, OUTPUT>,
  overrides: Partial<
    Pick<
      GenerateTextResultWithContext<TOOLS, OUTPUT>,
      "text" | "context" | "toolCalls" | "toolResults" | "feedback"
    >
  >,
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

type AITextCallOptions = Partial<CallSettings> & {
  toolChoice?: ToolChoice<Record<string, unknown>>;
  prepareStep?: PrepareStepFunction<Record<string, AITool>>;
};

function applyForcedToolChoice(
  aiSDKOptions: AITextCallOptions,
  forcedToolChoice: ToolChoice<Record<string, unknown>> | undefined,
): void {
  if (!forcedToolChoice || aiSDKOptions.toolChoice !== undefined) {
    return;
  }

  const userPrepareStep = aiSDKOptions.prepareStep;
  aiSDKOptions.prepareStep = async (
    options: Parameters<PrepareStepFunction<Record<string, AITool>>>[0],
  ) => {
    const prepared = userPrepareStep ? await userPrepareStep(options) : undefined;
    const isFirstStep = options.steps.length === 0;
    if (!isFirstStep || prepared?.toolChoice !== undefined) {
      return prepared;
    }

    if (prepared) {
      return { ...prepared, toolChoice: forcedToolChoice };
    }

    return { toolChoice: forcedToolChoice };
  };
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

const asyncGeneratorFunction = Object.getPrototypeOf(async function* () {}).constructor;
const DEFAULT_LLM_MAX_RETRIES = 3;

function isAsyncGeneratorFunction(
  value: unknown,
): value is (...args: any[]) => AsyncIterable<unknown> {
  return typeof value === "function" && value.constructor === asyncGeneratorFunction;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function";
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
  inheritParentSpan?: boolean; // Use active VoltAgent span if parentSpan is not provided

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
  feedback?: boolean | AgentFeedbackOptions;
  /**
   * Custom stop condition for ai-sdk step execution.
   * When provided, this overrides VoltAgent's default `stepCountIs(maxSteps)`.
   * Use with care: incorrect predicates can cause early termination or
   * unbounded loops depending on provider behavior and tool usage.
   */
  stopWhen?: StopWhen;

  // Tools (can provide additional tools dynamically)
  tools?: (Tool<any, any> | Toolkit)[];
  /**
   * Optional per-call tool routing override.
   */
  toolRouting?: ToolRoutingConfig | false;

  // Hooks (can override agent hooks)
  hooks?: AgentHooks;

  // Guardrails (can override agent-level guardrails)
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<any>[];

  // Middleware (can override agent-level middlewares)
  inputMiddlewares?: InputMiddleware[];
  outputMiddlewares?: OutputMiddleware<any>[];
  maxMiddlewareRetries?: number;

  // Provider-specific options
  providerOptions?: ProviderOptions;

  // Structured output (for schema-guided generation)
  output?: OutputSpec;

  // === Inherited from AI SDK CallSettings ===
  // maxOutputTokens, temperature, topP, topK,
  // presencePenalty, frequencyPenalty, stopSequences,
  // seed, maxRetries, abortSignal, headers
  /**
   * Optional explicit stop sequences to pass through to the underlying provider.
   * Mirrors the `stop` option supported by ai-sdk `generateText/streamText`.
   */
  stop?: string | string[];

  /**
   * Tool choice strategy for AI SDK calls.
   */
  toolChoice?: ToolChoice<Record<string, unknown>>;
}

export type GenerateTextOptions<OUTPUT extends OutputSpec = OutputSpec> = Omit<
  BaseGenerationOptions,
  "output"
> & {
  output?: OUTPUT;
};
export type StreamTextOptions = BaseGenerationOptions & {
  onFinish?: (result: any) => void | Promise<void>;
  /**
   * When true, avoids wiring the HTTP abort signal into the stream so clients can resume later.
   * Use with a resumable stream store to prevent orphaned streams.
   */
  resumableStream?: boolean;
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
  readonly model: AgentModelValue;
  readonly dynamicTools?: DynamicValue<(Tool<any, any> | Toolkit)[]>;
  readonly hooks: AgentHooks;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
  readonly maxSteps: number;
  readonly maxRetries: number;
  readonly stopWhen?: StopWhen;
  readonly markdown: boolean;
  readonly inheritParentSpan: boolean;
  readonly voice?: Voice;
  readonly retriever?: BaseRetriever;
  readonly supervisorConfig?: SupervisorConfig;
  private readonly context?: Map<string | symbol, unknown>;

  private readonly logger: Logger;
  private readonly memoryManager: MemoryManager;
  private readonly memory?: Memory | false;
  private readonly memoryConfigured: boolean;
  private readonly summarization?: AgentSummarizationOptions | false;
  private defaultObservability?: VoltAgentObservability;
  private readonly toolManager: ToolManager;
  private readonly toolPoolManager: ToolManager;
  private readonly subAgentManager: SubAgentManager;
  private readonly voltOpsClient?: VoltOpsClient;
  private readonly prompts?: PromptHelper;
  private readonly evalConfig?: AgentEvalConfig;
  private readonly feedbackOptions?: AgentFeedbackOptions | boolean;
  private readonly inputGuardrails: NormalizedInputGuardrail[];
  private readonly outputGuardrails: NormalizedOutputGuardrail[];
  private readonly inputMiddlewares: NormalizedInputMiddleware[];
  private readonly outputMiddlewares: NormalizedOutputMiddleware[];
  private readonly maxMiddlewareRetries: number;
  private readonly observabilityAuthWarningState: ObservabilityFlushState = {
    authWarningLogged: false,
  };
  private toolRouting?: ToolRoutingConfig | false;
  private toolRoutingConfigured: boolean;
  private toolRoutingExposedNames: Set<string> = new Set();
  private toolRoutingPoolExplicit = false;
  private toolRoutingSearchStrategy?: ToolSearchStrategy;

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
    this.maxRetries = options.maxRetries ?? DEFAULT_LLM_MAX_RETRIES;
    this.stopWhen = options.stopWhen;
    this.markdown = options.markdown ?? false;
    this.inheritParentSpan = options.inheritParentSpan ?? true;
    this.voice = options.voice;
    this.retriever = options.retriever;
    this.supervisorConfig = options.supervisorConfig;
    this.context = toContextMap(options.context);
    this.voltOpsClient = options.voltOpsClient;
    this.evalConfig = options.eval;
    this.feedbackOptions = options.feedback;
    this.inputGuardrails = normalizeInputGuardrailList(options.inputGuardrails || []);
    this.outputGuardrails = normalizeOutputGuardrailList(options.outputGuardrails || []);
    this.inputMiddlewares = normalizeInputMiddlewareList(options.inputMiddlewares || []);
    this.outputMiddlewares = normalizeOutputMiddlewareList(options.outputMiddlewares || []);
    this.maxMiddlewareRetries = options.maxMiddlewareRetries ?? 0;
    this.toolRoutingConfigured = options.toolRouting !== undefined;
    this.toolRouting = options.toolRouting ?? AgentRegistry.getInstance().getGlobalToolRouting();

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
    this.memoryConfigured = options.memory !== undefined;
    this.memory = options.memory;
    this.summarization = options.summarization;

    // Initialize memory manager
    const resolvedMemory = this.memoryConfigured
      ? options.memory
      : AgentRegistry.getInstance().getGlobalAgentMemory();
    const titleGenerator = this.createConversationTitleGenerator(
      resolvedMemory instanceof Memory ? resolvedMemory : undefined,
    );
    this.memoryManager = new MemoryManager(
      this.id,
      resolvedMemory,
      {},
      this.logger,
      titleGenerator,
    );

    // Initialize tool manager with static tools
    const staticTools = typeof options.tools === "function" ? [] : options.tools;
    this.toolManager = new ToolManager(staticTools, this.logger);
    if (options.toolkits) {
      this.toolManager.addItems(options.toolkits);
    }
    this.toolPoolManager = new ToolManager([], this.logger);
    this.applyToolRoutingConfig(this.toolRouting);

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(
      this.name,
      options.subAgents || [],
      this.supervisorConfig,
    );

    // Initialize prompts helper with local prompts and VoltOps clients
    this.prompts = VoltOpsClientClass.createPromptHelperFromSources(this.id, this.voltOpsClient);
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Generate text response
   */
  async generateText<OUTPUT extends OutputSpec = OutputSpec>(
    input: string | UIMessage[] | BaseMessage[],
    options?: GenerateTextOptions<OUTPUT>,
  ): Promise<GenerateTextResultWithContext<ToolSet, OUTPUT>> {
    const startTime = Date.now();
    const oc = this.createOperationContext(input, options);
    const methodLogger = oc.logger;
    const feedbackOptions = this.resolveFeedbackOptions(options);
    const feedbackClient = feedbackOptions ? this.getFeedbackClient() : undefined;
    const shouldDeferPersist = Boolean(feedbackOptions && feedbackClient);
    let feedbackMetadata: AgentFeedbackMetadata | null = null;

    // Wrap entire execution in root span for trace context
    const rootSpan = oc.traceContext.getRootSpan();
    return await oc.traceContext.withSpan(rootSpan, async () => {
      const guardrailSet = this.resolveGuardrailSets(options);
      const middlewareSet = this.resolveMiddlewareSets(options);
      const maxMiddlewareRetries = this.resolveMiddlewareRetries(options);
      let middlewareRetryCount = 0;
      const feedbackPromise =
        feedbackOptions && feedbackClient ? this.createFeedbackMetadata(oc, options) : null;
      let effectiveInput: typeof input = input;
      try {
        while (true) {
          try {
            if (middlewareRetryCount > 0) {
              this.resetOperationAttemptState(oc);
            }

            const buffer = this.getConversationBuffer(oc);
            const persistQueue = this.getMemoryPersistQueue(oc);

            effectiveInput = await runInputMiddlewares(
              input,
              oc,
              middlewareSet.input,
              "generateText",
              this,
              middlewareRetryCount,
            );

            effectiveInput = await executeInputGuardrails(
              effectiveInput,
              oc,
              guardrailSet.input,
              "generateText",
              this,
            );

            const { messages, uiMessages, modelName, tools, maxSteps } =
              await this.prepareExecution(effectiveInput, oc, options);
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
              context, // Explicitly exclude to prevent collision with AI SDK's future 'context' field
              parentAgentId,
              parentOperationContext,
              hooks,
              feedback: _feedback,
              maxSteps: userMaxSteps,
              tools: userTools,
              output,
              providerOptions,
              ...aiSDKOptions
            } = options || {};

            const forcedToolChoice = oc.systemContext.get(FORCED_TOOL_CHOICE_CONTEXT_KEY) as
              | ToolChoice<Record<string, unknown>>
              | undefined;
            applyForcedToolChoice(aiSDKOptions, forcedToolChoice);

            const { result, modelName: effectiveModelName } = await this.executeWithModelFallback({
              oc,
              operation: "generateText",
              options,
              run: async ({
                model: resolvedModel,
                modelName: resolvedModelName,
                modelId,
                maxRetries,
                modelIndex,
                attempt,
                isLastAttempt: _isLastAttempt,
                isLastModel: _isLastModel,
              }) => {
                const llmSpan = this.createLLMSpan(oc, {
                  operation: "generateText",
                  modelName: resolvedModelName,
                  isStreaming: false,
                  messages,
                  tools,
                  providerOptions,
                  callOptions: {
                    temperature: aiSDKOptions?.temperature ?? this.temperature,
                    maxOutputTokens: aiSDKOptions?.maxOutputTokens ?? this.maxOutputTokens,
                    topP: aiSDKOptions?.topP,
                    stop: aiSDKOptions?.stop ?? options?.stop,
                    maxRetries,
                    modelIndex,
                    attempt,
                    modelId,
                  },
                });
                const finalizeLLMSpan = this.createLLMSpanFinalizer(llmSpan);

                try {
                  const response = await oc.traceContext.withSpan(llmSpan, () =>
                    generateText({
                      model: resolvedModel,
                      messages,
                      tools,
                      // Default values
                      temperature: this.temperature,
                      maxOutputTokens: this.maxOutputTokens,
                      stopWhen: options?.stopWhen ?? this.stopWhen ?? stepCountIs(maxSteps),
                      // User overrides from AI SDK options
                      ...aiSDKOptions,
                      maxRetries: 0,
                      // Structured output if provided
                      output,
                      // Provider-specific options
                      providerOptions,
                      // VoltAgent controlled (these should not be overridden)
                      abortSignal: oc.abortController.signal,
                      onStepFinish: this.createStepHandler(oc, options),
                    }),
                  );

                  const resolvedProviderUsage = response.usage
                    ? await Promise.resolve(response.usage)
                    : undefined;
                  finalizeLLMSpan(SpanStatusCode.OK, {
                    usage: resolvedProviderUsage,
                    finishReason: response.finishReason,
                  });

                  return response;
                } catch (error) {
                  finalizeLLMSpan(SpanStatusCode.ERROR, { message: (error as Error).message });
                  throw error;
                }
              },
            });

            addModelAttributesToSpan(
              oc.traceContext.getRootSpan(),
              effectiveModelName,
              options,
              this.maxOutputTokens,
              this.temperature,
            );

            const providerUsage = result.usage ? await Promise.resolve(result.usage) : undefined;
            const usageForFinish = resolveFinishUsage({
              providerMetadata: (result as { providerMetadata?: unknown }).providerMetadata,
              usage: providerUsage,
              totalUsage: (result as { totalUsage?: LanguageModelUsage }).totalUsage,
            });
            const { toolCalls: aggregatedToolCalls, toolResults: aggregatedToolResults } =
              this.collectToolDataFromResult(result);

            const usageInfo = convertUsage(usageForFinish);
            const middlewareText = await runOutputMiddlewares<string>(
              result.text,
              oc,
              middlewareSet.output as NormalizedOutputMiddleware<string>[],
              "generateText",
              this,
              middlewareRetryCount,
              {
                usage: usageInfo,
                finishReason: result.finishReason ?? null,
                warnings: result.warnings ?? null,
              },
            );

            this.recordStepResults(result.steps, oc);

            if (!shouldDeferPersist) {
              await persistQueue.flush(buffer, oc);
            }

            const finalText = await executeOutputGuardrails({
              output: middlewareText,
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
            const tokenInfo = usageForFinish
              ? `${usageForFinish.totalTokens} tokens`
              : "no usage data";
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
                usage: usageForFinish,
                toolCalls: aggregatedToolCalls.length,
                text: finalText,
              },
            );

            // Add usage to span
            this.setTraceContextUsage(oc.traceContext, usageForFinish);
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
                usage: usageForFinish ? JSON.parse(safeStringify(usageForFinish)) : undefined,
                toolCalls: aggregatedToolCalls,
              },
            });

            // Close span after scheduling scorers
            oc.traceContext.end("completed");

            if (feedbackPromise) {
              feedbackMetadata = await feedbackPromise;
            }

            if (feedbackMetadata) {
              const metadataApplied = buffer.addMetadataToLastAssistantMessage(
                { feedback: feedbackMetadata },
                { requirePending: true },
              );
              if (!metadataApplied) {
                const responseMessages = filterResponseMessages(result.response?.messages);
                if (responseMessages?.length) {
                  buffer.addModelMessages(responseMessages, "response");
                  buffer.addMetadataToLastAssistantMessage(
                    { feedback: feedbackMetadata },
                    { requirePending: true },
                  );
                }
              }
            }

            if (shouldDeferPersist) {
              await persistQueue.flush(buffer, oc);
            }

            return cloneGenerateTextResultWithContext(result, {
              text: finalText,
              context: oc.context,
              toolCalls: aggregatedToolCalls,
              toolResults: aggregatedToolResults,
              feedback: feedbackMetadata,
            });
          } catch (error) {
            if (this.shouldRetryMiddleware(error, middlewareRetryCount, maxMiddlewareRetries)) {
              const retryError = error as {
                middlewareId?: string;
                metadata?: unknown;
                message?: string;
              };
              await this.getMergedHooks(options).onRetry?.({
                agent: this,
                context: oc,
                operation: "generateText",
                source: "middleware",
                middlewareId: retryError.middlewareId ?? null,
                retryCount: middlewareRetryCount,
                maxRetries: maxMiddlewareRetries,
                reason: retryError.message,
                metadata: retryError.metadata,
              });
              methodLogger.warn(`[Agent:${this.name}] - Middleware requested retry`, {
                operation: "generateText",
                retryCount: middlewareRetryCount,
                maxMiddlewareRetries,
                middlewareId: retryError.middlewareId ?? null,
                reason: retryError.message ?? "middleware retry",
                metadata:
                  retryError.metadata !== undefined
                    ? safeStringify(retryError.metadata)
                    : undefined,
              });
              this.storeMiddlewareRetryFeedback(oc, retryError.message, retryError.metadata);
              middlewareRetryCount += 1;
              continue;
            }
            throw error;
          }
        }
      } catch (error) {
        // Check if this is a BailError (subagent early termination via abort)
        if (isBailError(error as Error)) {
          // Retrieve bailed result from systemContext
          const bailedResult = oc.systemContext.get("bailedResult") as
            | { agentName: string; response: string }
            | undefined;

          if (bailedResult) {
            methodLogger.info("Using bailed subagent result as final output (from abort)", {
              event: LogEvents.AGENT_GENERATION_COMPLETED,
              agentName: bailedResult.agentName,
              bailed: true,
            });

            const usageInfo: UsageInfo = {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            };

            // Apply guardrails to bailed result
            const finalText = await executeOutputGuardrails({
              output: bailedResult.response,
              operationContext: oc,
              guardrails: guardrailSet.output,
              operation: "generateText",
              agent: this,
              metadata: {
                usage: usageInfo,
                finishReason: "bail" as any,
                warnings: null,
              },
            });

            // Call onEnd hook
            await this.getMergedHooks(options).onEnd?.({
              conversationId: oc.conversationId || "",
              agent: this,
              output: {
                text: finalText,
                usage: usageInfo,
                providerResponse: undefined as any,
                finishReason: "bail" as any,
                warnings: undefined,
                context: oc.context,
              },
              error: undefined,
              context: oc,
            });

            this.recordStepResults(undefined, oc);

            // Return bailed result as successful generation
            return {
              text: finalText,
              usage: usageInfo,
              finishReason: "bail" as any,
              warnings: undefined,
              response: {} as any,
              operationContext: oc,
              context: oc.context,
            } as any;
          }
        }

        await this.flushPendingMessagesOnError(oc).catch(() => {});
        return this.handleError(error as Error, oc, options, startTime);
      } finally {
        // Ensure all spans are exported before returning (critical for serverless)
        // Uses waitUntil if available to avoid blocking
        await flushObservability(
          this.getObservability(),
          oc.logger ?? this.logger,
          this.observabilityAuthWarningState,
          "generateText:finally",
        );
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
    const feedbackOptions = this.resolveFeedbackOptions(options);
    const feedbackClient = feedbackOptions ? this.getFeedbackClient() : undefined;
    const shouldDeferPersist = Boolean(feedbackOptions && feedbackClient);
    const feedbackDeferred = feedbackOptions
      ? createDeferred<AgentFeedbackMetadata | null>()
      : null;
    let feedbackValue: AgentFeedbackMetadata | null = null;
    let feedbackResolved = false;
    let feedbackFinalizeRequested = false;
    let feedbackApplied = false;
    let latestResponseMessages: ModelMessage[] | undefined;
    const resolveFeedbackDeferred = (value: AgentFeedbackMetadata | null) => {
      if (!feedbackDeferred || feedbackResolved) {
        return;
      }
      feedbackResolved = true;
      feedbackDeferred.resolve(value);
    };

    // Wrap entire execution in root span to ensure all logs have trace context
    const rootSpan = oc.traceContext.getRootSpan();
    return await oc.traceContext.withSpan(rootSpan, async () => {
      const methodLogger = oc.logger; // Extract logger with executionId
      const guardrailSet = this.resolveGuardrailSets(options);
      const middlewareSet = this.resolveMiddlewareSets(options);
      const maxMiddlewareRetries = this.resolveMiddlewareRetries(options);
      let middlewareRetryCount = 0;
      const buffer = this.getConversationBuffer(oc);
      const persistQueue = this.getMemoryPersistQueue(oc);
      const scheduleFeedbackPersist = (metadata: AgentFeedbackMetadata | null) => {
        if (!metadata || feedbackApplied) {
          return;
        }
        feedbackApplied = true;
        const metadataApplied = buffer.addMetadataToLastAssistantMessage(
          { feedback: metadata },
          { requirePending: true },
        );
        if (!metadataApplied && latestResponseMessages?.length) {
          buffer.addModelMessages(latestResponseMessages, "response");
          buffer.addMetadataToLastAssistantMessage(
            { feedback: metadata },
            { requirePending: true },
          );
        }
        if (shouldDeferPersist) {
          void persistQueue.flush(buffer, oc).catch((error) => {
            oc.logger?.debug?.("Failed to persist feedback metadata", { error });
          });
        }
      };
      const feedbackPromise =
        feedbackOptions && feedbackClient ? this.createFeedbackMetadata(oc, options) : null;
      if (feedbackPromise) {
        feedbackPromise
          .then((metadata) => {
            feedbackValue = metadata;
            resolveFeedbackDeferred(metadata);
            if (feedbackFinalizeRequested) {
              scheduleFeedbackPersist(metadata);
            }
          })
          .catch(() => resolveFeedbackDeferred(null));
      } else if (feedbackDeferred) {
        resolveFeedbackDeferred(null);
      }
      let effectiveInput: typeof input = input;
      try {
        while (true) {
          try {
            effectiveInput = await runInputMiddlewares(
              input,
              oc,
              middlewareSet.input,
              "streamText",
              this,
              middlewareRetryCount,
            );
            break;
          } catch (error) {
            if (this.shouldRetryMiddleware(error, middlewareRetryCount, maxMiddlewareRetries)) {
              const retryError = error as {
                middlewareId?: string;
                metadata?: unknown;
                message?: string;
              };
              await this.getMergedHooks(options).onRetry?.({
                agent: this,
                context: oc,
                operation: "streamText",
                source: "middleware",
                middlewareId: retryError.middlewareId ?? null,
                retryCount: middlewareRetryCount,
                maxRetries: maxMiddlewareRetries,
                reason: retryError.message,
                metadata: retryError.metadata,
              });
              methodLogger.warn(`[Agent:${this.name}] - Middleware requested retry`, {
                operation: "streamText",
                retryCount: middlewareRetryCount,
                maxMiddlewareRetries,
                middlewareId: retryError.middlewareId ?? null,
                reason: retryError.message ?? "middleware retry",
                metadata:
                  retryError.metadata !== undefined
                    ? safeStringify(retryError.metadata)
                    : undefined,
              });
              this.storeMiddlewareRetryFeedback(oc, retryError.message, retryError.metadata);
              middlewareRetryCount += 1;
              continue;
            }
            throw error;
          }
        }

        effectiveInput = await executeInputGuardrails(
          effectiveInput,
          oc,
          guardrailSet.input,
          "streamText",
          this,
        );

        // No need to initialize stream collection anymore - we'll use UIMessageStreamWriter

        const { messages, uiMessages, modelName, tools, maxSteps } = await this.prepareExecution(
          effectiveInput,
          oc,
          options,
        );
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
          context, // Explicitly exclude to prevent collision with AI SDK's future 'context' field
          parentAgentId,
          parentOperationContext,
          hooks,
          feedback: _feedback,
          maxSteps: userMaxSteps,
          tools: userTools,
          onFinish: userOnFinish,
          output,
          providerOptions,
          ...aiSDKOptions
        } = options || {};

        const forcedToolChoice = oc.systemContext.get(FORCED_TOOL_CHOICE_CONTEXT_KEY) as
          | ToolChoice<Record<string, unknown>>
          | undefined;
        applyForcedToolChoice(aiSDKOptions, forcedToolChoice);

        const guardrailStreamingEnabled = guardrailSet.output.length > 0;

        let guardrailPipeline: GuardrailPipeline | null = null;
        let sanitizedTextPromise!: PromiseLike<string>;
        const { result, modelName: effectiveModelName } = await this.executeWithModelFallback({
          oc,
          operation: "streamText",
          options,
          run: async ({
            model: resolvedModel,
            modelName: resolvedModelName,
            modelId,
            maxRetries,
            modelIndex,
            attempt,
            isLastAttempt,
            isLastModel,
          }) => {
            const attemptState: { hasOutput: boolean; lastError?: unknown } = {
              hasOutput: false,
            };
            const llmSpan = this.createLLMSpan(oc, {
              operation: "streamText",
              modelName: resolvedModelName,
              isStreaming: true,
              messages,
              tools,
              providerOptions,
              callOptions: {
                temperature: aiSDKOptions?.temperature ?? this.temperature,
                maxOutputTokens: aiSDKOptions?.maxOutputTokens ?? this.maxOutputTokens,
                topP: aiSDKOptions?.topP,
                stop: aiSDKOptions?.stop ?? options?.stop,
                maxRetries,
                modelIndex,
                attempt,
                modelId,
              },
            });
            const finalizeLLMSpan = this.createLLMSpanFinalizer(llmSpan);

            const streamResult = streamText({
              model: resolvedModel,
              messages,
              tools,
              // Default values
              temperature: this.temperature,
              maxOutputTokens: this.maxOutputTokens,
              stopWhen: options?.stopWhen ?? this.stopWhen ?? stepCountIs(maxSteps),
              // User overrides from AI SDK options
              ...aiSDKOptions,
              maxRetries: 0,
              // Structured output if provided
              output,
              // Provider-specific options
              providerOptions,
              // VoltAgent controlled (these should not be overridden)
              abortSignal: oc.abortController.signal,
              onStepFinish: this.createStepHandler(oc, options),
              onError: async (errorData) => {
                // Handle nested error structure from OpenAI and other providers
                // The error might be directly the error or wrapped in { error: ... }
                const actualError = (errorData as any)?.error || errorData;
                attemptState.lastError = actualError;

                // Check if this is a BailError (subagent early termination)
                // This is not a real error - it's a signal that execution should stop
                if (isBailError(actualError)) {
                  methodLogger.info("Stream aborted due to subagent bail (not an error)", {
                    agentName: actualError.agentName,
                    event: LogEvents.AGENT_GENERATION_COMPLETED,
                  });

                  // Don't log as error, don't call error hooks
                  // onFinish will be called and will handle span ending with correct finish reason
                  return;
                }

                const fallbackEligible = this.shouldFallbackOnError(actualError);
                const retryEligible = fallbackEligible && this.isRetryableError(actualError);
                const canRetry = retryEligible && !isLastAttempt;
                const canFallback = fallbackEligible && !isLastModel;
                const shouldAttemptRecovery = !attemptState.hasOutput && (canRetry || canFallback);
                const recoveryMessage = canRetry
                  ? "[LLM] Stream error before output; retry pending"
                  : canFallback
                    ? "[LLM] Stream error before output; fallback pending"
                    : attemptState.hasOutput
                      ? "[LLM] Stream error after output; recovery skipped"
                      : "[LLM] Stream error before output; recovery skipped";

                if (!shouldAttemptRecovery) {
                  resolveFeedbackDeferred(null);
                }

                // Log the error
                methodLogger.error("Stream error occurred", {
                  error: actualError,
                  agentName: this.name,
                  modelName: resolvedModelName,
                  attempt,
                  maxRetries,
                });

                methodLogger.debug(recoveryMessage, {
                  operation: "streamText",
                  modelName: resolvedModelName,
                  fallbackEligible,
                  retryEligible,
                  canRetry,
                  canFallback,
                  hasOutput: attemptState.hasOutput,
                  attempt,
                  maxRetries,
                  isLastAttempt,
                  isLastModel,
                  isRetryable: (actualError as any)?.isRetryable,
                  statusCode: (actualError as any)?.statusCode,
                  errorName: (actualError as Error)?.name,
                  errorMessage: (actualError as Error)?.message,
                });

                finalizeLLMSpan(SpanStatusCode.ERROR, { message: (actualError as Error)?.message });

                // History update removed - using OpenTelemetry only

                // Event tracking now handled by OpenTelemetry spans

                if (shouldAttemptRecovery) {
                  await flushObservability(
                    this.getObservability(),
                    oc.logger ?? this.logger,
                    this.observabilityAuthWarningState,
                    "streamText:onError",
                  );
                  return;
                }

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
                // Ensure spans are flushed on error
                // Uses waitUntil if available to avoid blocking
                await flushObservability(
                  this.getObservability(),
                  oc.logger ?? this.logger,
                  this.observabilityAuthWarningState,
                  "streamText:onError",
                );
              },
              onFinish: async (finalResult) => {
                latestResponseMessages = filterResponseMessages(finalResult.response?.messages);
                const providerUsage = finalResult.usage
                  ? await Promise.resolve(finalResult.usage)
                  : undefined;
                const usageForFinish = resolveFinishUsage({
                  providerMetadata: finalResult.providerMetadata,
                  usage: providerUsage,
                  totalUsage: finalResult.totalUsage,
                });
                finalizeLLMSpan(SpanStatusCode.OK, {
                  usage: providerUsage,
                  finishReason: finalResult.finishReason,
                });

                if (!shouldDeferPersist) {
                  await persistQueue.flush(buffer, oc);
                }

                // History update removed - using OpenTelemetry only

                // Event tracking now handled by OpenTelemetry spans

                // Add usage to span
                this.setTraceContextUsage(oc.traceContext, usageForFinish);

                const usage = convertUsage(usageForFinish);
                let finalText: string;

                // Check if we aborted due to subagent bail (early termination)
                const bailedResult = oc.systemContext.get("bailedResult") as
                  | { agentName: string; response: string }
                  | undefined;

                if (bailedResult) {
                  // Use the bailed result instead of the supervisor's output
                  methodLogger.info("Using bailed subagent result as final output", {
                    event: LogEvents.AGENT_GENERATION_COMPLETED,
                    agentName: bailedResult.agentName,
                    bailed: true,
                  });

                  // Apply guardrails to bailed result
                  if (guardrailSet.output.length > 0) {
                    finalText = await executeOutputGuardrails({
                      output: bailedResult.response,
                      operationContext: oc,
                      guardrails: guardrailSet.output,
                      operation: "streamText",
                      agent: this,
                      metadata: {
                        usage,
                        finishReason: "bail" as any,
                        warnings: finalResult.warnings ?? null,
                      },
                    });
                  } else {
                    finalText = bailedResult.response;
                  }
                } else if (guardrailPipeline) {
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
                  guardrailSet.output.length > 0
                    ? { ...finalResult, text: finalText }
                    : finalResult;

                oc.traceContext.setOutput(finalText);

                this.recordStepResults(finalResult.steps, oc);

                // Set finish reason - override to "stop" if bailed (not "error")
                if (bailedResult) {
                  oc.traceContext.setFinishReason("stop" as any);
                } else {
                  oc.traceContext.setFinishReason(finalResult.finishReason);
                }

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
                    usage: usageForFinish,
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
                    usage: usageForFinish ? JSON.parse(safeStringify(usageForFinish)) : undefined,
                    toolCalls: finalResult.toolCalls,
                  },
                });

                finalizeLLMSpan(SpanStatusCode.OK, {
                  usage: usageForFinish,
                  finishReason: finalResult.finishReason,
                });

                oc.traceContext.end("completed");

                feedbackFinalizeRequested = true;

                if (!feedbackResolved && feedbackDeferred) {
                  await feedbackDeferred.promise;
                }

                if (feedbackResolved && feedbackValue) {
                  scheduleFeedbackPersist(feedbackValue);
                } else if (shouldDeferPersist) {
                  void persistQueue.flush(buffer, oc).catch((error) => {
                    oc.logger?.debug?.("Failed to persist deferred messages", { error });
                  });
                }

                // Schedule span flush without blocking the response
                void flushObservability(
                  this.getObservability(),
                  oc.logger ?? this.logger,
                  this.observabilityAuthWarningState,
                  "streamText:onFinish",
                );
              },
            });

            const probeResult = await this.probeStreamStart(streamResult.fullStream, attemptState);
            if (probeResult.status === "error") {
              this.discardStream(streamResult.fullStream);
              const fallbackEligible = this.shouldFallbackOnError(probeResult.error);
              if (!fallbackEligible || isLastModel) {
                throw probeResult.error;
              }
              throw probeResult.error;
            }

            return streamResult;
          },
        });

        if (oc.traceContext) {
          addModelAttributesToSpan(
            oc.traceContext.getRootSpan(),
            effectiveModelName,
            options,
            this.maxOutputTokens,
            this.temperature,
          );
        }

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
          // Wrap the base stream with abort handling
          const wrapWithAbortHandling = async function* (
            baseStream: AsyncIterable<VoltAgentTextStreamPart>,
          ): AsyncIterable<VoltAgentTextStreamPart> {
            const iterator = baseStream[Symbol.asyncIterator]();

            try {
              while (true) {
                // Check if aborted before reading next chunk
                if (oc.abortController.signal.aborted) {
                  // Clean exit - stream is done
                  return;
                }

                // Try to read next chunk - may throw if stream is aborted
                let iterResult: IteratorResult<VoltAgentTextStreamPart>;
                try {
                  iterResult = await iterator.next();
                } catch (error) {
                  // If aborted, reader.read() may throw AbortError - treat as clean exit
                  if (oc.abortController.signal.aborted) {
                    return; // Clean exit, no error propagation
                  }
                  // Other errors should propagate to user code
                  throw error;
                }

                const { done, value } = iterResult;

                if (done) {
                  return;
                }

                yield value;
              }
            } finally {
              // No manual cleanup needed - AI SDK's AsyncIterableStream handles
              // its own cleanup when the generator returns. Calling iterator.return()
              // would cause ERR_INVALID_STATE since the reader is already detached.
            }
          };

          const parentStream = normalizeFinishUsageStream(wrapWithAbortHandling(result.fullStream));

          if (agent.subAgentManager.hasSubAgents()) {
            const createMergedFullStream =
              async function* (): AsyncIterable<VoltAgentTextStreamPart> {
                const { readable, writable } = new TransformStream<VoltAgentTextStreamPart>();
                const writer = writable.getWriter();

                oc.systemContext.set("fullStreamWriter", writer);

                const writeParentStream = async () => {
                  try {
                    for await (const part of parentStream) {
                      // No manual abort check needed - wrapper handles it
                      await writer.write(part as VoltAgentTextStreamPart);
                    }
                  } finally {
                    // Ensure the merged stream is closed when the parent stream finishes.
                    // This allows the reader loop below to exit with done=true and lets
                    // callers (e.g., SSE) observe completion.
                    try {
                      await writer.close();
                    } catch (_) {
                      // Ignore double-close or stream state errors
                    }
                  }
                };

                const parentPromise = writeParentStream();
                const reader = readable.getReader();

                try {
                  while (true) {
                    // Check abort before reading
                    if (oc.abortController.signal.aborted) {
                      break;
                    }

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

          // For non-subagent case, wrap the stream with abort handling and usage normalization
          return parentStream;
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
            // Wait for AI SDK text first (stream must complete)
            const aiSdkText = await result.text;

            // NOW check for bailed result (set during stream processing)
            const bailedResult = oc.systemContext.get("bailedResult") as
              | { agentName: string; response: string }
              | undefined;
            return bailedResult?.response || aiSdkText;
          });
        } else {
          // Wrap result.text with a bail check
          // IMPORTANT: Wait for AI SDK text first (stream must complete/abort)
          // This ensures createStepHandler has processed tool results and set bailedResult
          sanitizedTextPromise = result.text.then((aiSdkText) => {
            // NOW check if bailed (set by createStepHandler during stream processing)
            const bailedResult = oc.systemContext.get("bailedResult") as
              | { agentName: string; response: string }
              | undefined;

            // Return bailed subagent's result instead of supervisor's (if bailed)
            return bailedResult?.response || aiSdkText;
          });
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

        const attachFeedbackMetadata = (
          baseStream: ToUIMessageStreamReturn,
        ): ToUIMessageStreamReturn => {
          if (!feedbackDeferred) {
            return baseStream;
          }

          return createAsyncIterableReadable<UIStreamChunk>(async (controller) => {
            const reader = (baseStream as ReadableStream<UIStreamChunk>).getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value !== undefined) {
                  controller.enqueue(value);
                }
              }
              if (feedbackDeferred) {
                await feedbackDeferred.promise;
              }
              if (feedbackResolved && feedbackValue) {
                controller.enqueue({
                  type: "message-metadata",
                  messageMetadata: {
                    feedback: feedbackValue,
                  },
                } as UIStreamChunk);
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
          const baseStream = agent.subAgentManager.hasSubAgents()
            ? createMergedUIStream(streamOptions)
            : getGuardrailAwareUIStream(streamOptions);
          return attachFeedbackMetadata(baseStream);
        };

        const toUIMessageStreamResponseSanitized = (
          options?: ToUIMessageStreamResponseOptions,
        ): ReturnType<typeof result.toUIMessageStreamResponse> => {
          const streamOptions = options as ToUIMessageStreamOptions | undefined;
          const stream = toUIMessageStreamSanitized(streamOptions);
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
          const stream = toUIMessageStreamSanitized(streamOptions);
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
          get partialOutputStream() {
            return result.partialOutputStream;
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
          get feedback() {
            return feedbackValue;
          },
        };

        return resultWithContext;
      } catch (error) {
        await this.flushPendingMessagesOnError(oc).catch(() => {});
        // Ensure spans are exported on pre-stream errors
        await flushObservability(
          this.getObservability(),
          oc.logger ?? this.logger,
          this.observabilityAuthWarningState,
          "streamText:preStreamError",
        );
        return this.handleError(error as Error, oc, options, startTime);
      } finally {
        // No need to flush here for streams - handled in onFinish/onError
      }
    });
  }

  /**
   * Generate structured object
   * @deprecated — Use generateText with an output setting instead.
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
      const middlewareSet = this.resolveMiddlewareSets(options);
      const maxMiddlewareRetries = this.resolveMiddlewareRetries(options);
      let middlewareRetryCount = 0;
      let effectiveInput: typeof input = input;
      try {
        while (true) {
          try {
            if (middlewareRetryCount > 0) {
              this.resetOperationAttemptState(oc);
            }

            effectiveInput = await runInputMiddlewares(
              input,
              oc,
              middlewareSet.input,
              "generateObject",
              this,
              middlewareRetryCount,
            );

            effectiveInput = await executeInputGuardrails(
              effectiveInput,
              oc,
              guardrailSet.input,
              "generateObject",
              this,
            );
            const { messages, uiMessages, modelName } = await this.prepareExecution(
              effectiveInput,
              oc,
              options,
            );
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
              context, // Explicitly exclude to prevent collision with AI SDK's future 'context' field
              parentAgentId,
              parentOperationContext,
              hooks,
              feedback: _feedback,
              maxSteps: userMaxSteps,
              tools: userTools,
              output: _output,
              providerOptions,
              ...aiSDKOptions
            } = options || {};

            const { result, modelName: effectiveModelName } = await this.executeWithModelFallback({
              oc,
              operation: "generateObject",
              options,
              run: async ({ model: resolvedModel }) => {
                return await generateObject({
                  model: resolvedModel,
                  messages,
                  schema,
                  // Default values
                  maxOutputTokens: this.maxOutputTokens,
                  temperature: this.temperature,
                  // User overrides from AI SDK options
                  ...aiSDKOptions,
                  maxRetries: 0,
                  // Provider-specific options
                  providerOptions,
                  // VoltAgent controlled
                  abortSignal: oc.abortController.signal,
                });
              },
            });

            addModelAttributesToSpan(
              rootSpan,
              effectiveModelName,
              options,
              this.maxOutputTokens,
              this.temperature,
            );

            const providerUsage = result.usage ? await Promise.resolve(result.usage) : undefined;
            const usageForFinish = resolveFinishUsage({
              providerMetadata: (result as { providerMetadata?: unknown }).providerMetadata,
              usage: providerUsage,
              totalUsage: (result as { totalUsage?: LanguageModelUsage }).totalUsage,
            });
            const usageInfo = convertUsage(usageForFinish);
            const middlewareObject = await runOutputMiddlewares<z.infer<T>>(
              result.object,
              oc,
              middlewareSet.output as NormalizedOutputMiddleware<z.infer<T>>[],
              "generateObject",
              this,
              middlewareRetryCount,
              {
                usage: usageInfo,
                finishReason: result.finishReason ?? null,
                warnings: result.warnings ?? null,
              },
            );
            const finalObject = await executeOutputGuardrails({
              output: middlewareObject,
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
            this.setTraceContextUsage(oc.traceContext, usageForFinish);
            oc.traceContext.setOutput(finalObject);

            // Set output in operation context
            oc.output = finalObject as unknown as string | object;

            this.enqueueEvalScoring({
              oc,
              output: finalObject,
              operation: "generateObject",
              metadata: {
                finishReason: result.finishReason,
                usage: usageForFinish ? JSON.parse(safeStringify(usageForFinish)) : undefined,
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
            const tokenInfo = usageForFinish
              ? `${usageForFinish.totalTokens} tokens`
              : "no usage data";
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
                usage: usageForFinish,
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
            if (this.shouldRetryMiddleware(error, middlewareRetryCount, maxMiddlewareRetries)) {
              const retryError = error as {
                middlewareId?: string;
                metadata?: unknown;
                message?: string;
              };
              await this.getMergedHooks(options).onRetry?.({
                agent: this,
                context: oc,
                operation: "generateObject",
                source: "middleware",
                middlewareId: retryError.middlewareId ?? null,
                retryCount: middlewareRetryCount,
                maxRetries: maxMiddlewareRetries,
                reason: retryError.message,
                metadata: retryError.metadata,
              });
              methodLogger.warn(`[Agent:${this.name}] - Middleware requested retry`, {
                operation: "generateObject",
                retryCount: middlewareRetryCount,
                maxMiddlewareRetries,
                middlewareId: retryError.middlewareId ?? null,
                reason: retryError.message ?? "middleware retry",
                metadata:
                  retryError.metadata !== undefined
                    ? safeStringify(retryError.metadata)
                    : undefined,
              });
              this.storeMiddlewareRetryFeedback(oc, retryError.message, retryError.metadata);
              middlewareRetryCount += 1;
              continue;
            }
            throw error;
          }
        }
      } catch (error) {
        await this.flushPendingMessagesOnError(oc).catch(() => {});
        return this.handleError(error as Error, oc, options, startTime);
      } finally {
        // Ensure all spans are exported before returning (critical for serverless)
        // Uses waitUntil if available to avoid blocking
        await flushObservability(
          this.getObservability(),
          oc.logger ?? this.logger,
          this.observabilityAuthWarningState,
          "generateObject:finally",
        );
      }
    });
  }

  /**
   * Stream structured object
   * @deprecated — Use streamText with an output setting instead.
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
      const middlewareSet = this.resolveMiddlewareSets(options);
      const maxMiddlewareRetries = this.resolveMiddlewareRetries(options);
      let middlewareRetryCount = 0;
      let effectiveInput: typeof input = input;
      try {
        while (true) {
          try {
            effectiveInput = await runInputMiddlewares(
              input,
              oc,
              middlewareSet.input,
              "streamObject",
              this,
              middlewareRetryCount,
            );
            break;
          } catch (error) {
            if (this.shouldRetryMiddleware(error, middlewareRetryCount, maxMiddlewareRetries)) {
              const retryError = error as {
                middlewareId?: string;
                metadata?: unknown;
                message?: string;
              };
              await this.getMergedHooks(options).onRetry?.({
                agent: this,
                context: oc,
                operation: "streamObject",
                source: "middleware",
                middlewareId: retryError.middlewareId ?? null,
                retryCount: middlewareRetryCount,
                maxRetries: maxMiddlewareRetries,
                reason: retryError.message,
                metadata: retryError.metadata,
              });
              methodLogger.warn(`[Agent:${this.name}] - Middleware requested retry`, {
                operation: "streamObject",
                retryCount: middlewareRetryCount,
                maxMiddlewareRetries,
                middlewareId: retryError.middlewareId ?? null,
                reason: retryError.message ?? "middleware retry",
                metadata:
                  retryError.metadata !== undefined
                    ? safeStringify(retryError.metadata)
                    : undefined,
              });
              this.storeMiddlewareRetryFeedback(oc, retryError.message, retryError.metadata);
              middlewareRetryCount += 1;
              continue;
            }
            throw error;
          }
        }

        effectiveInput = await executeInputGuardrails(
          effectiveInput,
          oc,
          guardrailSet.input,
          "streamObject",
          this,
        );

        const { messages, uiMessages, modelName } = await this.prepareExecution(
          effectiveInput,
          oc,
          options,
        );
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
          context, // Explicitly exclude to prevent collision with AI SDK's future 'context' field
          parentAgentId,
          parentOperationContext,
          hooks,
          feedback: _feedback,
          maxSteps: userMaxSteps,
          tools: userTools,
          onFinish: userOnFinish,
          output: _output,
          providerOptions,
          ...aiSDKOptions
        } = options || {};

        let guardrailObjectPromise!: Promise<z.infer<T>>;
        let resolveGuardrailObject: ((value: z.infer<T>) => void) | undefined;
        let rejectGuardrailObject: ((reason: unknown) => void) | undefined;

        const { result, modelName: effectiveModelName } = await this.executeWithModelFallback({
          oc,
          operation: "streamObject",
          options,
          run: async ({
            model: resolvedModel,
            modelName: resolvedModelName,
            maxRetries,
            attempt,
            isLastAttempt,
            isLastModel,
          }) => {
            const attemptState: { hasOutput: boolean; lastError?: unknown } = {
              hasOutput: false,
            };
            const streamResult = streamObject({
              model: resolvedModel,
              messages,
              schema,
              // Default values
              maxOutputTokens: this.maxOutputTokens,
              temperature: this.temperature,
              // User overrides from AI SDK options
              ...aiSDKOptions,
              maxRetries: 0,
              // Provider-specific options
              providerOptions,
              // VoltAgent controlled
              abortSignal: oc.abortController.signal,
              onError: async (errorData) => {
                // Handle nested error structure from OpenAI and other providers
                // The error might be directly the error or wrapped in { error: ... }
                const actualError = (errorData as any)?.error || errorData;
                attemptState.lastError = actualError;

                const fallbackEligible = this.shouldFallbackOnError(actualError);
                const retryEligible = fallbackEligible && this.isRetryableError(actualError);
                const canRetry = retryEligible && !isLastAttempt;
                const canFallback = fallbackEligible && !isLastModel;
                const shouldAttemptRecovery = !attemptState.hasOutput && (canRetry || canFallback);
                const recoveryMessage = canRetry
                  ? "[LLM] Stream object error before output; retry pending"
                  : canFallback
                    ? "[LLM] Stream object error before output; fallback pending"
                    : attemptState.hasOutput
                      ? "[LLM] Stream object error after output; recovery skipped"
                      : "[LLM] Stream object error before output; recovery skipped";

                // Log the error
                methodLogger.error("Stream object error occurred", {
                  error: actualError,
                  agentName: this.name,
                  modelName: resolvedModelName,
                  schemaName: schemaName,
                  attempt,
                  maxRetries,
                });

                methodLogger.debug(recoveryMessage, {
                  operation: "streamObject",
                  modelName: resolvedModelName,
                  fallbackEligible,
                  retryEligible,
                  canRetry,
                  canFallback,
                  hasOutput: attemptState.hasOutput,
                  attempt,
                  maxRetries,
                  isLastAttempt,
                  isLastModel,
                  isRetryable: (actualError as any)?.isRetryable,
                  statusCode: (actualError as any)?.statusCode,
                  errorName: (actualError as Error)?.name,
                  errorMessage: (actualError as Error)?.message,
                });

                // History update removed - using OpenTelemetry only

                // Event tracking now handled by OpenTelemetry spans

                if (shouldAttemptRecovery) {
                  await flushObservability(
                    this.getObservability(),
                    oc.logger ?? this.logger,
                    this.observabilityAuthWarningState,
                    "streamObject:onError",
                  );
                  return;
                }

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
                // Ensure spans are flushed on error
                // Uses waitUntil if available to avoid blocking
                await flushObservability(
                  this.getObservability(),
                  oc.logger ?? this.logger,
                  this.observabilityAuthWarningState,
                  "streamObject:onError",
                );
              },
              onFinish: async (finalResult: any) => {
                try {
                  const providerUsage = finalResult.usage
                    ? await Promise.resolve(finalResult.usage)
                    : undefined;
                  const usageForFinish = resolveFinishUsage({
                    providerMetadata: finalResult.providerMetadata,
                    usage: providerUsage,
                    totalUsage: (finalResult as { totalUsage?: LanguageModelUsage }).totalUsage,
                  });
                  const usageInfo = convertUsage(usageForFinish);
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
                  this.setTraceContextUsage(oc.traceContext, usageForFinish);
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

                  const tokenInfo = usageForFinish
                    ? `${usageForFinish.totalTokens} tokens`
                    : "no usage data";
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
                      usage: usageForFinish,
                      schemaName,
                    },
                  );

                  this.enqueueEvalScoring({
                    oc,
                    output: finalObject,
                    operation: "streamObject",
                    metadata: {
                      finishReason: finalResult.finishReason,
                      usage: usageForFinish ? JSON.parse(safeStringify(usageForFinish)) : undefined,
                      schemaName,
                    },
                  });

                  oc.traceContext.end("completed");

                  // Ensure all spans are exported on finish
                  // Uses waitUntil if available to avoid blocking
                  await flushObservability(
                    this.getObservability(),
                    oc.logger ?? this.logger,
                    this.observabilityAuthWarningState,
                    "streamObject:onFinish",
                  );
                } catch (error) {
                  rejectGuardrailObject?.(error);
                  throw error;
                }
              },
            });

            const probeResult = await this.probeStreamStart(streamResult.fullStream, attemptState);
            if (probeResult.status === "error") {
              this.discardStream(streamResult.fullStream);
              const fallbackEligible = this.shouldFallbackOnError(probeResult.error);
              if (!fallbackEligible || isLastModel) {
                throw probeResult.error;
              }
              throw probeResult.error;
            }

            return streamResult;
          },
        });

        addModelAttributesToSpan(
          rootSpan,
          effectiveModelName,
          options,
          this.maxOutputTokens,
          this.temperature,
        );

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
        // Ensure spans are exported on pre-stream errors
        await flushObservability(
          this.getObservability(),
          oc.logger ?? this.logger,
          this.observabilityAuthWarningState,
          "streamObject:preStreamError",
        );
        return this.handleError(error as Error, oc, options, 0);
      } finally {
        // No need to flush here for streams - handled in onFinish/onError
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

  private resolveMiddlewareSets(options?: {
    inputMiddlewares?: InputMiddleware[];
    outputMiddlewares?: OutputMiddleware<any>[];
  }): {
    input: NormalizedInputMiddleware[];
    output: NormalizedOutputMiddleware[];
  } {
    const optionInput = options?.inputMiddlewares
      ? normalizeInputMiddlewareList(options.inputMiddlewares, this.inputMiddlewares.length)
      : [];
    const optionOutput = options?.outputMiddlewares
      ? normalizeOutputMiddlewareList(options.outputMiddlewares, this.outputMiddlewares.length)
      : [];

    return {
      input: [...this.inputMiddlewares, ...optionInput],
      output: [...this.outputMiddlewares, ...optionOutput],
    };
  }

  private resolveMiddlewareRetries(options?: BaseGenerationOptions): number {
    const optionRetries = options?.maxMiddlewareRetries;
    if (typeof optionRetries === "number" && Number.isFinite(optionRetries)) {
      return Math.max(0, optionRetries);
    }
    if (Number.isFinite(this.maxMiddlewareRetries)) {
      return Math.max(0, this.maxMiddlewareRetries);
    }
    return 0;
  }

  private storeMiddlewareRetryFeedback(
    oc: OperationContext,
    reason?: string,
    metadata?: unknown,
  ): void {
    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    const baseReason = trimmedReason.length > 0 ? trimmedReason : "Middleware requested a retry.";
    let feedback = `[Middleware Feedback] ${baseReason} Please retry with the feedback in mind.`;
    if (metadata !== undefined) {
      feedback = `${feedback}\nMetadata: ${safeStringify(metadata)}`;
    }
    oc.systemContext.set(MIDDLEWARE_RETRY_FEEDBACK_KEY, feedback);
  }

  private consumeMiddlewareRetryFeedback(oc: OperationContext): string | null {
    const feedback = oc.systemContext.get(MIDDLEWARE_RETRY_FEEDBACK_KEY);
    if (typeof feedback === "string" && feedback.trim().length > 0) {
      oc.systemContext.delete(MIDDLEWARE_RETRY_FEEDBACK_KEY);
      return feedback;
    }
    return null;
  }

  private shouldRetryMiddleware(error: unknown, retryCount: number, maxRetries: number): boolean {
    if (!isMiddlewareAbortError(error)) {
      return false;
    }
    return Boolean(error.retry) && retryCount < maxRetries;
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
    modelName: string;
    tools: Record<string, any>;
    maxSteps: number;
  }> {
    // Prepare messages (system + memory + input) as UIMessages
    const buffer = this.getConversationBuffer(oc);
    const uiMessages = await this.prepareMessages(input, oc, options, buffer);

    // Convert UIMessages to ModelMessages for the LLM
    const hooks = this.getMergedHooks(options);
    let messages = await convertToModelMessages(uiMessages);

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

    const modelName = this.getModelName();
    const dynamicToolList = (await this.resolveValue(this.dynamicTools, oc)) || [];

    // Merge agent tools with option tools
    const optionToolsArray = options?.tools || [];
    const adHocTools = [...dynamicToolList, ...optionToolsArray];

    // Prepare tools with execution context
    const tools = await this.prepareTools(adHocTools, oc, maxSteps, options);

    return {
      messages,
      uiMessages,
      modelName,
      tools,
      maxSteps,
    };
  }

  private collectToolDataFromResult<TOOLS extends ToolSet, OUTPUT extends OutputSpec>(
    result: GenerateTextResult<TOOLS, OUTPUT>,
  ): {
    toolCalls: GenerateTextResult<TOOLS, OUTPUT>["toolCalls"];
    toolResults: GenerateTextResult<TOOLS, OUTPUT>["toolResults"];
  } {
    const steps = result.steps ?? [];

    const stepToolCalls = steps.flatMap((step) => step.toolCalls ?? []);
    const stepToolResults = steps.flatMap((step) => step.toolResults ?? []);

    return {
      toolCalls: stepToolCalls.length > 0 ? stepToolCalls : (result.toolCalls ?? []),
      toolResults: stepToolResults.length > 0 ? stepToolResults : (result.toolResults ?? []),
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

    const activeTriggerContext = otelContext.active().getValue(TRIGGER_CONTEXT_KEY);
    if (activeTriggerContext instanceof Map) {
      for (const [key, value] of activeTriggerContext.entries()) {
        if (!context.has(key)) {
          context.set(key, value);
        }
      }
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
      inheritParentSpan: options?.inheritParentSpan ?? this.inheritParentSpan,
      parentAgentId: options?.parentAgentId,
      input,
    });
    traceContext.getRootSpan().setAttribute("voltagent.operation_id", operationId);

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
    systemContext.set(AGENT_METADATA_CONTEXT_KEY, {
      agentId: this.id,
      agentName: this.name,
    });
    systemContext.set(AGENT_REF_CONTEXT_KEY, this);

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

  private resetOperationAttemptState(oc: OperationContext): void {
    oc.systemContext.set(BUFFER_CONTEXT_KEY, new ConversationBuffer(undefined, oc.logger));
    oc.systemContext.set(
      QUEUE_CONTEXT_KEY,
      new MemoryPersistQueue(this.memoryManager, { debounceMs: 200, logger: oc.logger }),
    );
    oc.systemContext.delete(STEP_PERSIST_COUNT_KEY);
    oc.systemContext.delete("conversationSteps");
    oc.systemContext.delete("bailedResult");
    oc.conversationSteps = [];
    oc.output = undefined;
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

  private createLLMSpan(
    oc: OperationContext,
    params: {
      operation: LLMOperation;
      modelName: string;
      isStreaming: boolean;
      messages?: Array<{ role: string; content: unknown }>;
      tools?: ToolSet;
      providerOptions?: ProviderOptions;
      callOptions?: Record<string, unknown>;
      label?: string;
    },
  ): Span {
    const { label, ...spanParams } = params;
    const attributes = this.buildLLMSpanAttributes(spanParams);
    const span = oc.traceContext.createChildSpan(`llm:${params.operation}`, "llm", {
      kind: SpanKind.CLIENT,
      label,
      attributes,
    });
    return span;
  }

  private createLLMSpanFinalizer(span: Span) {
    let ended = false;
    return (
      status: SpanStatusCode,
      details?: {
        message?: string;
        usage?: LanguageModelUsage | UsageInfo | null;
        finishReason?: FinishReason | string | null;
      },
    ) => {
      if (ended) {
        return;
      }
      if (details?.usage) {
        this.recordLLMUsage(span, details.usage);
      }
      if (details?.finishReason) {
        span.setAttribute("llm.finish_reason", String(details.finishReason));
      }
      if (details?.message) {
        span.setStatus({ code: status, message: details.message });
      } else {
        span.setStatus({ code: status });
      }
      span.end();
      ended = true;
    };
  }

  private buildLLMSpanAttributes(params: {
    operation: LLMOperation;
    modelName: string;
    isStreaming: boolean;
    messages?: Array<{ role: string; content: unknown }>;
    tools?: ToolSet;
    providerOptions?: ProviderOptions;
    callOptions?: Record<string, unknown>;
  }): Record<string, any> {
    const attrs: Record<string, any> = {
      "llm.operation": params.operation,
      "llm.model": params.modelName,
      "llm.stream": params.isStreaming,
    };
    const provider = params.modelName?.includes("/") ? params.modelName.split("/")[0] : undefined;
    if (provider) {
      attrs["llm.provider"] = provider;
    }

    const callOptions = params.callOptions ?? {};
    const maybeNumber = (value: unknown): number | undefined => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
      }
      if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const temperature = maybeNumber(callOptions.temperature ?? callOptions.temp ?? undefined);
    if (temperature !== undefined) {
      attrs["llm.temperature"] = temperature;
    }
    const maxOutputTokens = maybeNumber(callOptions.maxOutputTokens);
    if (maxOutputTokens !== undefined) {
      attrs["llm.max_output_tokens"] = maxOutputTokens;
    }
    const maxRetries = maybeNumber(callOptions.maxRetries ?? callOptions.max_retries);
    if (maxRetries !== undefined) {
      attrs["llm.max_retries"] = maxRetries;
    }
    const modelId = callOptions.modelId ?? callOptions.model_id;
    if (typeof modelId === "string" && modelId.length > 0) {
      attrs["llm.model_id"] = modelId;
    }
    const attempt = maybeNumber(callOptions.attempt ?? callOptions.attempt_index);
    if (attempt !== undefined) {
      attrs["llm.attempt"] = attempt;
    }
    const modelIndex = maybeNumber(callOptions.modelIndex ?? callOptions.model_index);
    if (modelIndex !== undefined) {
      attrs["llm.model_index"] = modelIndex;
    }
    const topP = maybeNumber(callOptions.topP);
    if (topP !== undefined) {
      attrs["llm.top_p"] = topP;
    }
    if (callOptions.stop !== undefined) {
      attrs["llm.stop_condition"] = safeStringify(callOptions.stop);
    }
    if (params.messages && params.messages.length > 0) {
      attrs["llm.messages.count"] = params.messages.length;
      const trimmedMessages = params.messages.slice(-10);
      attrs["llm.messages"] = safeStringify(
        trimmedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      );
    }
    if (params.tools) {
      const toolNames = Object.keys(params.tools);
      attrs["llm.tools.count"] = toolNames.length;
      if (toolNames.length > 0) {
        attrs["llm.tools"] = toolNames.join(",");
      }
    }
    if (params.providerOptions) {
      attrs["llm.provider_options"] = safeStringify(params.providerOptions);
    }
    return attrs;
  }

  private recordLLMUsage(span: Span, usage?: LanguageModelUsage | UsageInfo | null): void {
    if (!usage) {
      return;
    }

    const normalizedUsage =
      "promptTokens" in usage ? (usage as UsageInfo) : convertUsage(usage as LanguageModelUsage);

    if (!normalizedUsage) {
      return;
    }

    const { promptTokens, completionTokens, totalTokens } = normalizedUsage;

    if (promptTokens !== undefined) {
      span.setAttribute("llm.usage.prompt_tokens", promptTokens);
    }
    if (completionTokens !== undefined) {
      span.setAttribute("llm.usage.completion_tokens", completionTokens);
    }
    if (totalTokens !== undefined) {
      span.setAttribute("llm.usage.total_tokens", totalTokens);
    }
  }

  private createEvalHost(): AgentEvalHost {
    return {
      id: this.id,
      name: this.name,
      logger: this.logger,
      evalConfig: this.evalConfig,
      getObservability: () => this.getObservability(),
      getVoltOpsClient: () => {
        const client = this.voltOpsClient || AgentRegistry.getInstance().getGlobalVoltOpsClient();
        if (!client || typeof client.hasValidKeys !== "function") {
          return undefined;
        }
        if (!client.hasValidKeys()) {
          return undefined;
        }
        return client;
      },
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

  private resolveFeedbackOptions(
    options?: BaseGenerationOptions,
  ): AgentFeedbackOptions | undefined {
    const raw = options?.feedback ?? this.feedbackOptions;
    if (!raw) {
      return undefined;
    }
    if (raw === true) {
      return {};
    }
    return raw;
  }

  private getFeedbackTraceId(oc: OperationContext): string | undefined {
    try {
      return oc.traceContext.getRootSpan().spanContext().traceId;
    } catch {
      return undefined;
    }
  }

  private getFeedbackClient(): VoltOpsClient | undefined {
    const voltOpsClient =
      this.voltOpsClient || AgentRegistry.getInstance().getGlobalVoltOpsClient();
    if (!voltOpsClient || typeof voltOpsClient.hasValidKeys !== "function") {
      return undefined;
    }
    if (!voltOpsClient.hasValidKeys()) {
      return undefined;
    }
    return voltOpsClient;
  }

  private async createFeedbackMetadata(
    oc: OperationContext,
    options?: BaseGenerationOptions,
  ): Promise<AgentFeedbackMetadata | null> {
    const feedbackOptions = this.resolveFeedbackOptions(options);
    if (!feedbackOptions) {
      return null;
    }

    const voltOpsClient = this.getFeedbackClient();
    if (!voltOpsClient) {
      return null;
    }

    const traceId = this.getFeedbackTraceId(oc);
    if (!traceId) {
      return null;
    }

    const key = feedbackOptions.key?.trim() || DEFAULT_FEEDBACK_KEY;

    try {
      const token = await voltOpsClient.createFeedbackToken({
        traceId,
        key,
        feedbackConfig: feedbackOptions.feedbackConfig ?? null,
        expiresAt: feedbackOptions.expiresAt,
        expiresIn: feedbackOptions.expiresIn,
      });

      return {
        traceId,
        key,
        url: token.url,
        tokenId: token.id,
        expiresAt: token.expiresAt,
        feedbackConfig: token.feedbackConfig ?? feedbackOptions.feedbackConfig ?? null,
      };
    } catch (error) {
      oc.logger.debug("Failed to create feedback token", {
        traceId,
        key,
        error,
      });
      return null;
    }
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

  private createConversationTitleGenerator(
    memory?: Memory,
  ): ConversationTitleGenerator | undefined {
    const rawConfig = memory?.getTitleGenerationConfig?.();
    if (!rawConfig) {
      return undefined;
    }

    const normalized: ConversationTitleConfig =
      typeof rawConfig === "boolean" ? { enabled: rawConfig } : { ...rawConfig };
    const enabled = normalized.enabled ?? true;
    if (!enabled) {
      return undefined;
    }

    const systemPrompt =
      normalized.systemPrompt === undefined
        ? DEFAULT_CONVERSATION_TITLE_PROMPT
        : (normalized.systemPrompt ?? "");
    const maxOutputTokens =
      typeof normalized.maxOutputTokens === "number" && Number.isFinite(normalized.maxOutputTokens)
        ? Math.max(1, normalized.maxOutputTokens)
        : DEFAULT_CONVERSATION_TITLE_MAX_OUTPUT_TOKENS;
    const maxLength =
      typeof normalized.maxLength === "number" && Number.isFinite(normalized.maxLength)
        ? Math.max(1, normalized.maxLength)
        : DEFAULT_CONVERSATION_TITLE_MAX_CHARS;

    const modelOverride = normalized.model;

    return async ({ input, context }) => {
      const inputForQuery = typeof input === "string" || Array.isArray(input) ? input : [input];
      const query = this.extractUserQuery(inputForQuery as string | UIMessage[] | BaseMessage[]);
      const trimmed = query?.trim();
      if (!trimmed) {
        return null;
      }

      const limitedInput =
        trimmed.length > CONVERSATION_TITLE_INPUT_MAX_CHARS
          ? trimmed.slice(0, CONVERSATION_TITLE_INPUT_MAX_CHARS)
          : trimmed;

      try {
        const resolvedModel = await this.resolveModel(modelOverride ?? this.model, context);
        const messages: Array<{ role: "system" | "user"; content: string }> = [];
        if (systemPrompt.trim()) {
          messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: limitedInput });
        const modelName = this.getModelName(resolvedModel);
        const llmSpan = this.createLLMSpan(context, {
          operation: "generateTitle",
          modelName,
          isStreaming: false,
          messages,
          callOptions: {
            temperature: 0,
            maxOutputTokens,
          },
          label: "Generate Conversation Title",
        });
        llmSpan.setAttribute("input", limitedInput);
        const finalizeLLMSpan = this.createLLMSpanFinalizer(llmSpan);

        try {
          const result = await context.traceContext.withSpan(llmSpan, () =>
            generateText({
              model: resolvedModel,
              messages,
              temperature: 0,
              maxOutputTokens,
              abortSignal: context.abortController.signal,
            }),
          );

          const resolvedUsage = result.usage ? await Promise.resolve(result.usage) : undefined;
          const title = sanitizeConversationTitle(result.text ?? "", maxLength);
          if (title) {
            llmSpan.setAttribute("output", title);
          }
          finalizeLLMSpan(SpanStatusCode.OK, {
            usage: resolvedUsage,
            finishReason: result.finishReason,
          });

          return title || null;
        } catch (error) {
          finalizeLLMSpan(SpanStatusCode.ERROR, { message: (error as Error).message });
          throw error;
        }
      } catch (error) {
        context.logger.debug("[Memory] Failed to generate conversation title", {
          error: safeStringify(error),
        });
        return null;
      }
    };
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

    const middlewareRetryFeedback = this.consumeMiddlewareRetryFeedback(oc);
    if (middlewareRetryFeedback) {
      messages.push({
        id: randomUUID(),
        role: "system",
        parts: [{ type: "text", text: middlewareRetryFeedback }],
      });
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
        const inputMessages = input as UIMessage[];
        const idsToReplace = new Set(
          inputMessages
            .map((message) => message.id)
            .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
        );

        if (idsToReplace.size > 0) {
          for (let index = messages.length - 1; index >= 0; index--) {
            if (idsToReplace.has(messages[index].id)) {
              messages.splice(index, 1);
            }
          }
        }

        messages.push(...inputMessages);
      } else {
        messages.push(...convertModelMessagesToUIMessages(input as BaseMessage[]));
      }
    }

    // Sanitize messages before passing them to the model-layer hooks
    const sanitizedMessages = sanitizeMessagesForModel(messages);
    const summarizedMessages = await applySummarization({
      messages: sanitizedMessages,
      operationContext: oc,
      summarization: this.summarization,
      model: this.model,
      resolveModel: this.resolveModel.bind(this),
      agent: this,
    });

    // Allow hooks to modify sanitized messages (while exposing the raw set when needed)
    const hooks = this.getMergedHooks(options);
    if (hooks.onPrepareMessages) {
      const result = await hooks.onPrepareMessages({
        messages: summarizedMessages,
        rawMessages: messages,
        agent: this,
        context: oc,
      });
      return result?.messages || summarizedMessages;
    }

    return summarizedMessages;
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
        if (metadata.source) {
          rootSpan.setAttribute("prompt.source", metadata.source);
        }
        if (metadata.latest_version !== undefined) {
          rootSpan.setAttribute("prompt.latest_version", metadata.latest_version);
        }
        if (metadata.outdated !== undefined) {
          rootSpan.setAttribute("prompt.outdated", metadata.outdated);
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
        const baseContent = promptContent.text || "";
        const content = await this.enrichInstructions(
          baseContent,
          retrieverContext,
          workingMemoryContext,
          oc,
        );

        return {
          role: "system",
          content: `${content}`,
        };
      }
    }

    // Default string instructions
    const baseContent = typeof resolvedInstructions === "string" ? resolvedInstructions : "";
    const content = await this.enrichInstructions(
      baseContent,
      retrieverContext,
      workingMemoryContext,
      oc,
    );

    return {
      role: "system",
      content: `${content}`,
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
   * Enrich instructions with additional context and modifiers
   */
  private async enrichInstructions(
    baseContent: string,
    retrieverContext: string | null,
    workingMemoryContext: string | null,
    oc: OperationContext,
  ): Promise<string> {
    let content = baseContent;

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

    return content;
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
        ...this.getRetrieverObservabilityAttributes(),
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
            : await convertToModelMessages(input as UIMessage[]);

      // Execute retriever with the span context
      const retrievedContent = await oc.traceContext.withSpan(retrieverSpan, async () => {
        if (!this.retriever) return null;
        return await this.retriever.retrieve(retrieverInput, {
          ...oc,
          logger: retrieverLogger,
        });
      });

      if (retrievedContent?.trim()) {
        const documentCount = retrievedContent
          .split("\n")
          .filter((line: string) => line.trim()).length;
        const durationMs = Date.now() - startTime;

        retrieverLogger.debug(
          buildAgentLogMessage(
            this.name,
            ActionType.COMPLETE,
            `Retrieved ${documentCount} documents`,
          ),
          {
            event: LogEvents.RETRIEVER_SEARCH_COMPLETED,
            documentCount,
            duration: durationMs,
          },
        );

        // Event tracking now handled by OpenTelemetry spans

        // End OpenTelemetry span successfully
        oc.traceContext?.endChildSpan(retrieverSpan, "completed", {
          output: retrievedContent,
          attributes: {
            "retriever.document_count": documentCount,
            ...this.getRetrieverObservabilityAttributes(),
          },
        });

        return retrievedContent;
      }

      // End span if no content retrieved
      oc.traceContext?.endChildSpan(retrieverSpan, "completed", {
        output: null,
        attributes: {
          "retriever.document_count": 0,
          ...this.getRetrieverObservabilityAttributes(),
        },
      });

      return null;
    } catch (error) {
      // Event tracking now handled by OpenTelemetry spans

      // End OpenTelemetry span with error
      const durationMs = Date.now() - startTime;

      oc.traceContext.endChildSpan(retrieverSpan, "error", {
        error: error as Error,
        attributes: {
          ...this.getRetrieverObservabilityAttributes(),
        },
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
          duration: durationMs,
        },
      );

      this.logger.warn("Failed to retrieve context", { error, agentId: this.id });
      return null;
    }
  }

  private getRetrieverObservabilityAttributes(): Record<string, unknown> {
    const candidate = this.retriever as
      | {
          getObservabilityAttributes?: () => Record<string, unknown>;
        }
      | undefined;

    if (candidate && typeof candidate.getObservabilityAttributes === "function") {
      return candidate.getObservabilityAttributes();
    }

    return {};
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

  private getModelCandidates(): AgentModelConfig[] {
    if (Array.isArray(this.model)) {
      if (this.model.length === 0) {
        throw createVoltAgentError("Model list is empty", { code: "MODEL_LIST_EMPTY" });
      }

      return this.model.map((entry) => ({
        id: entry.id,
        model: entry.model,
        maxRetries: entry.maxRetries,
        enabled: entry.enabled ?? true,
      }));
    }

    return [
      {
        model: this.model,
        maxRetries: this.maxRetries,
        enabled: true,
      },
    ];
  }

  private async resolveModelReference(
    value: AgentModelConfig["model"],
    oc: OperationContext,
  ): Promise<LanguageModel> {
    const resolved = await this.resolveValue(value, oc);
    if (typeof resolved === "string") {
      return await ModelProviderRegistry.getInstance().resolveLanguageModel(resolved);
    }
    return resolved;
  }

  /**
   * Resolve agent model value (LanguageModel or provider/model string)
   */
  private async resolveModel(value: AgentModelValue, oc: OperationContext): Promise<LanguageModel> {
    if (Array.isArray(value)) {
      const enabledModels = value.filter((entry) => entry.enabled !== false);
      if (enabledModels.length === 0) {
        throw createVoltAgentError("No enabled models configured", { code: "MODEL_LIST_EMPTY" });
      }
      return await this.resolveModelReference(enabledModels[0].model, oc);
    }

    return await this.resolveModelReference(value, oc);
  }

  private resolveCallMaxRetries(
    candidate: AgentModelConfig,
    options?: BaseGenerationOptions,
  ): number {
    const optionRetries = options?.maxRetries;
    if (typeof optionRetries === "number" && Number.isFinite(optionRetries)) {
      return Math.max(0, optionRetries);
    }
    if (typeof candidate.maxRetries === "number" && Number.isFinite(candidate.maxRetries)) {
      return Math.max(0, candidate.maxRetries);
    }
    if (Number.isFinite(this.maxRetries)) {
      return Math.max(0, this.maxRetries);
    }
    return DEFAULT_LLM_MAX_RETRIES;
  }

  private shouldFallbackOnError(error: unknown): boolean {
    if (isBailError(error)) {
      return false;
    }

    if (error instanceof Error && error.name === "AbortError") {
      return false;
    }

    if (isVoltAgentError(error)) {
      if (error.code === "GUARDRAIL_INPUT_BLOCKED" || error.code === "GUARDRAIL_OUTPUT_BLOCKED") {
        return false;
      }
      if (error.stage === "tool_execution") {
        return false;
      }
    }

    return true;
  }

  private isRetryableError(error: unknown): boolean {
    const retryable = (error as { isRetryable?: boolean } | undefined)?.isRetryable;
    if (typeof retryable === "boolean") {
      return retryable;
    }
    return true;
  }

  private async executeWithModelFallback<T>({
    oc,
    operation,
    options,
    run,
  }: {
    oc: OperationContext;
    operation: LLMOperation;
    options?: BaseGenerationOptions;
    run: (args: {
      model: LanguageModel;
      modelName: string;
      modelId?: string;
      maxRetries: number;
      modelIndex: number;
      isLastModel: boolean;
      attempt: number;
      isLastAttempt: boolean;
    }) => Promise<T>;
  }): Promise<{
    result: T;
    modelName: string;
    modelIndex: number;
    maxRetries: number;
  }> {
    const logger = oc.logger ?? this.logger;
    const hooks = this.getMergedHooks(options);
    const candidates = this.getModelCandidates().filter((entry) => entry.enabled !== false);

    if (candidates.length === 0) {
      throw createVoltAgentError("No enabled models configured", { code: "MODEL_LIST_EMPTY" });
    }

    logger.debug(`[Agent:${this.name}] - Model fallback candidates`, {
      operation,
      candidates: candidates.map((candidate, index) => ({
        index,
        id: candidate.id ?? null,
        enabled: candidate.enabled ?? true,
        model:
          typeof candidate.model === "string"
            ? candidate.model
            : typeof candidate.model === "function"
              ? "dynamic"
              : candidate.model?.modelId || "unknown",
        maxRetries: candidate.maxRetries ?? null,
      })),
    });

    let lastError: unknown;

    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      const isLastModel = index === candidates.length - 1;
      let resolvedModel: LanguageModel;
      let modelName = "unknown";

      try {
        resolvedModel = await this.resolveModelReference(candidate.model, oc);
        modelName = this.getModelName(resolvedModel);
      } catch (error) {
        lastError = error;
        if (oc.abortController.signal.aborted) {
          throw error;
        }
        const candidateModelName =
          typeof candidate.model === "string"
            ? candidate.model
            : typeof candidate.model === "function"
              ? (candidate.id ?? "dynamic")
              : (candidate.model?.modelId ?? candidate.id ?? "unknown");
        const modelMaxRetries = this.resolveCallMaxRetries(candidate, options);
        const resolveSpan = this.createLLMSpan(oc, {
          operation,
          modelName: candidateModelName,
          isStreaming: operation === "streamText" || operation === "streamObject",
          callOptions: {
            maxRetries: modelMaxRetries,
            modelIndex: index,
            attempt: 1,
            modelId: candidate.id,
          },
        });
        resolveSpan.setAttribute("llm.model_resolution_failed", true);
        const resolveError = error instanceof Error ? error : new Error(String(error));
        resolveSpan.recordException(resolveError);
        resolveSpan.setStatus({ code: SpanStatusCode.ERROR, message: resolveError.message });
        resolveSpan.end();
        if (!this.shouldFallbackOnError(error) || isLastModel) {
          throw error;
        }
        const nextCandidate = candidates[index + 1];
        const nextCandidateName =
          typeof nextCandidate?.model === "string"
            ? nextCandidate.model
            : typeof nextCandidate?.model === "function"
              ? (nextCandidate?.id ?? "dynamic")
              : (nextCandidate?.model?.modelId ?? nextCandidate?.id ?? null);
        await hooks.onFallback?.({
          agent: this,
          context: oc,
          operation,
          stage: "resolve",
          fromModel: candidateModelName,
          fromModelIndex: index,
          maxRetries: modelMaxRetries,
          error,
          nextModel: nextCandidateName,
          nextModelIndex: nextCandidate ? index + 1 : undefined,
        });
        logger.warn(`[Agent:${this.name}] - Failed to resolve model, falling back`, {
          error: safeStringify(error),
          modelIndex: index,
          operation,
        });
        continue;
      }

      const maxRetries = this.resolveCallMaxRetries(candidate, options);
      let attemptIndex = 0;

      while (attemptIndex <= maxRetries) {
        const attempt = attemptIndex + 1;
        const isLastAttempt = attemptIndex === maxRetries;

        try {
          const result = await run({
            model: resolvedModel,
            modelName,
            modelId: candidate.id,
            maxRetries,
            modelIndex: index,
            isLastModel,
            attempt,
            isLastAttempt,
          });
          return { result, modelName, modelIndex: index, maxRetries };
        } catch (error) {
          lastError = error;
          if (oc.abortController.signal.aborted) {
            throw error;
          }
          const fallbackEligible = this.shouldFallbackOnError(error);
          const retryEligible = fallbackEligible && this.isRetryableError(error);
          const canRetry = retryEligible && !isLastAttempt;

          if (canRetry) {
            const retryDelayMs = Math.min(1000 * 2 ** attemptIndex, 10000);
            logger.debug(`[Agent:${this.name}] - Model attempt failed, retrying`, {
              operation,
              modelName,
              modelIndex: index,
              attempt,
              nextAttempt: attempt + 1,
              maxRetries,
              retryDelayMs,
              fallbackEligible,
              retryEligible,
              isRetryable: (error as any)?.isRetryable,
              statusCode: (error as any)?.statusCode,
              error: safeStringify(error),
            });
            await hooks.onRetry?.({
              agent: this,
              context: oc,
              operation,
              source: "llm",
              modelName,
              modelIndex: index,
              attempt,
              nextAttempt: attempt + 1,
              maxRetries,
              error,
              isRetryable: (error as any)?.isRetryable,
              statusCode: (error as any)?.statusCode,
            });

            attemptIndex += 1;
            if (retryDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
            continue;
          }

          if (!fallbackEligible || isLastModel) {
            logger.debug(`[Agent:${this.name}] - Fallback skipped`, {
              operation,
              modelName,
              modelIndex: index,
              attempt,
              maxRetries,
              fallbackEligible,
              retryEligible,
              isLastModel,
              error: safeStringify(error),
            });
            throw error;
          }

          const nextCandidate = candidates[index + 1];
          const nextCandidateName =
            typeof nextCandidate?.model === "string"
              ? nextCandidate.model
              : typeof nextCandidate?.model === "function"
                ? (nextCandidate?.id ?? "dynamic")
                : (nextCandidate?.model?.modelId ?? nextCandidate?.id ?? null);
          await hooks.onFallback?.({
            agent: this,
            context: oc,
            operation,
            stage: "execute",
            fromModel: modelName,
            fromModelIndex: index,
            maxRetries,
            attempt,
            error,
            nextModel: nextCandidateName,
            nextModelIndex: nextCandidate ? index + 1 : undefined,
          });
          logger.warn(`[Agent:${this.name}] - Model failed, trying fallback`, {
            error: safeStringify(error),
            modelName,
            modelIndex: index,
            operation,
            attempt,
            maxRetries,
          });
          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Model execution failed");
  }

  private async probeStreamStart<PART extends { type?: string }>(
    stream: AsyncIterableStream<PART>,
    state: { hasOutput: boolean; lastError?: unknown },
  ): Promise<{ status: "ok" } | { status: "error"; error: unknown }> {
    const readableStream = stream as ReadableStream<PART>;
    const reader =
      readableStream && typeof readableStream.getReader === "function"
        ? readableStream.getReader()
        : null;
    if (!reader) {
      return { status: "ok" };
    }
    let sawNonStart = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }
        const partType = (value as { type?: string }).type;
        if (partType === "start") {
          continue;
        }
        sawNonStart = true;
        if (partType === "error") {
          const error =
            (value as { error?: unknown }).error ??
            state.lastError ??
            new Error("Stream error before output");
          return { status: "error", error };
        }
        state.hasOutput = true;
        return { status: "ok" };
      }
    } catch (error) {
      return { status: "error", error: state.lastError ?? error };
    } finally {
      try {
        await reader.cancel();
      } catch (_) {
        // Ignore probe cancellation errors.
      }
    }

    const error = state.lastError ?? new Error("Stream ended before output");
    return sawNonStart ? { status: "ok" } : { status: "error", error };
  }

  private discardStream(stream: AsyncIterableStream<unknown>): void {
    void consumeStream({ stream, onError: () => {} }).catch(() => {});
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
    const hooks = this.getMergedHooks(options);
    const createToolExecuteFunction = this.createToolExecutionFactory(oc, hooks);

    const runtimeTools: (BaseTool | Toolkit)[] = [...adHocTools];

    // Add delegate tool if we have subagents
    if (this.subAgentManager.hasSubAgents()) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this,
        currentHistoryEntryId: oc.operationId,
        operationContext: oc,
        maxSteps: maxSteps,
        conversationId: options?.conversationId,
        userId: options?.userId,
      });
      runtimeTools.push(delegateTool);
    }
    // Add working memory tools if Memory V2 with working memory is configured
    const workingMemoryTools = this.createWorkingMemoryTools(options);
    if (workingMemoryTools.length > 0) {
      runtimeTools.push(...workingMemoryTools);
    }

    const tempManager = new ToolManager(runtimeTools, this.logger);

    const preparedDynamicTools = tempManager.prepareToolsForExecution(createToolExecuteFunction);
    const preparedStaticTools =
      this.toolManager.prepareToolsForExecution(createToolExecuteFunction);

    const toolRouting = this.resolveToolRouting(options);
    oc.systemContext.set(TOOL_ROUTING_CONTEXT_KEY, toolRouting);
    if (toolRouting === false) {
      const supportNames = this.getToolRoutingSupportToolNames();
      const allNames = new Set([
        ...Object.keys(preparedStaticTools),
        ...Object.keys(preparedDynamicTools),
      ]);
      const conflicts = [...allNames].filter((name) => supportNames.has(name));
      if (conflicts.length > 0) {
        throw new Error(
          [
            "toolRouting is disabled but reserved routing tool names are in use:",
            conflicts.join(", "),
            "Rename these tools or enable toolRouting to use the built-in names.",
          ].join(" "),
        );
      }

      return { ...preparedStaticTools, ...preparedDynamicTools };
    }

    if (!toolRouting) {
      return { ...preparedStaticTools, ...preparedDynamicTools };
    }

    const exposedNames = this.getToolRoutingExposedNames(toolRouting);
    const filteredStaticTools = Object.fromEntries(
      Object.entries(preparedStaticTools).filter(([name]) => exposedNames.has(name)),
    );

    return { ...filteredStaticTools, ...preparedDynamicTools };
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

  private createToolExecutionFactory(
    oc: OperationContext,
    hooks: AgentHooks,
  ): (tool: BaseTool) => (args: any, options?: ToolExecutionOptions) => ToolExecutionResult<any> {
    return (tool: BaseTool) => (args: any, options?: ToolExecutionOptions) => {
      // AI SDK passes ToolExecutionOptions with fields: toolCallId, messages, abortSignal
      const toolCallId = options?.toolCallId ?? randomUUID();
      const messages = options?.messages ?? [];
      const abortSignal = options?.abortSignal;

      // Convert ToolExecutionOptions to ToolExecuteOptions by merging with OperationContext
      const executionOptions: ToolExecuteOptions = {
        ...oc,
        toolContext: {
          name: tool.name,
          callId: toolCallId,
          messages: messages,
          abortSignal: abortSignal,
        },
      };
      executionOptions.hooks = hooks;

      // Event tracking now handled by OpenTelemetry spans
      const toolTags = (tool as { tags?: string[] | undefined }).tags;
      const toolSpan = oc.traceContext.createChildSpan(`tool.execution:${tool.name}`, "tool", {
        label: tool.name,
        attributes: {
          "tool.name": tool.name,
          "tool.call.id": toolCallId,
          "tool.description": tool.description,
          ...(toolTags && toolTags.length > 0 ? { "tool.tags": safeStringify(toolTags) } : {}),
          "tool.parameters": safeStringify(tool.parameters),
          input: args ? safeStringify(args) : undefined,
        },
        kind: SpanKind.CLIENT,
      });

      // Push execution metadata into systemContext for tools to consume
      oc.systemContext.set("agentId", this.id);
      oc.systemContext.set("historyEntryId", oc.operationId);
      oc.systemContext.set("parentToolSpan", toolSpan);

      const hasOutputOverride = (
        value: unknown,
      ): value is {
        output?: unknown;
      } => {
        if (!value || typeof value !== "object") {
          return false;
        }
        return Object.prototype.hasOwnProperty.call(value, "output");
      };

      const runToolStartHooks = async () => {
        await tool.hooks?.onStart?.({
          tool,
          args,
          options: executionOptions,
        });
        await hooks.onToolStart?.({
          agent: this,
          tool,
          context: oc,
          args,
          options: executionOptions,
        });
      };

      let spanOutcome:
        | { status: "completed"; output?: unknown }
        | { status: "error"; error?: Error | any }
        | null = null;

      const finalizeToolSpan = () => {
        const shouldEnd =
          typeof toolSpan.isRecording === "function" ? toolSpan.isRecording() : true;
        if (!shouldEnd) {
          return;
        }
        const status = spanOutcome?.status ?? "completed";
        oc.traceContext.endChildSpan(toolSpan, status, {
          output: spanOutcome?.status === "completed" ? spanOutcome.output : undefined,
          error: spanOutcome?.status === "error" ? spanOutcome.error : undefined,
        });
      };

      const resolveToolEndOutput = async (currentOutput: any) => {
        let output = currentOutput;
        let overrideProvided = false;

        const toolHookResult = await tool.hooks?.onEnd?.({
          tool,
          args,
          output,
          error: undefined,
          options: executionOptions,
        });
        if (hasOutputOverride(toolHookResult)) {
          output = toolHookResult.output;
          overrideProvided = true;
        }

        const agentHookResult = await hooks.onToolEnd?.({
          agent: this,
          tool,
          output,
          error: undefined,
          context: oc,
          options: executionOptions,
        });
        if (hasOutputOverride(agentHookResult)) {
          output = agentHookResult.output;
          overrideProvided = true;
        }

        if (overrideProvided) {
          output = await this.validateToolOutput(output, tool);
        }

        return output;
      };

      const handleToolSuccess = async (_result: any, validatedResult: any) => {
        const finalOutput = await resolveToolEndOutput(validatedResult);
        spanOutcome = { status: "completed", output: finalOutput };

        return finalOutput;
      };

      const handleToolError = async (errorValue: unknown) => {
        const error = errorValue instanceof Error ? errorValue : new Error(String(errorValue));
        const voltAgentError = createVoltAgentError(error, {
          stage: "tool_execution",
          toolError: {
            toolCallId,
            toolName: tool.name,
            toolExecutionError: error,
            toolArguments: args,
          },
        });
        const errorResult = buildToolErrorResult(error, toolCallId, tool.name);

        spanOutcome = { status: "error", error: voltAgentError };

        await tool.hooks?.onEnd?.({
          tool,
          args,
          output: undefined,
          error: voltAgentError,
          options: executionOptions,
        });

        await tool.hooks?.onEnd?.({
          tool,
          args,
          output: undefined,
          error: voltAgentError,
          options: executionOptions,
        });

        await hooks.onToolEnd?.({
          agent: this,
          tool,
          output: undefined,
          error: voltAgentError,
          context: oc,
          options: executionOptions,
        });

        if (isToolDeniedError(errorValue)) {
          oc.abortController.abort(errorValue);
        }

        return errorResult;
      };

      const execute = tool.execute;
      if (execute && isAsyncGeneratorFunction(execute)) {
        return async function* (this: Agent): AsyncGenerator<any, void, void> {
          try {
            await oc.traceContext.withSpan(toolSpan, async () => {
              await runToolStartHooks();
            });

            const result = execute(args, executionOptions);

            if (!isAsyncIterable(result)) {
              const resolved = await result;
              const validatedResult = await this.validateToolOutput(resolved, tool);
              const finalOutput = await oc.traceContext.withSpan(toolSpan, async () => {
                return await handleToolSuccess(resolved, validatedResult);
              });
              yield finalOutput;
              return;
            }

            const iterator = result[Symbol.asyncIterator]();
            let pendingOutput: any = undefined;
            let validatedResult: any = undefined;
            let hasOutput = false;

            while (true) {
              const next = await oc.traceContext.withSpan(toolSpan, () => iterator.next());
              if (next.done) {
                break;
              }

              if (hasOutput) {
                yield pendingOutput;
              }

              pendingOutput = next.value;
              hasOutput = true;
              validatedResult = await this.validateToolOutput(pendingOutput, tool);
            }

            if (!hasOutput) {
              validatedResult = await this.validateToolOutput(pendingOutput, tool);
            }

            const finalOutput = await oc.traceContext.withSpan(toolSpan, async () => {
              return await handleToolSuccess(pendingOutput, validatedResult);
            });

            if (hasOutput || finalOutput !== undefined) {
              yield finalOutput;
            }
          } catch (e) {
            const errorResult = await oc.traceContext.withSpan(toolSpan, async () => {
              return await handleToolError(e);
            });
            yield errorResult;
          } finally {
            finalizeToolSpan();
          }
        }.call(this);
      }

      return oc.traceContext.withSpan(toolSpan, async () => {
        try {
          // Call tool start hook - can throw ToolDeniedError
          await runToolStartHooks();

          // Execute tool with merged options
          if (!tool.execute) {
            throw new Error(`Tool ${tool.name} does not have "execute" method`);
          }
          let result = await tool.execute(args, executionOptions);

          if (isAsyncIterable(result)) {
            let lastOutput: any = undefined;
            for await (const output of result) {
              lastOutput = output;
            }
            result = lastOutput;
          }

          const validatedResult = await this.validateToolOutput(result, tool);

          const finalOutput = await handleToolSuccess(result, validatedResult);

          return finalOutput;
        } catch (e) {
          return await handleToolError(e);
        } finally {
          finalizeToolSpan();
        }
      });
    };
  }

  private getToolRoutingSupportToolNames(): Set<string> {
    return new Set([TOOL_ROUTING_SEARCH_TOOL_NAME, TOOL_ROUTING_CALL_TOOL_NAME]);
  }

  private isToolRoutingSupportTool(tool: BaseTool | ProviderTool): boolean {
    if (!tool || typeof tool !== "object") {
      return false;
    }
    if (TOOL_ROUTING_INTERNAL_TOOL_SYMBOL in tool) {
      return true;
    }
    return tool.name === TOOL_ROUTING_SEARCH_TOOL_NAME || tool.name === TOOL_ROUTING_CALL_TOOL_NAME;
  }

  private isToolExecutableForRouting(tool: BaseTool | ProviderTool): boolean {
    if (isProviderTool(tool)) {
      const callableFlag = (tool as { callable?: boolean }).callable;
      if (callableFlag === false) {
        return false;
      }
      const callFn = (tool as { call?: unknown }).call;
      if (callFn !== undefined) {
        return typeof callFn === "function";
      }
      return true;
    }

    if ((tool as Tool<any, any>).isClientSide?.()) {
      return false;
    }

    return typeof (tool as Tool<any, any>).execute === "function";
  }

  private getToolRoutingFromContext(options?: ToolExecuteOptions): ToolRoutingConfig | undefined {
    const contextValue =
      options?.systemContext?.get(TOOL_ROUTING_CONTEXT_KEY) ??
      options?.context?.get(TOOL_ROUTING_CONTEXT_KEY);
    if (contextValue === false) {
      return undefined;
    }
    if (contextValue && typeof contextValue === "object") {
      return contextValue as ToolRoutingConfig;
    }
    if (this.toolRouting && typeof this.toolRouting === "object") {
      return this.toolRouting;
    }
    return undefined;
  }

  private getToolSearchStrategy(toolRouting?: ToolRoutingConfig): ToolSearchStrategy | undefined {
    if (!toolRouting?.embedding) {
      return undefined;
    }
    if (toolRouting === this.toolRouting && this.toolRoutingSearchStrategy) {
      return this.toolRoutingSearchStrategy;
    }
    return createEmbeddingToolSearchStrategy(toolRouting.embedding);
  }

  private buildToolSearchCandidates(): ToolSearchCandidate[] {
    return this.toolPoolManager
      .getAllTools()
      .filter((tool) => !this.isToolRoutingSupportTool(tool))
      .filter((tool) => this.isToolExecutableForRouting(tool))
      .map((tool) => {
        const tags = "tags" in tool ? (tool as { tags?: string[] }).tags : undefined;
        const parameters = isProviderTool(tool) ? tool.args : (tool as Tool<any, any>).parameters;
        const outputSchema = !isProviderTool(tool)
          ? (tool as Tool<any, any>).outputSchema
          : undefined;
        return {
          name: tool.name,
          description: tool.description || "",
          tags,
          parameters,
          outputSchema,
          tool,
        };
      });
  }

  private rankToolSearchCandidates(
    query: string,
    candidates: ToolSearchCandidate[],
    topK: number,
  ): ToolSearchSelection[] {
    if (candidates.length === 0) {
      return [];
    }

    const normalized = query.trim().toLowerCase();
    const tokens = normalized.length > 0 ? normalized.split(/\s+/).filter(Boolean) : [];

    const scored = candidates.map((candidate) => {
      const name = candidate.name.toLowerCase();
      const description = (candidate.description ?? "").toLowerCase();
      const tags = (candidate.tags ?? []).map((tag) => tag.toLowerCase());
      let score = 0;

      if (normalized.length > 0 && name.includes(normalized)) {
        score += 4;
      }
      if (normalized.length > 0 && description.includes(normalized)) {
        score += 2;
      }

      for (const token of tokens) {
        if (name.includes(token)) {
          score += 2;
        }
        if (description.includes(token)) {
          score += 1;
        }
        if (tags.includes(token)) {
          score += 1;
        }
      }

      return { name: candidate.name, score };
    });

    scored.sort((a, b) => {
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return a.name.localeCompare(b.name);
    });

    const hasMatches = scored.some((entry) => (entry.score ?? 0) > 0);
    const filtered = hasMatches ? scored.filter((entry) => (entry.score ?? 0) > 0) : scored;
    return filtered.slice(0, Math.max(0, topK));
  }

  private async selectToolSearchCandidates(params: {
    query: string;
    topK: number;
    candidates: ToolSearchCandidate[];
    oc: OperationContext;
    parentSpan?: Span;
    toolRouting?: ToolRoutingConfig;
  }): Promise<ToolSearchSelection[]> {
    const { query, topK, candidates, oc, parentSpan, toolRouting } = params;
    const strategy = this.getToolSearchStrategy(toolRouting);

    if (!strategy) {
      return this.rankToolSearchCandidates(query, candidates, topK);
    }

    return await strategy.select({
      query,
      tools: candidates,
      topK,
      context: {
        agentId: this.id,
        agentName: this.name,
        operationContext: oc,
        searchToolName: TOOL_ROUTING_SEARCH_TOOL_NAME,
        parentSpan,
      },
    });
  }

  private toToolSearchResultItem(
    candidate: ToolSearchCandidate,
    selection: ToolSearchSelection,
  ): ToolSearchResultItem {
    const parametersSchema = isProviderTool(candidate.tool)
      ? (candidate.tool.args ?? null)
      : zodSchemaToJsonUI((candidate.tool as Tool<any, any>).parameters);
    const outputSchema =
      !isProviderTool(candidate.tool) && (candidate.tool as Tool<any, any>).outputSchema
        ? zodSchemaToJsonUI((candidate.tool as Tool<any, any>).outputSchema)
        : null;

    return {
      name: candidate.name,
      description: candidate.description || null,
      tags: candidate.tags ?? null,
      parametersSchema,
      outputSchema,
      score: selection.score,
      reason: selection.reason,
    };
  }

  private recordSearchedTools(options: ToolExecuteOptions | undefined, toolNames: string[]): void {
    const context = options?.systemContext ?? options?.context;
    if (!context || toolNames.length === 0) {
      return;
    }

    const existing = context.get(TOOL_ROUTING_SEARCHED_TOOLS_CONTEXT_KEY);
    const searched =
      existing instanceof Set
        ? new Set(existing)
        : Array.isArray(existing)
          ? new Set(existing.filter((value) => typeof value === "string"))
          : new Set<string>();

    for (const name of toolNames) {
      searched.add(name);
    }

    context.set(TOOL_ROUTING_SEARCHED_TOOLS_CONTEXT_KEY, searched);
  }

  private getSearchedTools(options: ToolExecuteOptions | undefined): Set<string> {
    const context = options?.systemContext ?? options?.context;
    if (!context) {
      return new Set();
    }

    const existing = context.get(TOOL_ROUTING_SEARCHED_TOOLS_CONTEXT_KEY);
    if (existing instanceof Set) {
      return existing;
    }
    if (Array.isArray(existing)) {
      return new Set(existing.filter((value) => typeof value === "string"));
    }
    return new Set();
  }

  private createToolRoutingSearchTool(): Tool<any, any> {
    const tool = createTool({
      name: TOOL_ROUTING_SEARCH_TOOL_NAME,
      description:
        "Search available tools and inspect their schemas. Always call this before callTool when tool routing is enabled.",
      parameters: searchToolsParameters,
      outputSchema: searchToolsOutputSchema,
      execute: async ({ query, topK }, options) => {
        if (!options) {
          throw new Error("searchTools requires tool execution options.");
        }

        const oc = options as OperationContext;
        const toolRouting = this.getToolRoutingFromContext(options);
        const embeddingTopK =
          toolRouting?.embedding &&
          typeof toolRouting.embedding === "object" &&
          toolRouting.embedding !== null &&
          "topK" in toolRouting.embedding
            ? (toolRouting.embedding as { topK?: number }).topK
            : undefined;
        const effectiveTopK = Math.max(
          1,
          topK ?? toolRouting?.topK ?? embeddingTopK ?? DEFAULT_TOOL_SEARCH_TOP_K,
        );
        const candidates = this.buildToolSearchCandidates();
        const parentToolSpan = oc.systemContext.get("parentToolSpan") as Span | undefined;
        const selectionSpanAttributes = {
          "tool.name": TOOL_ROUTING_SEARCH_TOOL_NAME,
          "tool.search.name": TOOL_ROUTING_SEARCH_TOOL_NAME,
          "tool.search.query": query,
          "tool.search.candidates": candidates.length,
          "tool.search.top_k": effectiveTopK,
          input: query,
        };
        const selectionSpan = parentToolSpan
          ? oc.traceContext.createChildSpanWithParent(
              parentToolSpan,
              `tool.search.selection:${TOOL_ROUTING_SEARCH_TOOL_NAME}`,
              "tool",
              {
                label: `Tool Search Selection: ${TOOL_ROUTING_SEARCH_TOOL_NAME}`,
                attributes: selectionSpanAttributes,
              },
            )
          : oc.traceContext.createChildSpan(
              `tool.search.selection:${TOOL_ROUTING_SEARCH_TOOL_NAME}`,
              "tool",
              {
                label: `Tool Search Selection: ${TOOL_ROUTING_SEARCH_TOOL_NAME}`,
                attributes: selectionSpanAttributes,
              },
            );

        let selections: ToolSearchSelection[] = [];
        try {
          selections = await oc.traceContext.withSpan(selectionSpan, () =>
            this.selectToolSearchCandidates({
              query,
              topK: effectiveTopK,
              candidates,
              oc,
              parentSpan: selectionSpan,
              toolRouting,
            }),
          );
          if (selections.length > 1) {
            const seen = new Set<string>();
            selections = selections.filter((selection) => {
              if (seen.has(selection.name)) {
                return false;
              }
              seen.add(selection.name);
              return true;
            });
          }
          oc.traceContext.endChildSpan(selectionSpan, "completed", {
            output: selections,
            attributes: {
              "tool.search.selection.count": selections.length,
              "tool.search.selection.names": safeStringify(
                selections.map((selection) => selection.name),
              ),
            },
          });
          oc.logger.debug("Tool search selections computed", {
            tool: TOOL_ROUTING_SEARCH_TOOL_NAME,
            query,
            selections: safeStringify(selections),
          });
        } catch (error) {
          oc.traceContext.endChildSpan(selectionSpan, "error", {
            output: { error: error instanceof Error ? error.message : String(error) },
          });
          throw error;
        }

        const candidateByName = new Map(candidates.map((candidate) => [candidate.name, candidate]));
        const tools = selections
          .map((selection) => {
            const candidate = candidateByName.get(selection.name);
            return candidate ? this.toToolSearchResultItem(candidate, selection) : null;
          })
          .filter((item): item is ToolSearchResultItem => Boolean(item));

        this.recordSearchedTools(
          options,
          tools.map((toolItem) => toolItem.name),
        );

        return {
          query,
          selections,
          tools,
        } satisfies ToolSearchResult;
      },
    });

    (tool as any)[TOOL_ROUTING_INTERNAL_TOOL_SYMBOL] = "search";
    return tool;
  }

  private createToolRoutingCallTool(): Tool<any, any> {
    const tool = createTool({
      name: TOOL_ROUTING_CALL_TOOL_NAME,
      description:
        "Call a tool by name with validated arguments. Always call searchTools first and follow the returned schema.",
      parameters: callToolParameters,
      execute: async ({ name, args }, options) => {
        if (!options) {
          throw new Error("callTool requires tool execution options.");
        }

        if (name === TOOL_ROUTING_CALL_TOOL_NAME || name === TOOL_ROUTING_SEARCH_TOOL_NAME) {
          throw new Error(
            `Tool "${name}" cannot be called via callTool to avoid recursion. Use it directly instead.`,
          );
        }

        const oc = options as OperationContext;
        const toolRouting = this.getToolRoutingFromContext(options);
        const enforceSearch = toolRouting?.enforceSearchBeforeCall ?? true;
        const rawArgs = args ?? {};

        const target = this.toolPoolManager.getToolByName(name);
        if (!target || this.isToolRoutingSupportTool(target)) {
          throw new Error(`Tool not found in pool: ${name}`);
        }

        if (enforceSearch) {
          const searchedTools = this.getSearchedTools(options);
          if (!searchedTools.has(name)) {
            throw new Error(
              `Tool "${name}" must be searched via ${TOOL_ROUTING_SEARCH_TOOL_NAME} before calling.`,
            );
          }
        }

        const hooks =
          ((options as { hooks?: AgentHooks }).hooks as AgentHooks | undefined) ??
          this.getMergedHooks();
        const toolCallId = randomUUID();
        const executionOptions: ToolExecuteOptions = {
          ...oc,
          toolContext: {
            name: target.name,
            callId: toolCallId,
            messages: options.toolContext?.messages ?? [],
            abortSignal: oc.abortController.signal,
          },
        };
        executionOptions.hooks = hooks;

        if (isProviderTool(target)) {
          return await this.executeProviderToolViaCallTool({
            tool: target,
            args: rawArgs,
            oc,
            hooks,
            executionOptions,
          });
        }

        if (!target.execute || target.isClientSide?.()) {
          throw new Error(
            `Tool "${target.name}" cannot be executed on the server or has no execute handler.`,
          );
        }

        let parsedArgs: Record<string, unknown> = rawArgs;
        const schema = (target as Tool<any, any>).parameters;
        if (schema && typeof schema.safeParse === "function") {
          const parsed = schema.safeParse(rawArgs);
          if (!parsed.success) {
            const error = new Error(
              `Invalid arguments for tool "${name}": ${parsed.error.message}`,
            );
            Object.assign(error, { validationErrors: parsed.error.errors });
            throw error;
          }
          parsedArgs = parsed.data as Record<string, unknown>;
        }

        await this.ensureToolApproval(
          target as Tool<any, any>,
          parsedArgs,
          executionOptions,
          toolCallId,
        );

        const execute = this.createToolExecutionFactory(oc, hooks)(target as Tool<any, any>);
        return await execute(parsedArgs, {
          toolCallId,
          messages: executionOptions.toolContext?.messages ?? [],
          abortSignal: executionOptions.toolContext?.abortSignal,
        });
      },
    });

    (tool as any)[TOOL_ROUTING_INTERNAL_TOOL_SYMBOL] = "call";
    return tool;
  }

  private async executeProviderToolViaCallTool(params: {
    tool: ProviderTool;
    args: Record<string, unknown>;
    oc: OperationContext;
    hooks: AgentHooks;
    executionOptions: ToolExecuteOptions;
  }): Promise<unknown> {
    const { tool, args, oc, hooks, executionOptions } = params;
    oc.logger.info("Tool routing executing provider tool via callTool", {
      toolName: tool.name,
    });

    await this.ensureToolApproval(
      tool,
      args,
      executionOptions,
      executionOptions.toolContext?.callId ?? randomUUID(),
    );

    const tools: Record<string, any> = {
      [tool.name]: tool,
    };

    const argsInstruction = `Use these tool arguments exactly: ${safeStringify(args)}`;
    const result = await this.runInternalGenerateText({
      oc,
      messages: [
        {
          role: "system",
          content: [
            "Call the required tool with the provided arguments.",
            "Return only the tool call.",
          ].join("\n"),
        },
        { role: "user", content: argsInstruction },
      ],
      tools,
      toolChoice: { type: "tool", toolName: tool.name },
      temperature: this.temperature ?? 0,
    });

    const { toolCalls, toolResults } = this.collectToolDataFromResult(result);
    const toolCall = toolCalls.find((call) => call.toolName === tool.name);
    const toolResult = toolResults.find(
      (res) => res.toolName === tool.name && (!toolCall || res.toolCallId === toolCall.toolCallId),
    );

    if (toolCall?.toolCallId && executionOptions.toolContext) {
      executionOptions.toolContext.callId = toolCall.toolCallId;
    }

    if (toolCall) {
      const callInput = toolCall.input ?? {};
      if (!isDeepStrictEqual(args, callInput)) {
        throw new Error(
          `Provider tool "${tool.name}" received arguments that do not match callTool input.`,
        );
      }
      await hooks.onToolStart?.({
        agent: this,
        tool: tool as any,
        args: callInput,
        context: oc,
        options: executionOptions,
      });
    }

    if (!toolResult) {
      throw new Error("Provider tool did not return a result.");
    }

    const toolError =
      toolResult.output && typeof toolResult.output === "object" && "error" in toolResult.output
        ? String((toolResult.output as { error?: unknown }).error ?? "Tool error")
        : undefined;
    const hookError = toolError
      ? createVoltAgentError(toolError, { stage: "tool_execution" })
      : undefined;

    await hooks.onToolEnd?.({
      agent: this,
      tool: tool as any,
      output: toolError ? undefined : toolResult.output,
      error: hookError,
      context: oc,
      options: executionOptions,
    });

    if (toolError) {
      throw new Error(toolError);
    }

    return toolResult.output;
  }

  private async ensureToolApproval(
    tool: Tool<any, any> | ProviderTool,
    args: Record<string, unknown>,
    options: ToolExecuteOptions,
    toolCallId: string,
  ): Promise<void> {
    const needsApproval = (tool as { needsApproval?: Tool<any, any>["needsApproval"] })
      .needsApproval;
    if (!needsApproval) {
      return;
    }

    const requiresApproval =
      typeof needsApproval === "function"
        ? await needsApproval(args as any, {
            toolCallId,
            messages: (options.toolContext?.messages ?? []) as ModelMessage[],
            experimental_context: undefined,
          })
        : needsApproval;

    if (requiresApproval) {
      throw new ToolDeniedError({
        toolName: tool.name,
        message: `Tool ${tool.name} requires approval.`,
        code: "TOOL_FORBIDDEN",
        httpStatus: 403,
      });
    }
  }

  private async runInternalGenerateText(params: {
    oc: OperationContext;
    modelValue?: AgentModelValue;
    messages: ModelMessage[];
    tools?: ToolSet;
    output?: OutputSpec;
    toolChoice?: ToolChoice<Record<string, unknown>>;
    temperature?: number;
  }): Promise<GenerateTextResult<ToolSet, OutputSpec>> {
    const { oc, modelValue, messages, tools, output, toolChoice, temperature } = params;
    const model = await this.resolveModel(modelValue ?? this.model, oc);
    const modelName = this.getModelName(model);

    const llmSpan = this.createLLMSpan(oc, {
      operation: "generateText",
      modelName,
      isStreaming: false,
      messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
      tools,
      callOptions: {
        temperature,
      },
    });
    const finalizeLLMSpan = this.createLLMSpanFinalizer(llmSpan);

    try {
      const response = await oc.traceContext.withSpan(llmSpan, () =>
        generateText({
          model,
          messages,
          tools,
          output,
          toolChoice,
          temperature,
          maxRetries: 0,
          stopWhen: stepCountIs(1),
          abortSignal: oc.abortController.signal,
        }),
      );

      const resolvedUsage = response.usage ? await Promise.resolve(response.usage) : undefined;
      finalizeLLMSpan(SpanStatusCode.OK, {
        usage: resolvedUsage,
        finishReason: response.finishReason,
      });

      return response;
    } catch (error) {
      finalizeLLMSpan(SpanStatusCode.ERROR, { message: (error as Error).message });
      throw error;
    }
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

            // Check if this tool result indicates a subagent bail (early termination)
            const toolResult = part.output;
            if (Array.isArray(toolResult)) {
              // Check for bailed result in results array
              const bailedResult = toolResult.find((r: any) => r.bailed === true);

              if (bailedResult) {
                const agentName = bailedResult.agentName || "unknown";
                const response = String(bailedResult.response || "");

                oc.logger.info("Subagent bailed during stream - aborting supervisor stream", {
                  event: LogEvents.AGENT_STEP_TOOL_RESULT,
                  agentName,
                  bailed: true,
                });

                // Store bailed result for retrieval in onFinish
                oc.systemContext.set("bailedResult", {
                  agentName,
                  response,
                });

                // Abort the stream with BailError to signal early termination
                oc.abortController.abort(createBailError(agentName, response));
                return; // Stop processing this step
              }
            }
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

      const responseMessages = filterResponseMessages(event.response?.messages);
      if (responseMessages && responseMessages.length > 0) {
        buffer.addModelMessages(responseMessages, "response");
      }

      // Call hooks
      const hooks = this.getMergedHooks(options);
      await hooks.onStepFinish?.({ agent: this, step: event, context: oc });
    };
  }

  private recordStepResults(
    steps: ReadonlyArray<StepResult<ToolSet>> | undefined,
    oc: OperationContext,
  ): void {
    const storedSteps =
      (steps && steps.length > 0 ? steps : undefined) ||
      (oc.systemContext.get("conversationSteps") as StepResult<ToolSet>[] | undefined);

    if (!storedSteps?.length) {
      return;
    }

    if (!oc.conversationSteps) {
      oc.conversationSteps = [];
    }

    const previouslyPersistedCount =
      (oc.systemContext.get(STEP_PERSIST_COUNT_KEY) as number | undefined) ?? 0;
    const newSteps = storedSteps.slice(previouslyPersistedCount);

    if (!newSteps.length) {
      return;
    }

    oc.systemContext.set(STEP_PERSIST_COUNT_KEY, previouslyPersistedCount + newSteps.length);

    if (oc.conversationId) {
      const rootSpan = oc.traceContext.getRootSpan();
      rootSpan.setAttribute("conversation.id", oc.conversationId);
      rootSpan.setAttribute("voltagent.conversation_id", oc.conversationId);
    }

    const agentMetadata = oc.systemContext.get(AGENT_METADATA_CONTEXT_KEY) as
      | AgentMetadataContextValue
      | undefined;
    const subAgentMetadata =
      oc.parentAgentId && agentMetadata
        ? {
            subAgentId: agentMetadata.agentId,
            subAgentName: agentMetadata.agentName,
          }
        : undefined;

    const stepRecords: ConversationStepRecord[] = [];
    let recordTimestamp = new Date().toISOString();

    newSteps.forEach((step, offset) => {
      const usage = convertUsage(step.usage);
      const stepIndex = previouslyPersistedCount + offset;

      const trimmedText = step.text?.trim();
      if (trimmedText) {
        oc.conversationSteps?.push({
          id: randomUUID(),
          type: "text",
          content: trimmedText,
          role: "assistant",
          usage,
          ...(subAgentMetadata ?? {}),
        });

        if (oc.userId && oc.conversationId) {
          stepRecords.push({
            id: randomUUID(),
            conversationId: oc.conversationId,
            userId: oc.userId,
            agentId: this.id,
            agentName: this.name,
            operationId: oc.operationId,
            stepIndex,
            type: "text",
            role: "assistant",
            content: trimmedText,
            usage,
            subAgentId: subAgentMetadata?.subAgentId,
            subAgentName: subAgentMetadata?.subAgentName,
            createdAt: recordTimestamp,
          });
        }
      }

      if (step.toolCalls?.length) {
        for (const toolCall of step.toolCalls) {
          oc.conversationSteps?.push({
            id: toolCall.toolCallId || randomUUID(),
            type: "tool_call",
            content: safeStringify(toolCall.input ?? {}),
            role: "assistant",
            name: toolCall.toolName,
            arguments: (toolCall as { input?: Record<string, unknown> }).input || {},
            usage,
            ...(subAgentMetadata ?? {}),
          });

          if (oc.userId && oc.conversationId) {
            stepRecords.push({
              id: toolCall.toolCallId || randomUUID(),
              conversationId: oc.conversationId,
              userId: oc.userId,
              agentId: this.id,
              agentName: this.name,
              operationId: oc.operationId,
              stepIndex,
              type: "tool_call",
              role: "assistant",
              arguments: (toolCall as { input?: Record<string, unknown> }).input || {},
              usage,
              subAgentId: subAgentMetadata?.subAgentId,
              subAgentName: subAgentMetadata?.subAgentName,
              createdAt: recordTimestamp,
            });
          }
        }
      }

      if (step.toolResults?.length) {
        for (const toolResult of step.toolResults) {
          oc.conversationSteps?.push({
            id: toolResult.toolCallId || randomUUID(),
            type: "tool_result",
            content: safeStringify(toolResult.output),
            role: "assistant",
            name: toolResult.toolName,
            result: toolResult.output,
            usage,
            ...(subAgentMetadata ?? {}),
          });

          if (oc.userId && oc.conversationId) {
            stepRecords.push({
              id: toolResult.toolCallId || randomUUID(),
              conversationId: oc.conversationId,
              userId: oc.userId,
              agentId: this.id,
              agentName: this.name,
              operationId: oc.operationId,
              stepIndex,
              type: "tool_result",
              role: "assistant",
              result: toolResult.output ?? null,
              usage,
              subAgentId: subAgentMetadata?.subAgentId,
              subAgentName: subAgentMetadata?.subAgentName,
              createdAt: recordTimestamp,
            });
          }
        }
      }

      // Refresh timestamp for multi-step batches to maintain ordering while avoiding identical references
      recordTimestamp = new Date().toISOString();
    });

    if (stepRecords.length > 0 && oc.userId && oc.conversationId) {
      void this.memoryManager
        .saveConversationSteps(oc, stepRecords, oc.userId, oc.conversationId)
        .catch((error) => {
          oc.logger.debug("Failed to persist conversation steps", {
            error,
            conversationId: oc.conversationId,
            userId: oc.userId,
          });
        });
    }
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
      onHandoffComplete: async (...args) => {
        await options.hooks?.onHandoffComplete?.(...args);
        await this.hooks.onHandoffComplete?.(...args);
      },
      onToolStart: async (...args) => {
        await options.hooks?.onToolStart?.(...args);
        await this.hooks.onToolStart?.(...args);
      },
      onToolEnd: async (...args) => {
        const resOptions = await options.hooks?.onToolEnd?.(...args);
        const resThis = await this.hooks.onToolEnd?.(...args);
        if (resThis && typeof resThis === "object") {
          return resThis as OnToolEndHookResult;
        }
        if (resOptions && typeof resOptions === "object") {
          return resOptions as OnToolEndHookResult;
        }
        return undefined;
      },
      onStepFinish: async (...args) => {
        await options.hooks?.onStepFinish?.(...args);
        await this.hooks.onStepFinish?.(...args);
      },
      onRetry: async (...args) => {
        await options.hooks?.onRetry?.(...args);
        await this.hooks.onRetry?.(...args);
      },
      onFallback: async (...args) => {
        await options.hooks?.onFallback?.(...args);
        await this.hooks.onFallback?.(...args);
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
    if (oc.systemContext.get(ABORT_LISTENER_ATTACHED_KEY)) {
      return;
    }
    oc.systemContext.set(ABORT_LISTENER_ATTACHED_KEY, true);

    const signal = oc.abortController.signal;
    signal.addEventListener("abort", async () => {
      // Mark operation as inactive
      oc.isActive = false;

      // Check if this is a bail (early termination from subagent)
      const isBail = isBailError(signal.reason as Error);

      if (isBail) {
        // Bail is not an error - it's a successful early termination
        // Get the bailed result from systemContext
        const bailedResult = oc.systemContext.get("bailedResult") as
          | { agentName: string; response: string }
          | undefined;

        if (oc.traceContext && bailedResult) {
          const rootSpan = oc.traceContext.getRootSpan();
          // Mark as completed, not cancelled
          rootSpan.setAttribute("agent.state", "completed");
          rootSpan.setAttribute("bailed", true);
          rootSpan.setAttribute("bail.subagent", bailedResult.agentName);
          // Set output so it appears in observability UI
          rootSpan.setAttribute("output", bailedResult.response);
          // Set finish reason
          rootSpan.setAttribute("ai.response.finish_reason", "bail");
          // Span status is OK (success), not ERROR
          rootSpan.setStatus({ code: SpanStatusCode.OK });
          rootSpan.end();
        }
      } else {
        // Normal abort/cancellation - treat as error
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
      }
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
    // Check if this is a BailError (subagent early termination)
    // This should be handled gracefully, not as an error
    if (isBailError(error)) {
      // BailError should have been handled in onFinish/onError callbacks
      // If we reach here, something went wrong - log and re-throw
      oc.logger.warn("BailError reached handleError - this should not happen", {
        agentName: error.agentName,
        event: LogEvents.AGENT_GENERATION_FAILED,
      });
      throw error;
    }

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
   * Get the model name.
   * Pass a resolved model to return its modelId (useful for dynamic models).
   */
  public getModelName(model?: LanguageModel | string): string {
    if (model) {
      if (typeof model === "string") {
        return model;
      }
      return model.modelId || "unknown";
    }
    if (Array.isArray(this.model)) {
      const primary = this.model.find((entry) => entry.enabled !== false) ?? this.model[0];
      if (!primary) {
        return "unknown";
      }
      const modelValue = primary.model;
      if (typeof modelValue === "function") {
        return "dynamic";
      }
      if (typeof modelValue === "string") {
        return modelValue;
      }
      return modelValue.modelId || "unknown";
    }
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

    const activeMemory = this.getMemory();
    const memoryInstance: Memory | undefined = activeMemory || undefined;
    const toolRoutingConfig =
      this.toolRouting && typeof this.toolRouting === "object" ? this.toolRouting : undefined;
    const toolRoutingState: AgentToolRoutingState | undefined = toolRoutingConfig
      ? (() => {
          const supportNames = this.getToolRoutingSupportToolNames();
          const searchTool = this.toolManager.getToolByName(TOOL_ROUTING_SEARCH_TOOL_NAME);
          const callTool = this.toolManager.getToolByName(TOOL_ROUTING_CALL_TOOL_NAME);
          const searchApiTool =
            searchTool && this.isToolRoutingSupportTool(searchTool)
              ? new ToolManager([searchTool], this.logger).getToolsForApi()[0]
              : undefined;
          const callApiTool =
            callTool && this.isToolRoutingSupportTool(callTool)
              ? new ToolManager([callTool], this.logger).getToolsForApi()[0]
              : undefined;
          const poolApiTools = this.toolPoolManager
            .getToolsForApi()
            .filter((tool) => !supportNames.has(tool.name));
          const exposeApiTools =
            toolRoutingConfig.expose && toolRoutingConfig.expose.length > 0
              ? new ToolManager(toolRoutingConfig.expose, this.logger).getToolsForApi()
              : [];

          return {
            search: searchApiTool,
            call: callApiTool,
            expose: exposeApiTools.length > 0 ? exposeApiTools : undefined,
            pool: poolApiTools.length > 0 ? poolApiTools : undefined,
            enforceSearchBeforeCall: toolRoutingConfig.enforceSearchBeforeCall ?? true,
            topK: toolRoutingConfig.topK,
          };
        })()
      : undefined;

    return {
      id: this.id,
      name: this.name,
      instructions:
        typeof this.instructions === "function" ? "Dynamic instructions" : this.instructions,
      status: "idle",
      model: this.getModelName(),
      node_id: createNodeId(NodeType.AGENT, this.id),

      tools: (() => {
        const merged = new Map<string, BaseTool | ProviderTool>();
        for (const tool of [
          ...this.toolManager.getAllTools(),
          ...this.toolPoolManager.getAllTools(),
        ]) {
          if (!merged.has(tool.name)) {
            merged.set(tool.name, tool);
          }
        }
        return Array.from(merged.values()).map((tool) => ({
          ...tool,
          node_id: createNodeId(NodeType.TOOL, tool.name, this.id),
        }));
      })(),
      toolRouting: toolRoutingState,

      subAgents: this.subAgentManager.getSubAgentDetails().map((subAgent) => ({
        ...subAgent,
        node_id: createNodeId(NodeType.SUBAGENT, subAgent.id),
      })),

      memory: {
        ...this.memoryManager.getMemoryState(),
        node_id: createNodeId(NodeType.MEMORY, this.id),
        // Add vector DB and embedding info if Memory V2 is configured
        vectorDB: memoryInstance?.getVectorAdapter?.()
          ? {
              enabled: true,
              adapter: memoryInstance.getVectorAdapter()?.constructor.name || "Unknown",
              dimension: memoryInstance.getEmbeddingAdapter?.()?.getDimensions() || 0,
              status: "idle",
              node_id: createNodeId(NodeType.VECTOR, this.id),
            }
          : null,
        embeddingModel: memoryInstance?.getEmbeddingAdapter?.()
          ? {
              enabled: true,
              model: memoryInstance.getEmbeddingAdapter()?.getModelName() || "unknown",
              dimension: memoryInstance.getEmbeddingAdapter()?.getDimensions() || 0,
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
  public addTools(tools: (Tool<any, any> | Toolkit | VercelTool)[]): {
    added: (Tool<any, any> | Toolkit | VercelTool)[];
  } {
    this.toolManager.addItems(tools);
    if (this.toolRouting && !this.toolRoutingPoolExplicit) {
      this.toolPoolManager.addItems(tools);
    }
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
        if (this.toolRouting && !this.toolRoutingPoolExplicit) {
          this.toolPoolManager.removeTool(name);
        }
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
    if (result && this.toolRouting && !this.toolRoutingPoolExplicit) {
      this.toolPoolManager.removeToolkit(toolkitName);
    }

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
      this.toolManager.addStandaloneTool(delegateTool);
      if (this.toolRouting && !this.toolRoutingPoolExplicit) {
        this.toolPoolManager.addStandaloneTool(delegateTool);
      }
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
      if (this.toolRouting && !this.toolRoutingPoolExplicit) {
        this.toolPoolManager.removeTool("delegate_task");
      }
    }
  }

  /**
   * Get all tools
   */
  public getTools() {
    return this.toolManager.getAllBaseTools();
  }

  /**
   * Get tools for API
   */
  public getToolsForApi() {
    const exposed = this.toolManager.getToolsForApi();
    const pooled = this.toolPoolManager.getToolsForApi();
    const merged = new Map<string, ApiToolInfo>();
    for (const tool of [...exposed, ...pooled]) {
      if (!merged.has(tool.name)) {
        merged.set(tool.name, tool);
      }
    }
    return Array.from(merged.values());
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
   * Internal: apply a default Memory instance when none was configured explicitly.
   */
  public __setDefaultMemory(memory: Memory): void {
    if (this.memoryConfigured || this.memory === false) {
      return;
    }
    this.memoryManager.setMemory(memory);
  }

  /**
   * Internal: apply a default tool routing config when none was configured explicitly.
   */
  public __setDefaultToolRouting(toolRouting?: ToolRoutingConfig): void {
    if (this.toolRoutingConfigured) {
      return;
    }
    this.toolRouting = toolRouting;
    this.toolRoutingConfigured = true;
    this.applyToolRoutingConfig(this.toolRouting);
  }

  private applyToolRoutingConfig(toolRouting?: ToolRoutingConfig | false): void {
    if (!toolRouting) {
      this.toolRoutingPoolExplicit = false;
      this.toolRoutingSearchStrategy = undefined;
      this.toolRoutingExposedNames = new Set();
      this.removeToolRoutingSupportTools();
      return;
    }

    this.toolRoutingPoolExplicit = Object.prototype.hasOwnProperty.call(toolRouting, "pool");
    this.toolRoutingExposedNames = new Set();

    this.toolRoutingSearchStrategy = toolRouting.embedding
      ? createEmbeddingToolSearchStrategy(toolRouting.embedding)
      : undefined;

    const searchTool = this.createToolRoutingSearchTool();
    const callTool = this.createToolRoutingCallTool();
    this.upsertToolRoutingSupportTool(searchTool);
    this.upsertToolRoutingSupportTool(callTool);
    this.toolRoutingExposedNames.add(searchTool.name);
    this.toolRoutingExposedNames.add(callTool.name);

    this.assertNoToolRoutingNameConflicts(toolRouting.expose, "toolRouting.expose");
    this.assertNoToolRoutingNameConflicts(toolRouting.pool, "toolRouting.pool");

    if (toolRouting.expose && toolRouting.expose.length > 0) {
      this.toolManager.addItems(toolRouting.expose);
      const exposedManager = new ToolManager(toolRouting.expose, this.logger);
      exposedManager.getAllToolNames().forEach((name) => this.toolRoutingExposedNames.add(name));
    }
    if (toolRouting.pool && toolRouting.pool.length > 0) {
      this.toolPoolManager.addItems(toolRouting.pool);
    } else if (!this.toolRoutingPoolExplicit) {
      const autoPool = this.toolManager
        .getAllTools()
        .filter((tool) => !this.isToolRoutingSupportTool(tool));
      if (autoPool.length > 0) {
        this.toolPoolManager.addItems(autoPool);
      }
    }
  }

  private removeToolRoutingSupportTools(): void {
    for (const name of this.getToolRoutingSupportToolNames()) {
      const existing = this.toolManager.getToolByName(name);
      if (existing && this.isToolRoutingSupportTool(existing)) {
        this.toolManager.removeTool(name);
      }
    }
  }

  private upsertToolRoutingSupportTool(tool: Tool<any, any>): void {
    const existing = this.toolManager.getToolByName(tool.name);
    if (existing && !this.isToolRoutingSupportTool(existing)) {
      throw new Error(
        `Tool routing requires reserved tool name "${tool.name}". Rename the conflicting tool to enable tool routing.`,
      );
    }

    if (existing && this.isToolRoutingSupportTool(existing)) {
      this.toolManager.removeTool(tool.name);
    }

    this.toolManager.addStandaloneTool(tool);
  }

  private assertNoToolRoutingNameConflicts(
    items: (Tool<any, any> | Toolkit | VercelTool)[] | undefined,
    scope: string,
  ): void {
    if (!items || items.length === 0) {
      return;
    }

    const reservedNames = this.getToolRoutingSupportToolNames();
    const manager = new ToolManager(items, this.logger);
    const conflicts = manager
      .getAllToolNames()
      .filter((name) => reservedNames.has(name))
      .sort();

    if (conflicts.length > 0) {
      throw new Error(
        `Tool routing reserves tool names ${conflicts.join(
          ", ",
        )}. Remove them from ${scope} or rename the conflicting tools.`,
      );
    }
  }

  private resolveToolRouting(
    options?: BaseGenerationOptions,
  ): ToolRoutingConfig | false | undefined {
    if (options?.toolRouting !== undefined) {
      return options.toolRouting;
    }
    return this.toolRouting;
  }

  private getToolRoutingExposedNames(toolRouting: ToolRoutingConfig): Set<string> {
    if (toolRouting === this.toolRouting && this.toolRoutingExposedNames.size > 0) {
      return this.toolRoutingExposedNames;
    }

    const exposedNames = new Set<string>();
    exposedNames.add(TOOL_ROUTING_SEARCH_TOOL_NAME);
    exposedNames.add(TOOL_ROUTING_CALL_TOOL_NAME);

    if (toolRouting.expose && toolRouting.expose.length > 0) {
      const exposedManager = new ToolManager(toolRouting.expose, this.logger);
      exposedManager.getAllToolNames().forEach((name) => exposedNames.add(name));
    }

    return exposedNames;
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
      execute: async (args, options) => {
        // Extract the prompt from args
        const prompt = (args as any).prompt || args;

        // Extract OperationContext from options if available
        // Since ToolExecuteOptions extends Partial<OperationContext>, we can extract the fields
        const oc = options as OperationContext | undefined;

        // Generate response using this agent
        const result = await this.generateText(prompt, {
          // Pass through the operation context if available
          parentOperationContext: oc,
          conversationId: options?.conversationId,
          userId: options?.userId,
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

    const resolvedUsage = convertUsage(usage);
    if (!resolvedUsage) return;

    traceContext.setUsage({
      promptTokens: resolvedUsage.promptTokens,
      completionTokens: resolvedUsage.completionTokens,
      totalTokens: resolvedUsage.totalTokens,
      cachedTokens: resolvedUsage.cachedInputTokens,
      reasoningTokens: resolvedUsage.reasoningTokens,
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
