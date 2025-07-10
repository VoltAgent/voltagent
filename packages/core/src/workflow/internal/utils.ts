import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { v4 as uuidv4 } from "uuid";
import type { WorkflowState } from "./state";
import type {
  InternalBaseWorkflowStep,
  InternalWorkflowStateParam,
  InternalWorkflowStepConfig,
} from "./types";

/**
 * Convert a workflow state to a parameter for a step or hook
 * @param state - The workflow state
 * @returns The parameter for the step or hook
 */
export function convertWorkflowStateToParam<INPUT>(
  state: WorkflowState<INPUT, DangerouslyAllowAny>,
): InternalWorkflowStateParam<INPUT> {
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
    id: config.id ?? uuidv4(),
    name: config.name ?? "No name provided",
    purpose: config.purpose ?? "No purpose provided",
  };
}
