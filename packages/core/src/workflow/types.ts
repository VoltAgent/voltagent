import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { StreamTextResult, UIMessage } from "ai";
import type * as TF from "type-fest";
import type { z } from "zod";
import type { Agent } from "../agent/agent";
import type { BaseMessage } from "../agent/providers";
import type { UsageInfo } from "../agent/providers";
import type { InputGuardrail, OutputGuardrail, UserContext } from "../agent/types";
import type { Memory } from "../memory";
import type { VoltAgentObservability } from "../observability";
import type { WorkflowExecutionContext } from "./context";
import type { WorkflowState } from "./internal/state";
import type { InternalBaseWorkflowInputSchema } from "./internal/types";
import type { WorkflowStep } from "./steps";

export interface WorkflowSuspensionMetadata<SUSPEND_DATA = DangerouslyAllowAny> {
  /** Timestamp when the workflow was suspended */
  suspendedAt: Date;
  /** Reason for suspension (user-requested, system, error, etc.) */
  reason?: string;
  /** The step index where suspension occurred */
  suspendedStepIndex: number;
  /** Last event sequence number before suspension */
  lastEventSequence?: number;
  /** Validated data passed when suspending (if suspendSchema was provided) */
  suspendData?: SUSPEND_DATA;
  /** Checkpoint data for resumption */
  checkpoint?: {
    /** Current step's partial execution state */
    stepExecutionState?: DangerouslyAllowAny;
    /** Results from completed steps that need to be preserved */
    completedStepsData?: DangerouslyAllowAny[];
  };
}

export interface WorkflowCancellationMetadata {
  /** Timestamp when the workflow was cancelled */
  cancelledAt: Date;
  /** Reason for cancellation */
  reason?: string;
}

/**
 * Custom abort controller for workflow suspension with reason tracking
 */
export interface WorkflowSuspendController {
  /**
   * The abort signal to pass to the workflow
   */
  signal: AbortSignal;
  /**
   * Suspend the workflow with a reason
   */
  suspend: (reason?: string) => void;
  /**
   * Cancel the workflow with a reason
   */
  cancel: (reason?: string) => void;
  /**
   * Check if the workflow has been suspended
   */
  isSuspended: () => boolean;
  /**
   * Check if the workflow has been cancelled
   */
  isCancelled: () => boolean;
  /**
   * Get the suspension or cancellation reason
   */
  getReason: () => string | undefined;
  /**
   * Get the cancellation reason if cancellation was requested
   */
  getCancelReason: () => string | undefined;
}

/**
 * Base result interface shared by all workflow execution results
 */
export interface WorkflowExecutionResultBase<
  RESULT_SCHEMA extends z.ZodTypeAny,
  // @ts-ignore - RESUME_SCHEMA is used by child interfaces
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
> {
  /**
   * Unique execution ID for this workflow run
   */
  executionId: string;
  /**
   * The workflow ID
   */
  workflowId: string;
  /**
   * When the workflow execution started
   */
  startAt: Date;
  /**
   * When the workflow execution ended (completed, suspended, or errored)
   */
  endAt: Date | Promise<Date>;
  /**
   * Current status of the workflow execution
   */
  status:
    | "completed"
    | "suspended"
    | "cancelled"
    | "error"
    | Promise<"completed" | "suspended" | "cancelled" | "error">;
  /**
   * The result data if workflow completed successfully
   */
  result: z.infer<RESULT_SCHEMA> | null | Promise<z.infer<RESULT_SCHEMA> | null>;
  /**
   * Suspension metadata if workflow was suspended
   */
  suspension?: WorkflowSuspensionMetadata | Promise<WorkflowSuspensionMetadata | undefined>;
  /**
   * Cancellation metadata if workflow was cancelled
   */
  cancellation?: WorkflowCancellationMetadata | Promise<WorkflowCancellationMetadata | undefined>;
  /**
   * Error information if workflow failed
   */
  error?: unknown | Promise<unknown | undefined>;
  /**
   * Total token usage from all andAgent steps in the workflow
   */
  usage: UsageInfo | Promise<UsageInfo>;
}

