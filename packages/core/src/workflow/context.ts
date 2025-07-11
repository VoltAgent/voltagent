import type { NewTimelineEvent } from "../events/types";

/**
 * Workflow execution history entry
 */
export interface WorkflowHistoryEntry {
  id: string; // execution ID
  workflowId: string;
  workflowName: string;
  status: "running" | "completed" | "error" | "cancelled";
  startTime: Date;
  endTime?: Date;
  input: unknown;
  output?: unknown;
  steps: WorkflowStepHistoryEntry[];
  events: NewTimelineEvent[];
  userId?: string;
  conversationId?: string;
}

/**
 * Individual workflow step history entry
 */
export interface WorkflowStepHistoryEntry {
  stepId: string;
  stepIndex: number;
  stepType: "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race";
  stepName: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  startTime?: Date;
  endTime?: Date;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  // Agent step için
  agentExecutionId?: string;
  // Parallel step için
  parallelIndex?: number;
  parallelParentStepId?: string;
  // ✅ UNIFIED: Indicates if step was skipped (replaces conditionMet)
  isSkipped?: boolean;
}

/**
 * Workflow execution context for state management
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  workflowName: string;
  userContext: Map<string, unknown>;
  isActive: boolean;
  startTime: Date;
  currentStepIndex: number;
  steps: WorkflowStepHistoryEntry[];
  signal?: AbortSignal;
  historyEntry?: WorkflowHistoryEntry;
}

/**
 * Workflow step context for individual step tracking
 */
export interface WorkflowStepContext {
  stepId: string;
  stepIndex: number;
  stepType: "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race";
  stepName: string;
  workflowId: string;
  executionId: string;
  parentStepId?: string;
  parallelIndex?: number;
  startTime: Date;
}
