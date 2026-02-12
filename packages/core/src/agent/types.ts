import type { Span } from "@opentelemetry/api";
import type { z } from "zod";
import type {
  BaseMessage,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
} from "../agent/providers/base/types";
import type { StopWhen } from "../ai-types";

import type { LanguageModel, TextStreamPart, UIMessage } from "ai";
import type { Memory } from "../memory";
import type { BaseRetriever } from "../retriever/retriever";
import type { ProviderTool, Tool, Toolkit, VercelTool } from "../tool";
import type { ToolRoutingConfig } from "../tool/routing/types";
import type { StreamEvent } from "../utils/streams";
import type { Voice } from "../voice/types";
import type { VoltOpsClient } from "../voltops/client";
import type { Agent } from "./agent";
import type { CancellationError, MiddlewareAbortOptions, VoltAgentError } from "./errors";
import type { LLMProvider } from "./providers";
import type { BaseTool } from "./providers";
import type { StepWithContent } from "./providers";
import type { UsageInfo } from "./providers/base/types";
import type { SubAgentConfig } from "./subagent/types";
import type { VoltAgentTextStreamPart } from "./subagent/types";

import type { Logger } from "@voltagent/internal";
import type { LocalScorerDefinition, SamplingPolicy } from "../eval/runtime";
import type { MemoryOptions, MemoryStorageMetadata, WorkingMemorySummary } from "../memory/types";
import type { VoltAgentObservability } from "../observability";
import type { ModelRouterModelId } from "../registries/model-provider-types.generated";
import type {
  DynamicValue,
  DynamicValueOptions,
  PromptContent,
  PromptHelper,
  VoltOpsFeedback,
  VoltOpsFeedbackConfig,
  VoltOpsFeedbackCreateInput,
  VoltOpsFeedbackExpiresIn,
} from "../voltops/types";
import type {
  Workspace,
  WorkspaceConfig,
  WorkspaceFilesystemToolkitOptions,
  WorkspaceSandboxToolkitOptions,
  WorkspaceSearchToolkitOptions,
  WorkspaceSkillsToolkitOptions,
} from "../workspace";
import type { ContextInput } from "./agent";
import type { AgentHooks } from "./hooks";
import type { AgentTraceContext } from "./open-telemetry/trace-context";

// Re-export for backward compatibility
export type { DynamicValueOptions, DynamicValue, PromptHelper, PromptContent };

/**
 * Tool representation for API responses
 */
export interface ApiToolInfo {
  name: string;
  description: string;
  parameters?: any;
}

export interface AgentToolRoutingState {
  search?: ApiToolInfo;
  call?: ApiToolInfo;
  expose?: ApiToolInfo[];
  pool?: ApiToolInfo[];
  enforceSearchBeforeCall?: boolean;
  topK?: number;
}

export type AgentFeedbackOptions = {
  key?: string;
  feedbackConfig?: VoltOpsFeedbackConfig | null;
  expiresAt?: Date | string;
  expiresIn?: VoltOpsFeedbackExpiresIn;
};

export type AgentFeedbackMetadata = {
  traceId: string;
  key: string;
  url: string;
  tokenId?: string;
  expiresAt?: string;
  feedbackConfig?: VoltOpsFeedbackConfig | null;
};

/**
 * Tool with node_id for agent state
 */
export type ToolWithNodeId = (BaseTool | ProviderTool) & {
  node_id: string;
};

export type WorkspaceToolkitOptions = {
  filesystem?: WorkspaceFilesystemToolkitOptions | false;
  sandbox?: WorkspaceSandboxToolkitOptions | false;
  search?: WorkspaceSearchToolkitOptions | false;
  skills?: WorkspaceSkillsToolkitOptions | false;
};

export interface AgentScorerState {
  key: string;
  id: string;
  name: string;
  node_id: string;
  sampling?: SamplingPolicy;
  metadata?: Record<string, unknown> | null;
  params?: Record<string, unknown> | null;
}

/**
 * SubAgent data structure for agent state
 */
export interface SubAgentStateData {
  id: string;
  name: string;
  instructions?: string;
  status: string;
  model: string;
  tools: ApiToolInfo[]; // API representation of tools
  memory?: AgentMemoryState;
  node_id: string;
  subAgents?: SubAgentStateData[];
  scorers?: AgentScorerState[];
  guardrails?: AgentGuardrailStateGroup;
  methodConfig?: {
    method: string;
    schema?: string;
    options?: string[];
  };
  [key: string]: unknown;
}

/**
 * Memory block representation shared across agent and sub-agent state
 */