/**
 * Result returned from workflow execution with suspend/resume capabilities
 */
export interface WorkflowExecutionResult<
  RESULT_SCHEMA extends z.ZodTypeAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
> extends WorkflowExecutionResultBase<RESULT_SCHEMA, RESUME_SCHEMA> {
  // Override with concrete types (not promises)
  endAt: Date;
  status: "completed" | "suspended" | "cancelled" | "error";
  result: z.infer<RESULT_SCHEMA> | null;
  suspension?: WorkflowSuspensionMetadata;
  cancellation?: WorkflowCancellationMetadata;
  error?: unknown;
  usage: UsageInfo;
  /**
   * Resume a suspended workflow execution
   * @param input - Optional new input data for resuming (validated against resumeSchema if provided)
   * @param options - Optional options for resuming, including stepId to resume from a specific step
   * @returns A new execution result that can also be resumed if suspended again
   */
  resume: (
    input: z.infer<RESUME_SCHEMA>,
    options?: { stepId?: string },
  ) => Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
}

/**
 * Result returned from workflow stream execution
 * Extends base with streaming capabilities and promise-based fields
 */
export interface WorkflowStreamResult<
  RESULT_SCHEMA extends z.ZodTypeAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
> extends WorkflowExecutionResultBase<RESULT_SCHEMA, RESUME_SCHEMA>,
    AsyncIterable<WorkflowStreamEvent> {
  // Override with promise types for async execution
  endAt: Promise<Date>;
  status: Promise<"completed" | "suspended" | "cancelled" | "error">;
  result: Promise<z.infer<RESULT_SCHEMA> | null>;
  suspension: Promise<WorkflowSuspensionMetadata | undefined>;
  cancellation: Promise<WorkflowCancellationMetadata | undefined>;
  error: Promise<unknown | undefined>;
  usage: Promise<UsageInfo>;
  toUIMessageStreamResponse: StreamTextResult<any, any>["toUIMessageStreamResponse"];
  /**
   * Resume a suspended workflow execution
   * @param input - Optional new input data for resuming (validated against resumeSchema if provided)
   * @param options - Optional options for resuming, including stepId to resume from a specific step
   * @returns A new stream result that can also be resumed if suspended again
   */
  resume: (
    input: z.infer<RESUME_SCHEMA>,
    options?: { stepId?: string },
  ) => Promise<WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
  /**
   * Request workflow suspension
   */
  suspend: (reason?: string) => void;
  /**
   * Cancel the workflow execution
   */
  cancel: (reason?: string) => void;
  /**
   * Abort the workflow execution
   */
  abort: () => void;
}

export interface WorkflowRetryConfig {
  /**
   * Number of retry attempts for a step when it throws an error
   * @default 0
   */
  attempts?: number;
  /**
   * Delay in milliseconds between retry attempts
   * @default 0
   */
  delayMs?: number;
}

export interface WorkflowRunOptions {
  /**
   * The active step, this can be used to track the current step in a workflow
   * @default 0
   */
  active?: number;
  /**
   * The execution ID, this can be used to track the current execution in a workflow
   * @default uuidv4
   */
  executionId?: string;
  /**
   * The conversation ID, this can be used to track the current conversation in a workflow
   */
  conversationId?: string;
  /**
   * The user ID, this can be used to track the current user in a workflow
   */
  userId?: string;
  /**
   * The user context, this can be used to track the current user context in a workflow
   */
  context?: UserContext;
  /**
   * Override Memory V2 for this specific execution
   * Takes priority over workflow config memory and global memory
   */
  memory?: Memory;
  /**
   * Suspension controller for managing workflow suspension
   */
  suspendController?: WorkflowSuspendController;
  /**
   * Options for resuming a suspended workflow
   */
  resumeFrom?: WorkflowResumeOptions;
  /**
   * Suspension mode:
   * - 'graceful': Wait for current step to complete before suspending (default)
   * - 'immediate': Suspend immediately, even during step execution
   * @default 'graceful'
   */
  suspensionMode?: "immediate" | "graceful";
  /**
   * Logger instance to use for this workflow execution
   * If not provided, will use the workflow's logger or global logger
   */
  logger?: Logger;
  /**
   * Override retry settings for this workflow execution
   */
  retryConfig?: WorkflowRetryConfig;
  /**
   * Input guardrails to run before workflow execution
   */
  inputGuardrails?: InputGuardrail[];
  /**
   * Output guardrails to run after workflow execution
   */
  outputGuardrails?: OutputGuardrail<any>[];
  /**
   * Optional agent instance to supply to workflow guardrails
   */
  guardrailAgent?: Agent;
}

