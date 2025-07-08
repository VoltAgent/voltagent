import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { WorkflowState } from "./state";
import type { InternalWorkflowStateParam } from "./types";

/**
 * Convert a workflow state to a parameter for a step or hook
 * @param state - The workflow state
 * @returns The parameter for the step or hook
 */
export function convertWorkflowStateToParam(
  state: WorkflowState<DangerouslyAllowAny, DangerouslyAllowAny>,
): InternalWorkflowStateParam {
  return {
    executionId: state.executionId,
    active: state.active,
    startAt: state.startAt,
    endAt: state.endAt,
    status: state.status,
    error: state.error,
  };
}