export interface AgentMemoryState extends Record<string, unknown> {
  node_id: string;
  type?: string;
  resourceId?: string;
  options?: MemoryOptions;
  available?: boolean;
  status?: string;
  storage?: MemoryStorageMetadata;
  workingMemory?: WorkingMemorySummary | null;
  vectorDB?: {
    enabled: boolean;
    adapter?: string;
    dimension?: number;
    status?: string;
    node_id?: string;
  } | null;
  embeddingModel?: {
    enabled: boolean;
    model?: string;
    dimension?: number;
    status?: string;
    node_id?: string;
  } | null;
}

/**
 * Full state of an agent including all properties
 */
export interface AgentFullState {
  id: string;
  name: string;
  instructions?: string;
  status: string;
  model: string;
  node_id: string;
  tools: ToolWithNodeId[];
  toolRouting?: AgentToolRoutingState;
  subAgents: SubAgentStateData[];
  memory: AgentMemoryState;
  scorers?: AgentScorerState[];
  retriever?: {
    name: string;
    description?: string;
    status?: string;
    node_id: string;
  } | null;
  guardrails?: AgentGuardrailStateGroup;
}

/**
 * Enhanced dynamic value for instructions that supports prompt management
 */
export type InstructionsDynamicValue = string | DynamicValue<string | PromptContent>;

/**
 * Enhanced dynamic value for models that supports static or dynamic values
 */
export type ModelDynamicValue<T> = T | DynamicValue<T>;

/**
 * Supported model references for agents (AI SDK models or provider/model strings)
 */
export type AgentModelReference = LanguageModel | ModelRouterModelId;

/**
 * Model fallback configuration for agents.
 */
export type AgentModelConfig = {
  /**
   * Optional stable identifier for the model entry (useful for logging).
   */
  id?: string;
  /**
   * Model reference (static or dynamic).
   */
  model: ModelDynamicValue<AgentModelReference>;
  /**
   * Maximum number of retries for this model before falling back.
   * Defaults to the agent's maxRetries.
   */
  maxRetries?: number;
  /**
   * Whether this model is enabled for fallback selection.
   * @default true
   */
  enabled?: boolean;
};

/**
 * Agent model value that can be static, dynamic, or a fallback list.
 */
export type AgentModelValue = ModelDynamicValue<AgentModelReference> | AgentModelConfig[];

/**
 * Enhanced dynamic value for tools that supports static or dynamic values
 */
export type ToolsDynamicValue =
  | (Tool<any, any> | Toolkit)[]
  | DynamicValue<(Tool<any, any> | Toolkit)[]>;

/**
 * Provider options type for LLM configurations
 */
export type ProviderOptions = {
  // Controls randomness (0-1)
  temperature?: number;
  // Maximum tokens to generate
  maxTokens?: number;
  // Controls diversity via nucleus sampling (0-1)
  topP?: number;
  // Penalizes repeated tokens (0-2)
  frequencyPenalty?: number;
  // Penalizes tokens based on presence in existing text (0-2)
  presencePenalty?: number;
  // Optional seed for reproducible results
  seed?: number;
  // Stop sequences to end generation
  stopSequences?: string[];
  // Provider-specific options that don't fit the common pattern
  extraOptions?: Record<string, unknown>;

  // Callback when a step is finished
  onStepFinish?: (step: StepWithContent) => Promise<void>;

  // Callback when generation completes successfully
  onFinish?: (result: unknown) => Promise<void>;

  // Callback when an error occurs during generation
  onError?: (error: unknown) => Promise<void>;

  [key: string]: unknown;
};

/**
 * Configuration for supervisor agents that have subagents
 */
/**
 * StreamEventType derived from AI SDK's TextStreamPart
 * Includes all event types from AI SDK
 */
export type StreamEventType = TextStreamPart<any>["type"];

/**
 * Configuration for forwarding events from subagents to the parent agent's stream
 */
export type FullStreamEventForwardingConfig = {
  /**
   * Array of event types to forward from subagents
   * Uses AI SDK's TextStreamPart types:
   * - Text: 'text-start', 'text-end', 'text-delta'
   * - Reasoning: 'reasoning-start', 'reasoning-end', 'reasoning-delta'
   * - Tool: 'tool-input-start', 'tool-input-end', 'tool-input-delta',
   *         'tool-call', 'tool-result', 'tool-error'
   * - Other: 'source', 'file', 'start-step', 'finish-step',
   *          'start', 'finish', 'abort', 'error', 'raw'
   * @default ['tool-call', 'tool-result']
   * @example ['tool-call', 'tool-result', 'text-delta']
   */
  types?: StreamEventType[];
};

