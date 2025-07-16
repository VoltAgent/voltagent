import type { InternalAnyWorkflowStep, InternalInferWorkflowStepsResult } from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import {
  createWorkflowStepStartEvent,
  createWorkflowStepSuccessEvent,
  createWorkflowStepErrorEvent,
  publishWorkflowEvent,
  createStepContext,
  createParallelSubStepContext,
} from "../event-utils";
import { matchStep } from "./helpers";
import type { WorkflowStepParallelAll, WorkflowStepParallelAllConfig } from "./types";

/**
 * Creates a parallel execution step that runs multiple steps simultaneously and waits for all to complete
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andAll([
 *     andThen(async (data) => {
 *       const userInfo = await fetchUserInfo(data.userId);
 *       return { userInfo };
 *     }),
 *     andThen(async (data) => {
 *       const permissions = await fetchPermissions(data.userId);
 *       return { permissions };
 *     }),
 *     andAgent(
 *       (data) => `Generate recommendations for user ${data.userId}`,
 *       agent,
 *       { schema: z.object({ recommendations: z.array(z.string()) }) }
 *     )
 *   ]),
 *   andThen(async (data) => {
 *     // data is now an array: [{ userInfo }, { permissions }, { recommendations }]
 *     return { combined: data.flat() };
 *   })
 * );
 * ```
 *
 * @param steps - Array of workflow steps to execute in parallel
 * @returns A workflow step that executes all steps simultaneously and returns their results as an array
 */
export function andAll<
  INPUT,
  DATA,
  RESULT,
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>,
  INFERRED_RESULT = InternalInferWorkflowStepsResult<STEPS>,
>({ steps, ...config }: WorkflowStepParallelAllConfig<STEPS>) {
  return {
    ...defaultStepConfig(config),
    type: "parallel-all",
    steps: steps as unknown as InternalAnyWorkflowStep<INPUT, DATA, INFERRED_RESULT>[],
    execute: async (context) => {
      const { data, state } = context;
      // No workflow context, execute without events
      if (!state.workflowContext) {
        const promises = steps.map((step) => matchStep(step).execute(context));
        return (await Promise.all(promises)) as INFERRED_RESULT;
      }

      // Create step context and publish start event
      const stepContext = createStepContext(
        state.workflowContext,
        "parallel-all",
        config.name || config.id,
      );
      const stepStartEvent = createWorkflowStepStartEvent(
        stepContext,
        state.workflowContext,
        data, // ✅ Pass input data
        {
          parallelIndex: 0,
        },
      );

      try {
        await publishWorkflowEvent(stepStartEvent, state.workflowContext);
      } catch (eventError) {
        console.warn("Failed to publish workflow step start event:", eventError);
      }

      try {
        // Enhanced: Each parallel step gets its own sub-context
        const promises = steps.map((step, index) => {
          const subStepContext = createParallelSubStepContext(stepContext, index);
          const subState = {
            ...state,
            workflowContext: state.workflowContext
              ? {
                  ...state.workflowContext,
                  currentStepContext: subStepContext,
                  parallelParentEventId: stepStartEvent.id,
                }
              : undefined,
          };
          return matchStep(step).execute({ ...context, state: subState });
        });

        const results = (await Promise.all(promises)) as INFERRED_RESULT;

        // Publish step success event
        const stepSuccessEvent = createWorkflowStepSuccessEvent(
          stepContext,
          state.workflowContext,
          results,
          stepStartEvent.id,
          {
            completedSteps: Array.isArray(results) ? results.length : steps.length,
            parallelIndex: 0,
          },
        );

        try {
          await publishWorkflowEvent(stepSuccessEvent, state.workflowContext);
        } catch (eventError) {
          console.warn("Failed to publish workflow step success event:", eventError);
        }

        return results;
      } catch (error) {
        // Publish step error event
        const stepErrorEvent = createWorkflowStepErrorEvent(
          stepContext,
          state.workflowContext,
          error,
          stepStartEvent.id,
          {
            parallelIndex: 0,
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
  } satisfies WorkflowStepParallelAll<INPUT, DATA, INFERRED_RESULT>;
}
