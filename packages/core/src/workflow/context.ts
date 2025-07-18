import type { Memory } from "../memory";
import type { WorkflowHistoryEntry, WorkflowStepHistoryEntry } from "./types";

/**
 * Context information for a workflow execution
 * Contains all the runtime information about a workflow execution
 */
export interface WorkflowExecutionContext {
  /**
   * Unique identifier for the workflow definition
   */
  workflowId: string;
  /**
   * Unique identifier for this specific execution
   */
  executionId: string;
  /**
   * Human-readable name of the workflow
   */
  workflowName: string;
  /**
   * User-defined context passed around during execution
   */
  userContext: Map<string | symbol, unknown>;
  /**
   * Whether the workflow is still actively running
   */
  isActive: boolean;
  /**
   * When the workflow execution started
   */
  startTime: Date;
  /**
   * Current step index being executed
   */
  currentStepIndex: number;
  /**
   * Array of completed steps (for tracking)
   */
  steps: any[]; // TODO: Type this properly
  /**
   * AbortSignal for cancelling the workflow
   */
  signal?: AbortSignal;
  /**
   * History entry for this execution (if available)
   */
  historyEntry?: WorkflowHistoryEntry;
  /**
   * Memory storage instance for this workflow execution
   * Can be workflow-specific or global
   */
  memory?: Memory;
  /**
   * Map of executed step data (input and output) by step ID
   * Used for accessing previous step results
   */
  stepData: Map<string, { input: any; output: any }>;
  /**
   * Current event sequence number for this workflow execution
   * Used to maintain event ordering even after server restarts
   */
  eventSequence: number;
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