export interface WorkflowResumeOptions {
  /**
   * The execution ID of the suspended workflow to resume
   */
  executionId: string;
  /**
   * The checkpoint data from the suspension
   */
  checkpoint?: {
    stepExecutionState?: DangerouslyAllowAny;
    completedStepsData?: DangerouslyAllowAny[];
  };
  /**
   * The step index to resume from
   */
  resumeStepIndex: number;
  /**
   * The last event sequence number before suspension
   */
  lastEventSequence?: number;
  /**
   * Data to pass to the resumed step (validated against resumeSchema)
   */
  resumeData?: DangerouslyAllowAny;
}

/**
 * Hooks for the workflow
 * @param DATA - The type of the data
 * @param RESULT - The type of the result
 */
export type WorkflowHookStatus = "completed" | "suspended" | "cancelled" | "error";

export type WorkflowStepStatus =
  | "running"
  | "success"
  | "error"
  | "suspended"
  | "cancelled"
  | "skipped";

export type WorkflowStepData = {
  input: DangerouslyAllowAny;
  output?: DangerouslyAllowAny;
  status: WorkflowStepStatus;
  error?: Error | null;
};

export type WorkflowHookContext<DATA, RESULT> = {
  /**
   * Terminal status for the workflow execution
   */
  status: WorkflowHookStatus;
  /**
   * The current workflow state
   */
  state: WorkflowState<DATA, RESULT>;
  /**
   * Result of the workflow execution, if available
   */
  result: RESULT | null;
  /**
   * Error from the workflow execution, if any
   */
  error: unknown | null;
  /**
   * Suspension metadata when status is suspended
   */
  suspension?: WorkflowSuspensionMetadata;
  /**
   * Cancellation metadata when status is cancelled
   */
  cancellation?: WorkflowCancellationMetadata;
  /**
   * Step input/output snapshots keyed by step ID
   */
  steps: Record<string, WorkflowStepData>;
};

export type WorkflowHooks<DATA, RESULT> = {
  /**
   * Called when the workflow starts
   * @param state - The current state of the workflow
   * @returns void
   */
  onStart?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
  /**
   * Called when a step starts
   * @param state - The current state of the workflow
   * @returns void
   */
  onStepStart?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
  /**
   * Called when a step ends
   * @param state - The current state of the workflow
   * @returns void
   */
  onStepEnd?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
  /**
   * Called when the workflow is suspended
   * @param context - The terminal hook context
   * @returns void
   */
  onSuspend?: (context: WorkflowHookContext<DATA, RESULT>) => Promise<void>;
  /**
   * Called when the workflow ends with an error
   * @param context - The terminal hook context
   * @returns void
   */
  onError?: (context: WorkflowHookContext<DATA, RESULT>) => Promise<void>;
  /**
   * Called when the workflow reaches a terminal state
   * @param context - The terminal hook context
   * @returns void
   */
  onFinish?: (context: WorkflowHookContext<DATA, RESULT>) => Promise<void>;
  /**
   * Called when the workflow ends (completed, cancelled, or error)
   * @param state - The current state of the workflow
   * @param context - The terminal hook context
   * @returns void
   */
  onEnd?: (
    state: WorkflowState<DATA, RESULT>,
    context?: WorkflowHookContext<DATA, RESULT>,
  ) => Promise<void>;
};

