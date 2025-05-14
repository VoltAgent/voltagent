import type { BaseMessage } from "../agent/providers/base/types";
import type { Memory, MemoryOptions } from "../memory/types";
import type { Tool, Toolkit } from "../tool";
import type { LLMProvider } from "./providers";
import type { BaseTool } from "./providers";
import type { StepWithContent } from "./providers";
import type { AgentHistoryEntry } from "./history";
import type { EventUpdater } from "../events";
import type { ToolExecuteOptions } from "./providers/base/types";
import type { UsageInfo } from "./providers/base/types";
import type { Span } from "@opentelemetry/api";
import type { VoltAgentExporter } from "../telemetry/exporter";

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

  // Tool execution context passed down from the agent
  toolExecutionContext?: ToolExecutionContext;

  [key: string]: unknown;
};

/**
 * Agent configuration options
 */
export type AgentOptions = {
  /**
   * Unique identifier for the agent
   * If not provided, a UUID will be generated
   */
  id?: string;

  /**
   * Agent name
   */
  name: string;

  /**
   * Memory storage for the agent (optional)
   * Set to false to explicitly disable memory
   */
  memory?: Memory | false;

  /**
   * Memory options for the agent
   */
  memoryOptions?: MemoryOptions;

  /**
   * Tools and/or Toolkits that the agent can use
   */
  tools?: (Tool<any> | Toolkit)[];

  /**
   * Sub-agents that this agent can delegate tasks to
   */
  subAgents?: any[]; // Using unknown to avoid circular dependency

  /**
   * Optional user-defined context to be passed around
   */
  userContext?: Map<string | symbol, unknown>;

  /**
   * Telemetry exporter for the agent
   * Used to send telemetry data to an external service
   */
  telemetryExporter?: VoltAgentExporter;
} & (
  | {
      /**
       * @deprecated Use `instructions` instead.
       * Agent description (deprecated, use instructions)
       */
      description: string;
      /**
       * Agent instructions. This is the preferred field.
       */
      instructions?: string;
    }
  | {
      /**
       * @deprecated Use `instructions` instead.
       * Agent description (deprecated, use instructions)
       */
      description?: undefined; // Ensure description is treated as absent
      /**
       * Agent instructions. This is the preferred field.
       * Required if description is not provided.
       */
      instructions: string;
    }
);

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
export type InferGenerateTextResponse<T extends { llm: LLMProvider<any> }> = Awaited<
  ReturnType<T["llm"]["generateText"]>
>;

/**
 * Infer stream text response type
 */
export type InferStreamTextResponse<T extends { llm: LLMProvider<any> }> = Awaited<
  ReturnType<T["llm"]["streamText"]>
>;

/**
 * Infer generate object response type
 */
export type InferGenerateObjectResponse<T extends { llm: LLMProvider<any> }> = Awaited<
  ReturnType<T["llm"]["generateObject"]>
>;

/**
 * Infer stream object response type
 */
export type InferStreamObjectResponse<T extends { llm: LLMProvider<any> }> = Awaited<
  ReturnType<T["llm"]["streamObject"]>
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

  // Signal for aborting the operation
  signal?: AbortSignal;

  // Current history entry ID for parent context in tool execution
  historyEntryId?: string;

  // The OperationContext associated with this specific generation call
  operationContext?: OperationContext;

  // Optional user-defined context to be passed from a parent operation
  userContext?: Map<string | symbol, unknown>;
}

/**
 * Internal options extending CommonGenerateOptions with parent context fields
 * Used for internal implementation of agent methods
 */
export interface InternalGenerateOptions extends CommonGenerateOptions {
  // Parent agent ID for tracking delegation chain
  parentAgentId?: string;

  // Parent history entry ID for connecting events
  parentHistoryEntryId?: string;
}

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
export type AgentStatus = "idle" | "working" | "tool_calling" | "error" | "completed";

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
   * Parent history entry ID
   */
  parentHistoryEntryId?: string;

  /**
   * Optional user-defined context to be passed from the supervisor agent
   */
  userContext?: Map<string | symbol, unknown>;
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
}

/**
 * Context for a specific agent operation (e.g., one generateText call)
 */
export type OperationContext = {
  /** Unique identifier for the operation (maps to historyEntryId) */
  readonly operationId: string;

  /** User-managed context map for this specific operation */
  readonly userContext: Map<string | symbol, any>;

  /** The history entry associated with this operation */
  historyEntry: AgentHistoryEntry;

  /** Map to store tool event updaters using tool call ID as key */
  eventUpdaters: Map<string, EventUpdater>;

  /** Whether this operation is still active */
  isActive: boolean;

  /** Parent agent ID if part of a delegation chain */
  parentAgentId?: string;

  /** Parent history entry ID if part of a delegation chain */
  parentHistoryEntryId?: string;

  /** The root OpenTelemetry span for this operation */
  otelSpan?: Span;

  /** Map to store active OpenTelemetry spans for tool calls within this operation */
  toolSpans?: Map<string, Span>; // Key: toolCallId
};

/**
 * Tool execution context passed to tool.execute method
 * Includes operation-specific context and necessary identifiers
 * Extends base ToolExecuteOptions.
 */
export type ToolExecutionContext = ToolExecuteOptions & {
  /** ID of the agent executing the tool */
  agentId: string;

  /** History ID associated with the current operation */
  historyEntryId: string;
};

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
 * Standardized error structure for Voltagent agent operations.
 * Providers should wrap their specific errors in this structure before
 * passing them to onError callbacks.
 */
export interface VoltAgentError {
  /** A clear, human-readable error message. This could be a general message or derived from toolError info. */
  message: string;

  /** The original error object thrown by the provider or underlying system (if available). */
  originalError?: unknown;

  /** Optional error code or identifier from the provider. */
  code?: string | number;

  /** Additional metadata related to the error (e.g., retry info, request ID). */
  metadata?: Record<string, any>;

  /** Information about the step or stage where the error occurred (optional, e.g., 'llm_request', 'tool_execution', 'response_parsing'). */
  stage?: string;

  /** If the error occurred during tool execution, this field contains the relevant details. Otherwise, it's undefined. */
  toolError?: ToolErrorInfo;
}

/**
 * Type for onError callbacks in streaming operations.
 * Providers must pass an error conforming to the VoltAgentError structure.
 */
export type StreamOnErrorCallback = (error: VoltAgentError) => Promise<void> | void;

/**
 * Standardized object structure passed to the onFinish callback
 * when streamText completes successfully.
 */
export interface StreamTextFinishResult {
  /** The final, consolidated text output from the stream. */
  text: string;

  /** Token usage information (if available). */
  usage?: UsageInfo;

  /** The reason the stream finished (if available, e.g., 'stop', 'length', 'tool-calls'). */
  finishReason?: string;

  /** The original completion response object from the provider (if available). */
  providerResponse?: unknown;

  /** Any warnings generated during the completion (if available). */
  warnings?: unknown[];
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
  /** Original provider response (if needed). */
  providerResponse?: unknown;
  /** Finish reason (if available from provider). */
  finishReason?: string;
  /** Warnings (if available from provider). */
  warnings?: unknown[];
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
