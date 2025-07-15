import { WorkflowEventEmitter } from "../events/workflow-emitter";
import type {
  WorkflowStartEvent,
  WorkflowSuccessEvent,
  WorkflowErrorEvent,
  WorkflowStepStartEvent,
  WorkflowStepSuccessEvent,
  WorkflowStepErrorEvent,
  WorkflowEventMetadata,
  WorkflowStepEventMetadata,
} from "../events/types";
import { createWorkflowStepNodeId, type WorkflowStepType } from "../utils/node-utils";
import type { WorkflowExecutionContext, WorkflowStepContext } from "./context";

/**
 * Global sequence counter for workflow events to ensure proper ordering
 * This counter is incremented for each event to guarantee sequential ordering
 */
let globalEventSequence = 0;

/**
 * Get next sequence number for event ordering
 */
function getNextEventSequence(): number {
  return ++globalEventSequence;
}

/**
 * Create a workflow start event
 */
export function createWorkflowStartEvent(
  workflowContext: WorkflowExecutionContext,
  input: unknown,
): WorkflowStartEvent {
  // ✅ Convert userContext Map to object for serialization
  const userContextObject = workflowContext.userContext
    ? Object.fromEntries(workflowContext.userContext)
    : undefined;

  const metadata: WorkflowEventMetadata = {
    id: workflowContext.executionId,
    workflowId: workflowContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: workflowContext.executionId,
    currentStep: 0,
    totalSteps: workflowContext.steps.length,
    displayName: `Workflow: ${workflowContext.workflowName}`,
    eventSequence: getNextEventSequence(),
    userContext: userContextObject,
  };

  return {
    id: crypto.randomUUID(),
    name: "workflow:start",
    type: "workflow",
    startTime: workflowContext.startTime.toISOString(),
    status: "running",
    input: { input },
    output: null,
    metadata,
    traceId: workflowContext.executionId,
  };
}

/**
 * Create a workflow success event
 */
export function createWorkflowSuccessEvent(
  workflowContext: WorkflowExecutionContext,
  result: unknown,
  parentEventId?: string,
): WorkflowSuccessEvent {
  const completionTime = new Date().toISOString();

  // ✅ Convert userContext Map to object for serialization
  const userContextObject = workflowContext.userContext
    ? Object.fromEntries(workflowContext.userContext)
    : undefined;

  const metadata: WorkflowEventMetadata = {
    id: workflowContext.executionId,
    workflowId: workflowContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: workflowContext.executionId,
    currentStep: workflowContext.currentStepIndex,
    totalSteps: workflowContext.steps.length,
    displayName: `Workflow: ${workflowContext.workflowName}`,
    eventSequence: getNextEventSequence(),
    userContext: userContextObject,
  };

  return {
    id: crypto.randomUUID(),
    name: "workflow:success",
    type: "workflow",
    startTime: completionTime, // ✅ FIXED: Success event occurs at completion time
    endTime: completionTime, // ✅ Same time for instantaneous completion event
    status: "completed",
    level: "INFO",
    input: null,
    output: result as Record<string, unknown> | null,
    metadata,
    traceId: workflowContext.executionId,
    parentEventId,
  };
}

/**
 * Create a workflow error event
 */
export function createWorkflowErrorEvent(
  workflowContext: WorkflowExecutionContext,
  error: unknown,
  parentEventId?: string,
): WorkflowErrorEvent {
  const errorTime = new Date().toISOString();

  // ✅ Convert userContext Map to object for serialization
  const userContextObject = workflowContext.userContext
    ? Object.fromEntries(workflowContext.userContext)
    : undefined;

  const metadata: WorkflowEventMetadata = {
    id: workflowContext.executionId,
    workflowId: workflowContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: workflowContext.executionId,
    currentStep: workflowContext.currentStepIndex,
    totalSteps: workflowContext.steps.length,
    displayName: `Workflow: ${workflowContext.workflowName}`,
    eventSequence: getNextEventSequence(),
    userContext: userContextObject,
  };

  const errorMessage = error instanceof Error ? error.message : "Unknown workflow error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  return {
    id: crypto.randomUUID(),
    name: "workflow:error",
    type: "workflow",
    startTime: errorTime,
    endTime: errorTime,
    status: "error",
    level: "ERROR",
    input: null,
    output: null,
    statusMessage: {
      message: errorMessage,
      stack: errorStack,
    },
    metadata,
    traceId: workflowContext.executionId,
    parentEventId,
  };
}

/**
 * Create a workflow step start event
 */
