import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { defaultStepConfig } from "../internal/utils";
import {
  createWorkflowStepStartEvent,
  createWorkflowStepSuccessEvent,
  createWorkflowStepErrorEvent,
  publishWorkflowEvent,
  createStepContext,
} from "../event-utils";
import type { WorkflowStepFunc, WorkflowStepFuncConfig } from "./types";
import type { WorkflowExecuteContext } from "../internal/types";

/**
 * Creates an async function step for the workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andThen(async (data) => {
 *     const processed = await someAsyncOperation(data.value);
 *     return { ...data, processed };
 *   }),
 *   andThen(async (data) => {
 *     return { result: `Processed: ${data.processed}` };
 *   })
 * );
 * ```
 *
 * @param fn - The async function to execute with the workflow data
 * @returns A workflow step that executes the function and returns the result
 */
export function andThen<
  INPUT,
  DATA,
  RESULT,
  SUSPEND_DATA = DangerouslyAllowAny,
  RESUME_DATA = DangerouslyAllowAny,
>({
  execute,
  inputSchema,
  outputSchema,
  suspendSchema,
  resumeSchema,
  ...config
}: WorkflowStepFuncConfig<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>) {
  return {
    ...defaultStepConfig(config),
    type: "func",
    inputSchema,
    outputSchema,
    suspendSchema,
    resumeSchema,
    originalExecute: execute, // ✅ Store original function for serialization
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>) => {
      const { data, state } = context;
      // No workflow context, execute without events
      if (!state.workflowContext) {
        return await execute(context);
      }

      // ✅ Serialize execute function for event tracking
      const stepFunction = execute.toString();

      // Create step context and publish start event
      const stepContext = createStepContext(
        state.workflowContext,
        "func",
        config.name || config.id,
      );
      const stepStartEvent = createWorkflowStepStartEvent(
        stepContext,
        state.workflowContext,
        data, // ✅ Pass input data
        {
          stepFunction,
          userContext: state.workflowContext.userContext,
        },
      );

      try {
        await publishWorkflowEvent(stepStartEvent, state.workflowContext);
      } catch (eventError) {
        console.warn("Failed to publish workflow step start event:", eventError);
      }

      try {
        const result = await execute(context);

        // Publish step success event
        const stepSuccessEvent = createWorkflowStepSuccessEvent(
          stepContext,
          state.workflowContext,
          result,
          stepStartEvent.id,
          {
            stepFunction,
            userContext: state.workflowContext.userContext,
          },
        );

        try {
          await publishWorkflowEvent(stepSuccessEvent, state.workflowContext);
        } catch (eventError) {
          console.warn("Failed to publish workflow step success event:", eventError);
        }

        return result;
      } catch (error) {
        // Check if this is a suspension, not an error
        if (error instanceof Error && error.message === "WORKFLOW_SUSPENDED") {
          // For suspension, we don't publish an error event
          // The workflow core will handle publishing the suspend event
          throw error;
        }

        // Publish step error event for actual errors
        const stepErrorEvent = createWorkflowStepErrorEvent(
          stepContext,
          state.workflowContext,
          error,
          stepStartEvent.id,
          {
            stepFunction,
            userContext: state.workflowContext.userContext,
          },
        );

        try {
          await publishWorkflowEvent(stepErrorEvent, state.workflowContext);
        } catch (eventError) {
          console.warn("Failed to publish workflow step error event:", eventError);
        }

        throw error;
      }
    },
  } as WorkflowStepFunc<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
}