export type SupervisorConfig = {
  /**
   * Complete custom system message for the supervisor agent
   * If provided, this completely replaces the default template
   * Only agents memory section will be appended if includeAgentsMemory is true
   */
  systemMessage?: string;

  /**
   * Whether to include agents memory in the supervisor system message
   * @default true
   */
  includeAgentsMemory?: boolean;

  /**
   * Additional custom guidelines for the supervisor agent
   */
  customGuidelines?: string[];

  /**
   * Configuration for forwarding events from subagents to the parent agent's full stream
   * Controls which event types are forwarded
   * @default { types: ['tool-call', 'tool-result'] }
   */
  fullStreamEventForwarding?: FullStreamEventForwardingConfig;

  /**
   * Whether to throw an exception when a subagent stream encounters an error
   * If true, stream errors will cause the handoff to throw an exception
   * If false, errors will be captured and returned in the result
   * @default false
   */
  throwOnStreamError?: boolean;

  /**
   * Whether to include error message in the result when no text content was produced
   * Only applies when throwOnStreamError is false
   * If true, the error message will be included in the result field
   * If false, the result will be empty but status will still be 'error'
   * @default true
   */
  includeErrorInEmptyResponse?: boolean;
};

// -----------------------------------------------------------------------------
// Guardrail Types
// -----------------------------------------------------------------------------

export type GuardrailSeverity = "info" | "warning" | "critical";

export type GuardrailAction = "allow" | "modify" | "block";

