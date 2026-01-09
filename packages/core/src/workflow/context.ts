import type { Span } from "@opentelemetry/api";
import type { Logger } from "@voltagent/internal";
import type { Agent } from "../agent/agent";
import type { Memory } from "../memory";
import type { WorkflowTraceContext } from "./open-telemetry/trace-context";
import type { WorkflowStepData, WorkflowStreamWriter } from "./types";

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
  context: Map<string | symbol, unknown>;
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
   * Memory storage instance for this workflow execution
   * Can be workflow-specific or global
   */
  memory?: Memory;
  /**
   * Map of executed step data (input and output) by step ID
   * Used for accessing previous step results
   */
  stepData: Map<string, WorkflowStepData>;
  /**
   * Current event sequence number for this workflow execution
   * Used to maintain event ordering even after server restarts
   */
  eventSequence: number;
  /**
   * Logger instance for this workflow execution
   * Provides execution-scoped logging with full context (userId, conversationId, executionId)
   */
  logger: Logger;
  /**
   * Stream writer for emitting events during streaming execution
   * Always available - uses NoOpWorkflowStreamWriter when not streaming
   */
  streamWriter: WorkflowStreamWriter;
  /**
   * OpenTelemetry trace context for observability
   * Manages span hierarchy and attributes for the workflow execution
   */
  traceContext?: WorkflowTraceContext;
  /**
   * Optional agent instance supplied to workflow guardrails
   */
  guardrailAgent?: Agent;

  /**
   * Current step span for passing to agents called within workflow steps
   * This enables agent spans to appear as children of workflow step spans
   */
  currentStepSpan?: Span;
}

/**
 * Workflow step context for individual step tracking
 */
export interface WorkflowStepContext {
  stepId: string;
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
  workflowId: string;
  executionId: string;
  parentStepId?: string;
  parallelIndex?: number;
  startTime: Date;
}
