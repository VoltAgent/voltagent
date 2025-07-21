import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type * as TF from "type-fest";
import { z } from "zod";
import type { BaseMessage } from "../agent/providers";
import type { UserContext } from "../agent/types";
import type { WorkflowState } from "./internal/state";
import type { InternalBaseWorkflowInputSchema } from "./internal/types";
import type { WorkflowStep } from "./steps";
import type { Memory } from "../memory";
import type { Logger } from "@voltagent/logger";

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
   * Check if the workflow has been suspended
   */
  isSuspended: () => boolean;
  /**
   * Get the suspension reason
   */
  getReason: () => string | undefined;
}

/**
 * Result returned from workflow execution with suspend/resume capabilities
 */
export interface WorkflowExecutionResult<
  RESULT_SCHEMA extends z.ZodTypeAny,
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
  endAt: Date;
  /**
   * Current status of the workflow execution
   */
  status: "completed" | "suspended" | "error";
  /**
   * The result data if workflow completed successfully
   */
  result: z.infer<RESULT_SCHEMA> | null;
  /**
   * Suspension metadata if workflow was suspended
   */
  suspension?: WorkflowSuspensionMetadata;
  /**
   * Error information if workflow failed
   */
  error?: unknown;
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
  userContext?: UserContext;
  /**
   * Override workflow memory storage for this specific execution
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
   * Called when the workflow ends
   * @param state - The current state of the workflow
   * @returns void
   */
  onEnd?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
};

export type WorkflowInput<INPUT_SCHEMA extends InternalBaseWorkflowInputSchema> =
  TF.IsUnknown<INPUT_SCHEMA> extends true
    ? BaseMessage | BaseMessage[] | string
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
   * Memory storage for this workflow
   * Overrides global workflow memory from VoltAgent
   */
  memory?: Memory;
  /**
   * Logger instance to use for this workflow
   * If not provided, will use the global logger or create a default one
   */
  logger?: Logger;
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
   * Suspend schema for the workflow (for API access)
   */
  suspendSchema?: SUSPEND_SCHEMA;
  /**
   * Resume schema for the workflow (for API access)
   */
  resumeSchema?: RESUME_SCHEMA;
  /**
   * Memory storage for this workflow (exposed for registry access)
   */
  memory?: Memory;
  /**
   * Execute the workflow with the given input
   * @param input - The input to the workflow
   * @returns The result of the workflow
   */
  run: (
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
  ) => Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
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
  stepType: "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race";
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
 * Options for creating workflow execution
 */
export interface CreateWorkflowExecutionOptions {
  userId?: string;
  conversationId?: string;
  userContext?: UserContext;
  metadata?: Record<string, unknown>;
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
 * Workflow memory storage interface - provides abstraction for different storage backends
 */
