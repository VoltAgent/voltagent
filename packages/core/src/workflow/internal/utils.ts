import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { v4 as uuidv4 } from "uuid";
import type { WorkflowExecutionContext } from "../context";
import type { WorkflowState } from "./state";
import type { InternalWorkflowStateParam, InternalWorkflowStepConfig } from "./types";

/**
 * Convert a workflow state to a parameter for a step or hook
 * @param state - The workflow state
 * @param executionContext - The workflow execution context for event tracking
 * @returns The parameter for the step or hook
 */
export function convertWorkflowStateToParam<INPUT>(
  state: WorkflowState<INPUT, DangerouslyAllowAny>,
  executionContext?: WorkflowExecutionContext,
): InternalWorkflowStateParam<INPUT> & { workflowContext?: WorkflowExecutionContext } {
  return {
    executionId: state.executionId,
    conversationId: state.conversationId,
    userId: state.userId,
    userContext: state.userContext,
    active: state.active,
    startAt: state.startAt,
    endAt: state.endAt,
    input: state.input,
    status: state.status,
    error: state.error,
    workflowContext: executionContext,
  };
}

/**
 * Configure a step with the given config
 * @param config - The config to configure the step with
 * @returns The configured step
 */
export function defaultStepConfig<CONFIG extends InternalWorkflowStepConfig>(config: CONFIG) {
  return {
    ...config,
    name: config.name ?? null,
    purpose: config.purpose ?? null,
  };
}
