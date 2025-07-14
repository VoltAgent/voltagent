import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "./types";

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

export type { WorkflowHistoryEntry };
export type { WorkflowStepHistoryEntry };