export function createWorkflowStepStartEvent(
  stepContext: WorkflowStepContext,
  workflowContext: WorkflowExecutionContext,
  input: unknown, // ✅ ADD: Input parameter
  options: {
    agentId?: string;
    agentName?: string;
    parallelIndex?: number;
    parallelParentEventId?: string;
    stepFunction?: string;
    taskString?: string;
    userContext?: Map<string | symbol, unknown>;
  } = {},
): WorkflowStepStartEvent {
  // ✅ Generate consistent node_id for React Flow mapping
  const nodeId = createWorkflowStepNodeId(
    stepContext.stepType as WorkflowStepType,
    stepContext.stepIndex,
    stepContext.workflowId,
    {
      agentId: options.agentId,
      parallelIndex: options.parallelIndex,
      stepName: stepContext.stepName,
      stepId: stepContext.stepId,
    },
  );

  // ✅ Convert userContext Map to object for serialization
  const userContextObject = options.userContext
    ? Object.fromEntries(options.userContext)
    : undefined;

  const metadata: WorkflowStepEventMetadata = {
    id: nodeId,
    workflowId: stepContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: stepContext.executionId,
    stepIndex: stepContext.stepIndex,
    stepType: stepContext.stepType,
    stepName: stepContext.stepName,
    displayName: `Step ${stepContext.stepIndex + 1}: ${stepContext.stepName}`,
    agentId: options.agentId,
    agentName: options.agentName,
    parallelIndex: options.parallelIndex,
    parallelParentEventId: options.parallelParentEventId,
    eventSequence: getNextEventSequence(),
    stepFunction: options.stepFunction,
    taskString: options.taskString,
    userContext: userContextObject,
  };

  return {
    id: crypto.randomUUID(),
    name: "workflow-step:start",
    type: "workflow-step",
    startTime: stepContext.startTime.toISOString(),
    status: "running",
    input: { input }, // ✅ NOW: Store input data
    output: null,
    metadata,
    traceId: workflowContext.executionId,
    parentEventId: options.parallelParentEventId,
  };
}

/**
 * Create a workflow step success event
 */
export function createWorkflowStepSuccessEvent(
  stepContext: WorkflowStepContext,
  workflowContext: WorkflowExecutionContext,
  result: unknown,
  parentEventId?: string,
  options: {
    completedSteps?: number;
    agentId?: string;
    agentName?: string;
    parallelIndex?: number;
    isSkipped?: boolean;
    stepFunction?: string;
    taskString?: string;
    userContext?: Map<string | symbol, unknown>;
  } = {},
): WorkflowStepSuccessEvent {
  // ✅ Generate consistent node_id for React Flow mapping
  const nodeId = createWorkflowStepNodeId(
    stepContext.stepType as WorkflowStepType,
    stepContext.stepIndex,
    stepContext.workflowId,
    {
      agentId: options.agentId,
      parallelIndex: options.parallelIndex,
      stepName: stepContext.stepName,
      stepId: stepContext.stepId,
    },
  );

  // ✅ Convert userContext Map to object for serialization
  const userContextObject = options.userContext
    ? Object.fromEntries(options.userContext)
    : undefined;

  const metadata: WorkflowStepEventMetadata = {
    id: nodeId,
    workflowId: stepContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: stepContext.executionId,
    stepIndex: stepContext.stepIndex,
    stepType: stepContext.stepType,
    stepName: stepContext.stepName,
    displayName: `Step ${stepContext.stepIndex + 1}: ${stepContext.stepName}`,
    agentId: options.agentId,
    agentName: options.agentName,
    parallelIndex: options.parallelIndex,
    isSkipped: options.isSkipped,
    eventSequence: getNextEventSequence(),
    stepFunction: options.stepFunction,
    taskString: options.taskString,
    userContext: userContextObject,
  };

  return {
    id: crypto.randomUUID(),
    name: "workflow-step:success",
    type: "workflow-step",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    status: "completed",
    input: null,
    output: { result },
    metadata,
    traceId: workflowContext.executionId,
    parentEventId,
  };
}

/**
 * Create a workflow step error event
 */
export function createWorkflowStepErrorEvent(
  stepContext: WorkflowStepContext,
  workflowContext: WorkflowExecutionContext,
  error: unknown,
  parentEventId?: string,
  options: {
    agentId?: string;
    agentName?: string;
    parallelIndex?: number;
    stepFunction?: string;
    taskString?: string;
    userContext?: Map<string | symbol, unknown>;
  } = {},
): WorkflowStepErrorEvent {
  // ✅ Generate consistent node_id for React Flow mapping
  const nodeId = createWorkflowStepNodeId(
    stepContext.stepType as WorkflowStepType,
    stepContext.stepIndex,
    stepContext.workflowId,
    {
      agentId: options.agentId,
      parallelIndex: options.parallelIndex,
      stepName: stepContext.stepName,
      stepId: stepContext.stepId,
    },
  );

  // ✅ Convert userContext Map to object for serialization
  const userContextObject = options.userContext
    ? Object.fromEntries(options.userContext)
    : undefined;

  const metadata: WorkflowStepEventMetadata = {
    id: nodeId,
    workflowId: stepContext.workflowId,
    workflowName: workflowContext.workflowName,
    executionId: stepContext.executionId,
    stepIndex: stepContext.stepIndex,
    stepType: stepContext.stepType,
    stepName: stepContext.stepName,
    displayName: `Step ${stepContext.stepIndex + 1}: ${stepContext.stepName}`,
    agentId: options.agentId,
    agentName: options.agentName,
    parallelIndex: options.parallelIndex,
    eventSequence: getNextEventSequence(),
    stepFunction: options.stepFunction,
    taskString: options.taskString,
    userContext: userContextObject,
  };

  const errorMessage = error instanceof Error ? error.message : "Unknown step error";

  return {
    id: crypto.randomUUID(),
    name: "workflow-step:error",
    type: "workflow-step",
    startTime: stepContext.startTime.toISOString(),
    endTime: new Date().toISOString(),
    status: "error",
    level: "ERROR",
    input: null,
    output: null,
    statusMessage: {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    },
    metadata,
    traceId: workflowContext.executionId,
    parentEventId,
  };
}