export interface GuardrailBaseResult {
  pass: boolean;
  action?: GuardrailAction;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface OutputGuardrailStreamArgs extends GuardrailContext {
  part: VoltAgentTextStreamPart;
  streamParts: VoltAgentTextStreamPart[];
  state: Record<string, any>;
  abort: (reason?: string) => never;
}

export type OutputGuardrailStreamResult =
  | VoltAgentTextStreamPart
  | null
  | undefined
  | Promise<VoltAgentTextStreamPart | null | undefined>;

export type OutputGuardrailStreamHandler = (
  args: OutputGuardrailStreamArgs,
) => OutputGuardrailStreamResult;

export type GuardrailFunctionMetadata = {
  guardrailId?: string;
  guardrailName?: string;
  guardrailDescription?: string;
  guardrailTags?: string[];
  guardrailSeverity?: GuardrailSeverity;
};

export type GuardrailFunction<TArgs, TResult> = ((args: TArgs) => TResult | Promise<TResult>) &
  GuardrailFunctionMetadata;

export interface GuardrailDefinition<TArgs, TResult> {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  severity?: GuardrailSeverity;
  metadata?: Record<string, unknown>;
  handler: GuardrailFunction<TArgs, TResult>;
}

export type GuardrailConfig<TArgs, TResult> =
  | GuardrailFunction<TArgs, TResult>
  | GuardrailDefinition<TArgs, TResult>;

export interface AgentGuardrailState {
  id?: string;
  name: string;
  direction: "input" | "output";
  description?: string;
  severity?: GuardrailSeverity;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  node_id: string;
}

export interface AgentGuardrailStateGroup {
  input: AgentGuardrailState[];
  output: AgentGuardrailState[];
}

export interface GuardrailContext {
  agent: Agent;
  context: OperationContext;
  operation: AgentEvalOperationType;
}

export interface InputGuardrailArgs extends GuardrailContext {
  /**
   * The latest value after any previous guardrail modifications.
   */
  input: string | UIMessage[] | BaseMessage[];
  /**
   * Plain text representation of the latest input value.
   */
  inputText: string;
  /**
   * The original user provided value before any guardrail modifications.
   */
  originalInput: string | UIMessage[] | BaseMessage[];
  /**
   * Plain text representation of the original input value.
   */
  originalInputText: string;
}

export interface InputGuardrailResult extends GuardrailBaseResult {
  modifiedInput?: string | UIMessage[] | BaseMessage[];
}

export interface OutputGuardrailArgs<TOutput = unknown> extends GuardrailContext {
  /**
   * The latest value after any previous guardrail modifications.
   */
  output: TOutput;
  /**
   * Optional plain text representation of the latest output value.
   */
  outputText?: string;
  /**
   * The original value produced by the model before guardrail modifications.
   */
  originalOutput: TOutput;
  /**
   * Optional plain text representation of the original output value.
   */
  originalOutputText?: string;
  /**
   * Optional usage metrics for the generation.
   */
  usage?: UsageInfo;
  /**
   * Optional finish reason from the model/provider.
   */
  finishReason?: string | null;
  /**
   * Optional warnings or diagnostics returned by the provider.
   */
  warnings?: unknown[] | null;
}

export interface OutputGuardrailResult<TOutput = unknown> extends GuardrailBaseResult {
  modifiedOutput?: TOutput;
}

export type InputGuardrail = GuardrailConfig<InputGuardrailArgs, InputGuardrailResult>;

export type OutputGuardrailFunction<TOutput = unknown> = GuardrailFunction<
  OutputGuardrailArgs<TOutput>,
  OutputGuardrailResult<TOutput>
> & {
  guardrailStreamHandler?: OutputGuardrailStreamHandler;
};

export interface OutputGuardrailDefinition<TOutput = unknown>
  extends GuardrailDefinition<OutputGuardrailArgs<TOutput>, OutputGuardrailResult<TOutput>> {
  streamHandler?: OutputGuardrailStreamHandler;
}

export type OutputGuardrail<TOutput = unknown> =
  | OutputGuardrailFunction<TOutput>
  | OutputGuardrailDefinition<TOutput>;

// -----------------------------------------------------------------------------
// Middleware Types
// -----------------------------------------------------------------------------

export type MiddlewareDirection = "input" | "output";

export type MiddlewareFunctionMetadata = {
  middlewareId?: string;
  middlewareName?: string;
  middlewareDescription?: string;
  middlewareTags?: string[];
};

export type MiddlewareFunction<TArgs, TResult> = ((args: TArgs) => TResult | Promise<TResult>) &
  MiddlewareFunctionMetadata;

export interface MiddlewareDefinition<TArgs, TResult> {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  handler: MiddlewareFunction<TArgs, TResult>;
}

export interface MiddlewareContext {
  agent: Agent;
  context: OperationContext;
  operation: AgentEvalOperationType;
  retryCount: number;
}

export interface InputMiddlewareArgs extends MiddlewareContext {
  input: string | UIMessage[] | BaseMessage[];
  originalInput: string | UIMessage[] | BaseMessage[];
  abort: <TMetadata = unknown>(
    reason?: string,
    options?: MiddlewareAbortOptions<TMetadata>,
  ) => never;
}

export type InputMiddlewareResult = string | UIMessage[] | BaseMessage[] | undefined;

export interface OutputMiddlewareArgs<TOutput = unknown> extends MiddlewareContext {
  output: TOutput;
  originalOutput: TOutput;
  usage?: UsageInfo;
  finishReason?: string | null;
  warnings?: unknown[] | null;
  abort: <TMetadata = unknown>(
    reason?: string,
    options?: MiddlewareAbortOptions<TMetadata>,
  ) => never;
}

export type OutputMiddlewareResult<TOutput = unknown> = TOutput | undefined;

export type InputMiddleware =
  | MiddlewareDefinition<InputMiddlewareArgs, InputMiddlewareResult>
  | MiddlewareFunction<InputMiddlewareArgs, InputMiddlewareResult>;

export type OutputMiddleware<TOutput = unknown> =
  | MiddlewareDefinition<OutputMiddlewareArgs<TOutput>, OutputMiddlewareResult<TOutput>>
  | MiddlewareFunction<OutputMiddlewareArgs<TOutput>, OutputMiddlewareResult<TOutput>>;

export type AgentSummarizationOptions = {
  enabled?: boolean;
  triggerTokens?: number;
  keepMessages?: number;
  maxOutputTokens?: number;
  systemPrompt?: string | null;
  model?: AgentModelValue;
};

/**
 * Agent configuration options
 */
export type AgentOptions = {
  // Identity
  id?: string;
  name: string;
  purpose?: string;

  // Core AI
  model: AgentModelValue;
  instructions: InstructionsDynamicValue;

  // Tools & Memory
  tools?: (Tool<any, any> | Toolkit | VercelTool)[] | DynamicValue<(Tool<any, any> | Toolkit)[]>;
  toolkits?: Toolkit[];
  toolRouting?: ToolRoutingConfig | false;
  workspace?: Workspace | WorkspaceConfig | false;
  workspaceToolkits?: WorkspaceToolkitOptions | false;
  memory?: Memory | false;
  summarization?: AgentSummarizationOptions | false;

  // Retriever/RAG
  retriever?: BaseRetriever;

  // SubAgents
  subAgents?: SubAgentConfig[];
  supervisorConfig?: SupervisorConfig;
  maxHistoryEntries?: number;

  // Hooks
  hooks?: AgentHooks;

  // Guardrails
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<any>[];

  // Middleware
  inputMiddlewares?: InputMiddleware[];
  outputMiddlewares?: OutputMiddleware<any>[];
  /**
   * Default retry count for middleware-triggered retries.
   * Per-call maxMiddlewareRetries overrides this value.
   */
  maxMiddlewareRetries?: number;

  // Configuration
  temperature?: number;
  maxOutputTokens?: number;
  maxSteps?: number;
  /**
   * Default retry count for model calls before falling back.
   * Overridden by per-model maxRetries or per-call maxRetries.
   */
  maxRetries?: number;
  feedback?: AgentFeedbackOptions | boolean;
  /**
   * Default stop condition for step execution (ai-sdk `stopWhen`).
   * Per-call `stopWhen` in method options overrides this.
   */
  stopWhen?: StopWhen;
  markdown?: boolean;
  /**
   * When true, use the active VoltAgent span as the parent if parentSpan is not provided.
   * Defaults to true.
   */
  inheritParentSpan?: boolean;

  // Voice
  voice?: Voice;

  // System
  logger?: Logger;
  voltOpsClient?: VoltOpsClient;
  observability?: VoltAgentObservability;

  // User context
  context?: ContextInput;

  // Live evaluation configuration
  eval?: AgentEvalConfig;
};

export type AgentEvalOperationType =
  | "generateText"
  | "generateTitle"
  | "streamText"
  | "generateObject"
  | "streamObject"
  | "workflow";

export interface AgentEvalToolCall extends Record<string, unknown> {
  toolCallId?: string;
  toolName?: string;
  arguments?: Record<string, unknown> | null;
  content?: string;
  stepIndex?: number;
  usage?: UsageInfo | null;
  subAgentId?: string;
  subAgentName?: string;
}

export interface AgentEvalToolResult extends Record<string, unknown> {
  toolCallId?: string;
  toolName?: string;
  result?: unknown;
  content?: string;
  stepIndex?: number;
  usage?: UsageInfo | null;
  subAgentId?: string;
  subAgentName?: string;
  isError?: boolean;
  error?: unknown;
}

export interface AgentEvalPayload {
  operationId: string;
  operationType: AgentEvalOperationType;
  input?: string | null;
  output?: string | null;
  rawInput?: string | UIMessage[] | BaseMessage[];
  rawOutput?: unknown;
  /**
   * Full message/step chain available to scorers.
   * Includes normalized input messages (when available) plus execution steps
   * such as `text`, `tool_call`, and `tool_result`.
   */
  messages?: StepWithContent[];
  /**
   * Tool-call events captured during execution.
   * If provider-native tool call payloads are available they are preserved.
   */
  toolCalls?: AgentEvalToolCall[];
  /**
   * Tool-result events captured during execution.
   * If provider-native tool result payloads are available they are preserved.
   */
  toolResults?: AgentEvalToolResult[];
  userId?: string;
  conversationId?: string;
  traceId: string;
  spanId: string;
  metadata?: Record<string, unknown>;
}

export type AgentEvalContext = AgentEvalPayload &
  Record<string, unknown> & {
    agentId: string;
    agentName: string;
    timestamp: string;
    rawPayload: AgentEvalPayload;
  };

export type AgentEvalParams = Record<string, unknown>;

export type AgentEvalSamplingPolicy = SamplingPolicy;

export type AgentEvalScorerFactory = () =>
  | LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>
  | Promise<LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>>;

export type AgentEvalScorerReference =
  | LocalScorerDefinition<AgentEvalContext, Record<string, unknown>>
  | AgentEvalScorerFactory;

export interface AgentEvalResult {
  scorerId: string;
  scorerName?: string;
  status: "success" | "error" | "skipped";
  score?: number | null;
  metadata?: Record<string, unknown> | null;
  error?: unknown;
  durationMs?: number;
  payload: AgentEvalPayload;
  rawPayload: AgentEvalPayload;
}

export type AgentEvalFeedbackSaveInput = Omit<VoltOpsFeedbackCreateInput, "traceId"> & {
  traceId?: string;
};

export type AgentEvalFeedbackHelper = {
  save: (input: AgentEvalFeedbackSaveInput) => Promise<VoltOpsFeedback | null>;
};

export type AgentEvalResultCallbackArgs = AgentEvalResult & {
  result: AgentEvalResult;
  feedback: AgentEvalFeedbackHelper;
};

export interface AgentEvalScorerConfig {
  scorer: AgentEvalScorerReference;
  params?:
    | AgentEvalParams
    | ((
        context: AgentEvalContext,
      ) => AgentEvalParams | undefined | Promise<AgentEvalParams | undefined>);
  sampling?: AgentEvalSamplingPolicy;
  id?: string;
  onResult?: (result: AgentEvalResultCallbackArgs) => void | Promise<void>;
  buildPayload?: (
    context: AgentEvalContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  buildParams?: (
    context: AgentEvalContext,
  ) => AgentEvalParams | undefined | Promise<AgentEvalParams | undefined>;
}

export interface AgentEvalConfig {
  scorers: Record<string, AgentEvalScorerConfig>;
  triggerSource?: string;
  environment?: string;
  sampling?: AgentEvalSamplingPolicy;
  redact?: (payload: AgentEvalPayload) => AgentEvalPayload;
}

/**
 * System message response with optional prompt metadata
 */
export interface SystemMessageResponse {
  systemMessages: BaseMessage | BaseMessage[];
  promptMetadata?: {
    /** Base prompt ID for tracking */
    prompt_id?: string;
    /** PromptVersion ID (the actual entity ID) */
    prompt_version_id?: string;
    name?: string;
    version?: number;
    labels?: string[];
    tags?: string[];
    source?: "local-file" | "online";
    latest_version?: number;
    outdated?: boolean;
    config?: {
      model?: string;
      temperature?: number;
      [key: string]: any;
    };
  };
  isDynamicInstructions?: boolean;
}

/**
 * Provider instance type helper
 */
export type ProviderInstance<T> = T extends { llm: infer P } ? P : never;

/**
 * Model type helper
 */
export type ModelType<T> = T extends { llm: LLMProvider<any> }
  ? Parameters<T["llm"]["generateText"]>[0]["model"]
  : never;

/**
 * Infer generate text response type
 */
export type InferGenerateTextResponseFromProvider<TProvider extends { llm: LLMProvider<any> }> =
  ProviderTextResponse<InferOriginalResponseFromProvider<TProvider, "generateText">>;

/**
 * Infer stream text response type
 */
export type InferStreamTextResponseFromProvider<TProvider extends { llm: LLMProvider<any> }> =
  ProviderTextStreamResponse<InferOriginalResponseFromProvider<TProvider, "streamText">>;

/**
 * Infer generate object response type
 */
export type InferGenerateObjectResponseFromProvider<
  TProvider extends { llm: LLMProvider<any> },
  TSchema extends z.ZodType,
> = ProviderObjectResponse<
  InferOriginalResponseFromProvider<TProvider, "generateObject">,
  z.infer<TSchema>
>;

/**
 * Infer stream object response type
 */
export type InferStreamObjectResponseFromProvider<
  TProvider extends { llm: LLMProvider<any> },
  TSchema extends z.ZodType,
> = ProviderObjectStreamResponse<
  InferOriginalResponseFromProvider<TProvider, "streamObject">,
  z.infer<TSchema>
>;

/**
 * Provider type helper
 */
export type ProviderType<T> = T extends { llm: LLMProvider<infer P> } ? P : never;

/**
 * Common generate options - internal version that includes historyEntryId
 * Not exposed directly to users
 */
export interface CommonGenerateOptions {
  // Common LLM provider properties
  provider?: ProviderOptions;

