import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { WorkflowExecutionContext } from "../context";
import type { WorkflowState } from "./state";
import type {
  InternalExtractWorkflowInputData,
  InternalWorkflowStateParam,
  InternalWorkflowStepConfig,
  WorkflowExecuteContext,
} from "./types";

/**
 * Convert a workflow state to a parameter for a step or hook
 * @param state - The workflow state
 * @param executionContext - The workflow execution context for event tracking
 * @param signal - Optional AbortSignal for step suspension
 * @returns The parameter for the step or hook
 */
export function convertWorkflowStateToParam<INPUT>(
  state: WorkflowState<INPUT, DangerouslyAllowAny>,
  executionContext?: WorkflowExecutionContext,
  signal?: AbortSignal,
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
    signal,
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

/**
 * Create a context object for step execution
 * @param data - The step input data
 * @param state - The workflow state
 * @param executionContext - The workflow execution context
 * @param suspendFn - The suspend function for the step
 * @returns The execution context for the step
 */
export function createStepExecutionContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>(
  data: InternalExtractWorkflowInputData<DATA>,
  state: InternalWorkflowStateParam<INPUT>,
  executionContext: WorkflowExecutionContext,
  suspendFn: (reason?: string, suspendData?: SUSPEND_DATA) => Promise<never>,
  resumeData?: RESUME_DATA,
): WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA> {
  return {
    data,
    state,
    getStepData: (stepId: string) => executionContext?.stepData.get(stepId),
    suspend: suspendFn,
    resumeData,
    logger: executionContext.logger,
  };
}