/**
 * Create a step context for workflow step tracking
 */
export function createStepContext(
  workflowContext: WorkflowExecutionContext,
  stepType: "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race",
  stepName: string,
  options: {
    parentStepId?: string;
    parallelIndex?: number;
    useParentStepType?: boolean; // ✅ NEW: Option to use parent step type
  } = {},
): WorkflowStepContext {
  // ✅ Check if we're inside a parallel step with currentStepContext
  const extendedWorkflowContext = workflowContext as WorkflowExecutionContext & {
    currentStepContext?: WorkflowStepContext;
    parentStepType?: string; // ✅ NEW: Track parent step type for nested execution
  };

  // If we have a currentStepContext (parallel sub-step), use its values
  if (extendedWorkflowContext.currentStepContext) {
    return {
      stepId: crypto.randomUUID(),
      stepIndex: extendedWorkflowContext.currentStepContext.stepIndex, // ✅ Use unique sub-step index
      stepType,
      stepName,
      workflowId: workflowContext.workflowId,
      executionId: workflowContext.executionId,
      parentStepId: extendedWorkflowContext.currentStepContext.stepId,
      parallelIndex: extendedWorkflowContext.currentStepContext.parallelIndex,
      startTime: new Date(),
    };
  }

  // ✅ NEW: If we're inside a nested execution (like conditional step),
  // use parent step type for consistent frontend mapping
  if (options.useParentStepType && extendedWorkflowContext.parentStepType) {
    return {
      stepId: crypto.randomUUID(),
      stepIndex: workflowContext.currentStepIndex,
      stepType: extendedWorkflowContext.parentStepType as any, // ✅ Use parent step type
      stepName,
      workflowId: workflowContext.workflowId,
      executionId: workflowContext.executionId,
      parentStepId: options.parentStepId,
      parallelIndex: options.parallelIndex,
      startTime: new Date(),
    };
  }

  // Default behavior for non-parallel steps
  return {
    stepId: crypto.randomUUID(),
    stepIndex: workflowContext.currentStepIndex,
    stepType,
    stepName,
    workflowId: workflowContext.workflowId,
    executionId: workflowContext.executionId,
    parentStepId: options.parentStepId,
    parallelIndex: options.parallelIndex,
    startTime: new Date(),
  };
}

/**
 * Create a parallel sub-step context
 */
export function createParallelSubStepContext(
  parentStepContext: WorkflowStepContext,
  parallelIndex: number,
): WorkflowStepContext {
  // ✅ Calculate unique global step index for sub-step
  // Formula: parent_stepIndex * 1000 + parallelIndex
  // This ensures uniqueness while maintaining relationship
  const uniqueStepIndex = parentStepContext.stepIndex * 1000 + parallelIndex;

  return {
    stepId: crypto.randomUUID(),
    stepIndex: uniqueStepIndex, // ✅ NOW UNIQUE: Each sub-step gets unique global index
    stepType: "func", // Default for parallel sub-steps
    stepName: `${parentStepContext.stepName} [${parallelIndex}]`,
    workflowId: parentStepContext.workflowId,
    executionId: parentStepContext.executionId,
    parentStepId: parentStepContext.stepId,
    parallelIndex,
    startTime: new Date(),
  };
}

/**
 * Publish a workflow event to the event emitter
 */
export async function publishWorkflowEvent(
  event:
    | WorkflowStartEvent
    | WorkflowSuccessEvent
    | WorkflowErrorEvent
    | WorkflowStepStartEvent
    | WorkflowStepSuccessEvent
    | WorkflowStepErrorEvent,
  workflowContext: WorkflowExecutionContext,
): Promise<void> {
  try {
    WorkflowEventEmitter.getInstance().publishWorkflowEventAsync({
      workflowId: workflowContext.workflowId,
      executionId: workflowContext.executionId,
      event,
    });
  } catch (error) {
    console.warn("Failed to publish workflow event:", error);
    // Don't throw error to avoid breaking workflow execution
  }
}