  // Conversation ID to maintain context
  conversationId?: string;

  // User ID for authentication
  userId?: string;

  // Context limit for conversation
  contextLimit?: number;

  // Specific tools to use for this generation (overrides agent's tools)
  tools?: BaseTool[];

  // Maximum number of steps for this specific request (overrides agent's maxSteps)
  maxSteps?: number;

  // Feedback configuration for trace satisfaction links
  feedback?: AgentFeedbackOptions | boolean;

  // AbortController for cancelling the operation and accessing the signal
  abortController?: AbortController;

  /**
   * @deprecated Use abortController instead. This field will be removed in a future version.
   * Signal for aborting the operation
   */
  signal?: AbortSignal;

  // Current history entry ID for parent context in tool execution
  historyEntryId?: string;

  // The OperationContext associated with this specific generation call
  operationContext?: OperationContext;

  // Optional user-defined context to be passed from a parent operation
  context?: UserContext;

  // Optional hooks to be included only during the operation call and not persisted in the agent
  hooks?: AgentHooks;
}

/**
 * Internal options that extend PublicGenerateOptions with additional parameters
 * Used internally by the agent
 */
export type InternalGenerateOptions = PublicGenerateOptions & {
  /**
   * Parent agent ID for delegation chains
   */
  parentAgentId?: string;

  /**
   * Parent's operation context - if provided, steps will be added to parent's conversationSteps
   */
  parentOperationContext?: OperationContext;

  /**
   * Parent OpenTelemetry span for proper span hierarchy
   * Used when agent is called from workflows or as a subagent
   */
  parentSpan?: Span;
};

/**
 * Public-facing generate options for external users
 * Omits internal implementation details like historyEntryId and operationContext
 */
export type PublicGenerateOptions = Omit<
  CommonGenerateOptions,
  "historyEntryId" | "operationContext"
>;

/**
 * Agent status information
 */
export type AgentStatus = "idle" | "working" | "error" | "completed" | "cancelled";

/**
 * Tool call definition
 */
export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

/**
 * Model tool call format
 */
export type ModelToolCall = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};

/**
 * Represents the payload used when sending a tool's result back to the chat runtime
 *  via useChat().addToolResult in the Vercel AI SDK.
 */
export type ClientSideToolResult =
  | { tool: string; toolCallId: string; output: unknown }
  | { tool: string; toolCallId: string; state: "output-error"; errorText: string };

/**
 * Agent response format
 */
export type AgentResponse = {
  /**
   * Response content
   */
  content: string;

  /**
   * Tool calls made by the model (if any)
   */
  toolCalls?: ToolCall[];

  /**
   * Additional metadata
   */
  metadata: {
    agentId: string;
    agentName: string;
    [key: string]: unknown;
  };
};

/**
 * Agent handoff options
 */
export type AgentHandoffOptions = {
  /**
   * The task description to be handed off
   */
  task: string;

  /**
   * The target agent to hand off to
   */
  targetAgent: any; // Using any to avoid circular dependency

  /**
   * The source agent that is handing off the task
   * Used for hooks and tracking the chain of delegation
   */
  sourceAgent?: any; // Using any to avoid circular dependency

  /**
   * Additional context to provide to the target agent
   */
  context?: Record<string, unknown>;

  /**
   * The conversation ID to use for the handoff
   * If not provided, a new conversation ID will be generated
   */
  conversationId?: string;

  /**
   * The user ID to use for the handoff
   * This will be passed to the target agent's generateText method
   */
  userId?: string;

  /**
   * Shared context messages to pass to the target agent
   * These messages provide conversation history context
   */
  sharedContext?: BaseMessage[];

  /**
   * Parent agent ID
   */
  parentAgentId?: string;

  /**
   * Optional real-time event forwarder function
   * Used to forward SubAgent events to parent stream in real-time
   */
  forwardEvent?: (event: StreamEvent) => Promise<void>;

  /**
   * Parent's operation context to merge SubAgent steps into
   */
  parentOperationContext?: OperationContext;

  /**
   * AbortSignal to cancel the handoff operation
   */
  signal?: AbortSignal;

  /**
   * Maximum number of steps for the subagent (inherited from parent or API call)
   * If not provided, subagent will use its own maxSteps calculation
   */
  maxSteps?: number;
};

/**
 * Result of a handoff to another agent
 */
export interface AgentHandoffResult {
  /**
   * Result text from the agent
   */
  result: string;