export type WorkflowInput<INPUT_SCHEMA extends InternalBaseWorkflowInputSchema> =
  TF.IsUnknown<INPUT_SCHEMA> extends true
    ? BaseMessage | BaseMessage[] | UIMessage | UIMessage[] | string
    : INPUT_SCHEMA extends z.ZodTypeAny
      ? z.infer<INPUT_SCHEMA>
      : undefined;

export type WorkflowResult<RESULT_SCHEMA extends z.ZodTypeAny> = RESULT_SCHEMA extends z.ZodTypeAny
  ? z.infer<RESULT_SCHEMA>
  : RESULT_SCHEMA;

export type WorkflowConfig<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  SUSPEND_SCHEMA extends z.ZodTypeAny = z.ZodAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
> = {
  /**
   * Unique identifier for the workflow
   */
  id: string;
  /**
   * Human-readable name for the workflow
   */
  name: string;
  /**
   * Description of what the workflow does
   */
  purpose?: string;
  /**
   * Schema for the input data
   */
  input?: INPUT_SCHEMA;
  /**
   * Schema for the result data
   */
  result: RESULT_SCHEMA;
  /**
   * Schema for data passed when suspending (optional)
   */
  suspendSchema?: SUSPEND_SCHEMA;
  /**
   * Schema for data passed when resuming (optional)
   */
  resumeSchema?: RESUME_SCHEMA;
  /**
   * Hooks for the workflow
   */
  hooks?: WorkflowHooks<WorkflowInput<INPUT_SCHEMA>, WorkflowResult<RESULT_SCHEMA>>;
  /**
   * Memory V2 for workflow state persistence
   * Stores suspension/checkpoint data
   */
  memory?: Memory;
  /**
   * Logger instance to use for this workflow
   * If not provided, will use the global logger or create a default one
   */
  logger?: Logger;
  /**
   * Observability instance for OpenTelemetry integration
   * If not provided, will use global observability or create a default one
   */
  observability?: VoltAgentObservability;
  /**
   * Input guardrails to run before workflow execution
   */
  inputGuardrails?: InputGuardrail[];
  /**
   * Output guardrails to run after workflow execution
   */
  outputGuardrails?: OutputGuardrail<any>[];
  /**
   * Optional agent instance to supply to workflow guardrails
   */
  guardrailAgent?: Agent;
  /**
   * Default retry configuration for steps in this workflow
   */
  retryConfig?: WorkflowRetryConfig;
};

/**
 * A workflow instance that can be executed
 */
export type Workflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  SUSPEND_SCHEMA extends z.ZodTypeAny = z.ZodAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
> = {
  /**
   * Unique identifier for the workflow
   */
  id: string;
  /**
   * Human-readable name for the workflow
   */
  name: string;
  /**
   * Description of what the workflow does
   * @default "No purpose provided"
   */
  purpose: string;
  /**
   * Array of steps to execute in order
   */
  steps: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, DangerouslyAllowAny, DangerouslyAllowAny>[];
  /**
   * Input schema for the workflow (for API access)
   */
  inputSchema?: INPUT_SCHEMA;
  /**
   * Result schema for the workflow (for API access)
   */
  resultSchema?: RESULT_SCHEMA;
  /**
   * Suspend schema for the workflow (for API access)
   */
  suspendSchema?: SUSPEND_SCHEMA;
  /**
   * Resume schema for the workflow (for API access)
   */
  resumeSchema?: RESUME_SCHEMA;
  /**
   * Memory V2 for this workflow (always created with default if not provided)
   */
  memory: Memory;
  /**
   * Observability instance for OpenTelemetry integration
   */
  observability?: VoltAgentObservability;
  /**
   * Input guardrails configured for this workflow
   */
  inputGuardrails?: InputGuardrail[];
  /**
   * Output guardrails configured for this workflow
   */
  outputGuardrails?: OutputGuardrail<any>[];
  /**
   * Optional agent instance supplied to workflow guardrails
   */
  guardrailAgent?: Agent;
  /**
   * Default retry configuration for steps in this workflow
   */
  retryConfig?: WorkflowRetryConfig;
  /**
   * Get the full state of the workflow including all steps
   * @returns The serialized workflow state
   */
  getFullState: () => {
    id: string;
    name: string;
    purpose: string;
    stepsCount: number;
    steps: DangerouslyAllowAny[];
    inputSchema?: DangerouslyAllowAny;
    resultSchema?: DangerouslyAllowAny;
    suspendSchema?: DangerouslyAllowAny;
    resumeSchema?: DangerouslyAllowAny;
    retryConfig?: WorkflowRetryConfig;
    guardrails?: {
      inputCount: number;
      outputCount: number;
    };
  };
  /**
   * Execute the workflow with the given input
   * @param input - The input to the workflow
   * @param options - Options for the workflow execution
   * @returns Execution result with final result
   */
  run: (
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
  ) => Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
  /**
   * Execute the workflow with streaming support
   * @param input - The input to the workflow
   * @param options - Options for the workflow execution
   * @returns Stream result with real-time events and promise-based fields
   */
  stream: (
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
  ) => WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA>;
  /**
   * Create a WorkflowSuspendController that can be used to suspend the workflow
   * @returns A WorkflowSuspendController instance
   */
  createSuspendController?: () => WorkflowSuspendController;
};

