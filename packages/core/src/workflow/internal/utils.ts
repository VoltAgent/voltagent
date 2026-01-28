import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import {
  type UIDataTypes,
  type UIMessageChunk,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { WorkflowExecutionContext } from "../context";
import type { WorkflowStreamController } from "../stream";
import type { WorkflowStateUpdater, WorkflowStepState, WorkflowStreamEvent } from "../types";
import type { WorkflowState } from "./state";
import type { InternalWorkflowStepConfig, WorkflowExecuteContext } from "./types";

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
): WorkflowStepState<INPUT> & { workflowContext?: WorkflowExecutionContext } {
  return {
    executionId: state.executionId,
    conversationId: state.conversationId,
    userId: state.userId,
    context: state.context,
    workflowState: state.workflowState,
    active: state.active,
    startAt: state.startAt,
    endAt: state.endAt,
    input: state.input,
    status: state.status,
    error: state.error,
    usage: state.usage,
    suspension: state.suspension,
    cancellation: state.cancellation,
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
  data: DATA,
  state: WorkflowStepState<INPUT>,
  executionContext: WorkflowExecutionContext,
  suspendFn: (reason?: string, suspendData?: SUSPEND_DATA) => Promise<never>,
  resumeData?: RESUME_DATA,
  retryCount = 0,
  setWorkflowState?: (update: WorkflowStateUpdater) => void,
): WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA> {
  return {
    data,
    state,
    getStepData: (stepId: string) => executionContext?.stepData.get(stepId),
    suspend: suspendFn,
    resumeData,
    retryCount,
    workflowState: executionContext.workflowState,
    setWorkflowState: setWorkflowState ?? (() => undefined),
    logger: executionContext.logger,
    writer: executionContext.streamWriter,
  };
}

export const convertWorkflowStreamEventToUIMessage = (
  message: WorkflowStreamEvent,
): UIMessageChunk<unknown, UIDataTypes> => {
  const { type, ...dataChunk } = message;

  return { type: `data-${type}`, data: { ...dataChunk } };
};

export function eventToUIMessageStreamResponse(streamController: WorkflowStreamController) {
  return (options?: any) => {
    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        for await (const event of streamController.getStream()) {
          const chunk = convertWorkflowStreamEventToUIMessage(event);
          writer.write(chunk);
        }
      },
      onError: (error) => String(error),
    });

    return createUIMessageStreamResponse({
      stream: uiStream,
      ...(options || {}),
    });
  };
}