  /**
   * Conversation ID used for the interaction
   */
  conversationId: string;

  /**
   * Messages exchanged during the handoff
   */
  messages: BaseMessage[];

  /**
   * Status of the handoff operation
   */
  status?: "success" | "error";

  /**
   * Error information if the handoff failed
   */
  error?: Error | string;

  /**
   * Stream events captured from sub-agent for forwarding to parent
   */
  streamEvents?: Array<{
    type: string;
    data: any;
    timestamp: string;
    subAgentId: string;
    subAgentName: string;
  }>;
}

/**
 * Context for a specific agent operation (e.g., one generateText call)
 */
export type OperationContext = {
  /** Unique identifier for the operation */
  readonly operationId: string;

  /** Optional user identifier associated with this operation */
  userId?: string;

  /** Optional conversation identifier associated with this operation */
  conversationId?: string;

  /** Workspace configured on the executing agent (if any). */
  workspace?: Workspace;

  /** User-managed context map for this operation */
  readonly context: Map<string | symbol, unknown>;

  /** System-managed context map for internal operation tracking */
  readonly systemContext: Map<string | symbol, unknown>;

  /** Whether this operation is still active */
  isActive: boolean;

  /** Parent agent ID if part of a delegation chain */
  parentAgentId?: string;

  /** Optional elicitation bridge for requesting user input */
  elicitation?: (request: unknown) => Promise<unknown>;

  /** Trace context for managing span hierarchy and common attributes */
  traceContext: AgentTraceContext;

  /** Execution-scoped logger with full context (userId, conversationId, executionId) */
  logger: Logger;

  /** Conversation steps for building full message history including tool calls/results */
  conversationSteps?: StepWithContent[];

  /** AbortController for cancelling the operation and accessing the signal */
  abortController: AbortController;

  /** Start time of the operation (Date object) */
  startTime: Date;

  /** Cancellation error to be thrown when operation is aborted */
  cancellationError?: CancellationError;

  /** Input provided to the agent operation (string, UIMessages, or BaseMessages) */
  input?: string | UIMessage[] | BaseMessage[];

  /** Output generated by the agent operation (text or object) */
  output?: string | object;
};

// ToolExecutionContext removed in favor of passing OperationContext directly to tools

/**
 * Specific information related to a tool execution error.
 */
export interface ToolErrorInfo {
  /** The unique identifier of the tool call. */
  toolCallId: string;

