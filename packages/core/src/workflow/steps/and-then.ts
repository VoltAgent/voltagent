import { defaultStepConfig } from "../internal/utils";
import {
  createWorkflowStepStartEvent,
  createWorkflowStepSuccessEvent,
  createWorkflowStepErrorEvent,
  publishWorkflowEvent,
  createStepContext,
} from "../event-utils";
import type { WorkflowStepFunc, WorkflowStepFuncConfig } from "./types";

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
export function andThen<INPUT, DATA, RESULT>({
  execute,
  ...config
}: WorkflowStepFuncConfig<INPUT, DATA, RESULT>) {
  return {
    ...defaultStepConfig(config),
    type: "func",
    originalExecute: execute, // ✅ Store original function for serialization
    execute: async (data, state) => {
      // No workflow context, execute without events
      if (!state.workflowContext) {
        return await execute(data, state);
      }

      // ✅ Serialize execute function for event tracking
      const stepFunction = execute.toString();

      // Create step context and publish start event
      const stepContext = createStepContext(
        state.workflowContext,
        "func",
        config.name || "Function",
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
        const result = await execute(data, state);

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
        // Publish step error event
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
  } as WorkflowStepFunc<INPUT, DATA, RESULT>;
}