// ===================================
// WORKFLOW PERSISTENCE TYPES
// ===================================

/**
 * Base workflow history entry - common fields for all use cases
 */
export interface BaseWorkflowHistoryEntry {
  id: string;
  workflowId: string; // Workflow definition ID
  status: "running" | "completed" | "error" | "cancelled";
  startTime: Date;
  endTime?: Date;
  input: unknown;
  output?: unknown;
}

/**
 * Base workflow step history entry - common fields for all use cases
 */
export interface BaseWorkflowStepHistoryEntry {
  stepIndex: number;
  stepType:
    | "agent"
    | "func"
    | "conditional-when"
    | "parallel-all"
    | "parallel-race"
    | "tap"
    | "workflow"
    | "guardrail"
    | "sleep"
    | "sleep-until"
    | "foreach"
    | "loop"
    | "branch"
    | "map";
  stepName: string;
  status: "pending" | "running" | "completed" | "error" | "skipped"; // includes all possible statuses
  startTime?: Date; // optional since pending steps might not have started
  endTime?: Date;
  input?: unknown;
  output?: unknown;
  agentExecutionId?: string; // Link to agent_history.id if step executes an agent
  parallelIndex?: number; // For parallel steps
}

export interface WorkflowHistoryEntry extends BaseWorkflowHistoryEntry {
  workflowName: string;
  steps: WorkflowStepHistoryEntry[];
  events: WorkflowTimelineEvent[];
  userId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Used consistently across memory storage and runtime
 */
export interface WorkflowStepHistoryEntry extends BaseWorkflowStepHistoryEntry {
  // Unique identifiers
  id: string;
  stepId?: string;

  workflowHistoryId: string;

  startTime: Date;

  error?: unknown;

  parallelIndex?: number;
  parallelParentStepId?: string;

  agentExecutionId?: string;