  /** The name of the tool that was executed. */
  toolName: string;

  /** The original error thrown directly by the tool during execution (if available). */
  toolExecutionError?: unknown;

  /** The arguments passed to the tool when the error occurred (for debugging). */
  toolArguments?: unknown;
}

/**
 * Type for onError callbacks in streaming operations.
 * Providers must pass an error conforming to the VoltAgentError structure.
 */
export type StreamOnErrorCallback = (error: VoltAgentError) => Promise<void> | void;

export type UserContext = Map<string | symbol, unknown>;

/**
 * Standardized object structure passed to the onFinish callback
 * when streamText completes successfully.
 */
export interface StreamTextFinishResult {
  /** The final, consolidated text output from the stream. */
  text: string;

  /** Token usage information (if available). */
  usage?: UsageInfo;

  /** Feedback metadata for the trace, if enabled. */
  feedback?: AgentFeedbackMetadata | null;

  /** The reason the stream finished (if available, e.g., 'stop', 'length', 'tool-calls'). */
  finishReason?: string;

  /** The original completion response object from the provider (if available). */
  providerResponse?: unknown;

  /** Any warnings generated during the completion (if available). */
  warnings?: unknown[];

  /** User context containing any custom metadata from the operation. */
  context?: UserContext;
}

/**
 * Type for the onFinish callback function for streamText.
 */
export type StreamTextOnFinishCallback = (result: StreamTextFinishResult) => Promise<void> | void;

/**
 * Standardized object structure passed to the onFinish callback
 * when streamObject completes successfully.
 * @template TObject The expected type of the fully formed object.
 */
export interface StreamObjectFinishResult<TObject> {
  /** The final, fully formed object from the stream. */
  object: TObject;

