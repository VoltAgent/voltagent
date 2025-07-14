import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type * as TF from "type-fest";
import type { z } from "zod";
import type { BaseMessage } from "../agent/providers";
import type { UserContext } from "../agent/types";
import type { WorkflowState } from "./internal/state";
import type { InternalBaseWorkflowInputSchema } from "./internal/types";
import type { WorkflowStep } from "./steps";

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
   * Hooks for the workflow
   */
  hooks?: WorkflowHooks<WorkflowInput<INPUT_SCHEMA>, WorkflowResult<RESULT_SCHEMA>>;
};

/**
 * A workflow instance that can be executed
 */
export type Workflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
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
   * Execute the workflow with the given input
   * @param input - The input to the workflow
   * @returns The result of the workflow
   */
  run: (
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
  ) => Promise<{
    executionId: string;
    startAt: Date;
    endAt: Date;
    status: "completed";
    result: z.infer<RESULT_SCHEMA>;
  }>;
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
export interface WorkflowMemory {
  // Workflow History Operations
  storeWorkflowHistory(entry: WorkflowHistoryEntry): Promise<void>;
  getWorkflowHistory(id: string): Promise<WorkflowHistoryEntry | null>;
  getWorkflowHistoryByWorkflowId(workflowId: string): Promise<WorkflowHistoryEntry[]>;
  updateWorkflowHistory(id: string, updates: Partial<WorkflowHistoryEntry>): Promise<void>;
  deleteWorkflowHistory(id: string): Promise<void>;

  // Workflow Steps Operations
  storeWorkflowStep(step: WorkflowStepHistoryEntry): Promise<void>;
  getWorkflowStep(id: string): Promise<WorkflowStepHistoryEntry | null>;
  getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]>;
  updateWorkflowStep(id: string, updates: Partial<WorkflowStepHistoryEntry>): Promise<void>;
  deleteWorkflowStep(id: string): Promise<void>;

  // Workflow Timeline Events Operations
  storeWorkflowTimelineEvent(event: WorkflowTimelineEvent): Promise<void>;
  getWorkflowTimelineEvent(id: string): Promise<WorkflowTimelineEvent | null>;
  getWorkflowTimelineEvents(workflowHistoryId: string): Promise<WorkflowTimelineEvent[]>;
  deleteWorkflowTimelineEvent(id: string): Promise<void>;

  // Query Operations
  getAllWorkflowIds(): Promise<string[]>;
  getWorkflowStats(workflowId: string): Promise<WorkflowStats>;

  // Bulk Operations
  getWorkflowHistoryWithStepsAndEvents(id: string): Promise<WorkflowHistoryEntry | null>;
  deleteWorkflowHistoryWithRelated(id: string): Promise<void>;

  // Cleanup Operations
  cleanupOldWorkflowHistories(workflowId: string, maxEntries: number): Promise<number>;
}