  metadata?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Workflow timeline event - represents events during workflow execution
 */
export interface WorkflowTimelineEvent {
  id: string;
  workflowHistoryId: string;
  eventId: string;
  name: string;
  type: "workflow" | "workflow-step";
  startTime: string;
  endTime?: string;
  status: string;
  level?: string;
  input?: unknown;
  output?: unknown;
  statusMessage?: unknown;
  metadata?: Record<string, unknown>;
  traceId?: string;
  parentEventId?: string;
  eventSequence?: number;
  createdAt: Date;
}

/**
 * Workflow statistics for reporting
 */
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
}

/**
 * Event emitted during workflow streaming
 */
export type WorkflowStreamEventType =
  | "workflow-start"
  | "workflow-suspended"
  | "workflow-complete"
  | "workflow-cancelled"
  | "workflow-error"
  | "step-start"
  | "step-complete"
  | (string & {});

export interface WorkflowStreamEvent {
  /**
   * Type of the event (e.g., "step-start", "step-complete", "custom", "agent-stream")
   */
  type: WorkflowStreamEventType;
  /**
   * Unique execution ID for this workflow run
   */
  executionId: string;
  /**
   * Source of the event (step ID or name)
   */
  from: string;
  /**
   * Input data for the step/event
   */
  input?: DangerouslyAllowAny;
  /**
   * Output data from the step/event
   */
  output?: DangerouslyAllowAny;
  /**
   * Current status of the step/event
   */
  status: "pending" | "running" | "success" | "skipped" | "error" | "suspended" | "cancelled";
  /**
   * User context passed through the workflow
   */
  context?: UserContext;
  /**
   * Timestamp of the event
   */
  timestamp: string;
  /**
   * Current step index in the workflow
   */
  stepIndex?: number;
  /**
   * Step type for step events
   */
  stepType?:
    | "agent"
    | "func"
    | "conditional-when"
    | "parallel-all"
    | "parallel-race"
    | "tap"
    | "workflow"
    | "guardrail"
    | "sleep"
    | "sleep-until"
    | "foreach"
    | "loop"
    | "branch"
    | "map";
  /**
   * Additional metadata
   */
  metadata?: Record<string, DangerouslyAllowAny>;
  /**
   * Error information if status is "error"
   */
  error?: DangerouslyAllowAny;
}

/**
 * Writer interface for emitting stream events from workflow steps
 */
export interface WorkflowStreamWriter {
  /**
   * Write a custom event to the stream
   */
  write(
    event: Omit<Partial<WorkflowStreamEvent>, "type"> & { type: WorkflowStreamEventType },
  ): void;

  /**
   * Pipe events from an agent's fullStream to the workflow stream
   * @param fullStream - The agent's fullStream async iterable
   * @param options - Optional configuration for piping
   */
  pipeFrom(
    fullStream: AsyncIterable<DangerouslyAllowAny>,
    options?: {
      prefix?: string; // Event type prefix (e.g., "agent-")
      agentId?: string; // Agent ID to include in metadata
      filter?: (part: DangerouslyAllowAny) => boolean; // Optional filter
    },
  ): Promise<void>;
}

/**
 * Response returned from workflow.stream() method
 */
export interface WorkflowStreamResponse<RESULT_SCHEMA extends z.ZodTypeAny> {
  /**
   * Async iterator for stream events
   */
  stream: AsyncIterableIterator<WorkflowStreamEvent>;
  /**
   * Promise that resolves with the final result
   */
  result: Promise<z.infer<RESULT_SCHEMA> | null>;
  /**
   * Workflow execution ID
   */
  executionId: string;
  /**
   * Workflow ID
   */
  workflowId: string;
  /**
   * Abort the stream
   */
  abort: () => void;
}

/**
 * Options for creating workflow execution
 */
export interface CreateWorkflowExecutionOptions {
  userId?: string;
  conversationId?: string;
  context?: UserContext;
  metadata?: Record<string, unknown>;
  executionId?: string;
}

/**
 * Options for recording workflow step
 */
export interface RecordWorkflowStepOptions {
  stepId?: string;
  parallelIndex?: number;
  parentStepId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for updating workflow step
 */
export interface UpdateWorkflowStepOptions {
  status?: "completed" | "error" | "skipped";
  output?: unknown;
  errorMessage?: string;
  agentExecutionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * The state parameter passed to workflow steps
 */
export type WorkflowStepState<INPUT> = Omit<
  WorkflowState<INPUT, DangerouslyAllowAny>,
  "data" | "result"
> & {
  /** Workflow execution context for event tracking */
  workflowContext?: WorkflowExecutionContext;
  /** AbortSignal for checking suspension during step execution */
  signal?: AbortSignal;
};

/**
 * Workflow memory storage interface - provides abstraction for different storage backends
 */