  /** Token usage information (if available). */
  usage?: UsageInfo;

  /** The original completion response object from the provider (if available). */
  providerResponse?: unknown;

  /** Any warnings generated during the completion (if available). */
  warnings?: unknown[];

  /** The reason the stream finished (if available). Although less common for object streams. */
  finishReason?: string;

  /** User context containing any custom metadata from the operation. */
  context?: UserContext;
}

/**
 * Type for the onFinish callback function for streamObject.
 * @template TObject The expected type of the fully formed object.
 */
export type StreamObjectOnFinishCallback<TObject> = (
  result: StreamObjectFinishResult<TObject>,
) => Promise<void> | void;

/**
 * Standardized success result structure for generateText.
 */
export interface StandardizedTextResult {
  /** The generated text. */
  text: string;
  /** Token usage information (if available). */
  usage?: UsageInfo;
  /** Feedback metadata for the trace, if enabled. */
  feedback?: AgentFeedbackMetadata | null;
  /** Original provider response (if needed). */
  providerResponse?: unknown;
  /** Finish reason (if available from provider). */
  finishReason?: string;
  /** Warnings (if available from provider). */
  warnings?: unknown[];
  /** User context containing any custom metadata from the operation. */
  context?: UserContext;
}

/**
 * Standardized success result structure for generateObject.
 * @template TObject The expected type of the generated object.
 */
export interface StandardizedObjectResult<TObject> {
  /** The generated object. */
  object: TObject;
  /** Token usage information (if available). */
  usage?: UsageInfo;
  /** Original provider response (if needed). */
  providerResponse?: unknown;
  /** Finish reason (if available from provider). */
  finishReason?: string;
  /** Warnings (if available from provider). */
  warnings?: unknown[];
  /** User context containing any custom metadata from the operation. */
  context?: UserContext;
}

/**
 * Unified output type for the onEnd hook, representing the successful result
 * of any core agent operation. Use 'type guarding' or check specific fields
 * within the hook implementation to determine the concrete type.
 * Object types are generalized to 'unknown' here for the union.
 */
export type AgentOperationOutput =
  | StandardizedTextResult
  | StreamTextFinishResult
  | StandardizedObjectResult<unknown> // Object type generalized
  | StreamObjectFinishResult<unknown>; // Object type generalized

type InferResponseFromProvider<
  TProvider extends { llm: LLMProvider<any> },
  TMethod extends "generateText" | "streamText" | "generateObject" | "streamObject",
> = Awaited<ReturnType<TProvider["llm"][TMethod]>>;

type InferOriginalResponseFromProvider<
  TProvider extends { llm: LLMProvider<any> },
  TMethod extends "generateText" | "streamText" | "generateObject" | "streamObject",
> = InferResponseFromProvider<TProvider, TMethod>["provider"];

export type GenerateTextResponse<TProvider extends { llm: LLMProvider<any> }> =
  InferGenerateTextResponseFromProvider<TProvider> & {
    context: Map<string | symbol, unknown>;
  };

export type StreamTextResponse<TProvider extends { llm: LLMProvider<any> }> =
  InferStreamTextResponseFromProvider<TProvider> & {
    context?: UserContext;
  };

export type GenerateObjectResponse<
  TProvider extends { llm: LLMProvider<any> },
  TSchema extends z.ZodType,
> = InferGenerateObjectResponseFromProvider<TProvider, TSchema> & {
  context: Map<string | symbol, unknown>;
};

export type StreamObjectResponse<
  TProvider extends { llm: LLMProvider<any> },
  TSchema extends z.ZodType,
> = InferStreamObjectResponseFromProvider<TProvider, TSchema> & {
  context?: UserContext;
};
