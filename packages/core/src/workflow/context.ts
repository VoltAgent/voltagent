import type { WorkflowRuntimeHistoryEntry, WorkflowRuntimeStepHistoryEntry } from "./types";

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
  steps: WorkflowRuntimeStepHistoryEntry[];
  signal?: AbortSignal;
  historyEntry?: WorkflowRuntimeHistoryEntry;
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

// Re-export the unified types for backward compatibility
export type { WorkflowRuntimeHistoryEntry as WorkflowHistoryEntry };
export type { WorkflowRuntimeStepHistoryEntry as WorkflowStepHistoryEntry };
