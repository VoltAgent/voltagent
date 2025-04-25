import type { BaseMessage } from "../agent/providers/base/types";
import type { Memory, MemoryOptions } from "../memory/types";
import type { AgentTool, Toolkit } from "../tool";
import type { LLMProvider } from "./providers";
import type { BaseTool } from "./providers";
import type { StepWithContent } from "./providers";
import type { AgentHistoryEntry } from "./history";
import type { EventUpdater } from "../events";

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
   * Agent description
   */
  description?: string;

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
  tools?: (AgentTool | Toolkit)[];

  /**
   * Sub-agents that this agent can delegate tasks to
   */
  subAgents?: any[]; // Using any to avoid circular dependency
};

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
  // Internal use only, not exposed to external users
  historyEntryId?: string;
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
 * Omits internal implementation details
 */
export type PublicGenerateOptions = Omit<CommonGenerateOptions, "historyEntryId">;

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
 * Operation context to isolate state for concurrent operations
 * Prevents race conditions when the same agent instance is used concurrently
 */
export type OperationContext = {
  /** The history entry associated with this operation */
  historyEntry: AgentHistoryEntry;
  /** Map to store tool event updaters using tool call ID as key */
  eventUpdaters: Map<string, EventUpdater>;
  /** Whether this operation is still active */
  isActive: boolean;
  /** Parent agent ID */
  parentAgentId?: string;
  /** Parent history entry ID */
  parentHistoryEntryId?: string;
};
