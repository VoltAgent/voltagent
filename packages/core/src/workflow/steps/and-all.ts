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
import { getGlobalLogger } from "../../logger";

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
        getGlobalLogger()
          .child({ component: "workflow", stepType: "all" })
          .warn("Failed to publish workflow step start event:", eventError);
      }

      try {
        // Enhanced: Each parallel step gets its own sub-context with event tracking
        const stepPromises = steps.map(async (step, index) => {
          const subStepContext = createParallelSubStepContext(stepContext, index);
          const startTime = new Date();

          // 🚀 Publish start event for each sub-step
          const subStepStartEvent = createWorkflowStepStartEvent(
            subStepContext,
            state.workflowContext ??
              (() => {
                throw new Error("Workflow context is required");
              })(),
            data,
            {
              parallelIndex: index,
            },
          );

          try {
            const workflowContext = state.workflowContext;
            if (workflowContext) {
              await publishWorkflowEvent(subStepStartEvent, workflowContext);
            }
          } catch (eventError) {
            getGlobalLogger()
              .child({ component: "workflow", stepType: "all" })
              .warn(`Failed to publish sub-step ${index} start event:`, eventError);
          }

          const subState = {
            ...state,
            workflowContext: undefined, // ❌ Remove workflow context to prevent individual event publishing
          };

          // Return promise with index and timing to track execution times
          return matchStep(step)
            .execute({ ...context, state: subState })
            .then((result) => ({
              result,
              index,
              success: true,
              startTime: startTime.toISOString(),
              endTime: new Date().toISOString(),
            }))
            .catch((error) => ({
              error,
              index,
              success: false,
              startTime: startTime.toISOString(),
              endTime: new Date().toISOString(),
            }));
        });

        // Wait for all steps to complete
        const allStepResults = await Promise.allSettled(stepPromises);

        // Extract results and check for errors
        const results: any[] = [];
        let hasError = false;
        let firstError: any = null;

        for (const promiseResult of allStepResults) {
          if (promiseResult.status === "fulfilled") {
            const stepResult = promiseResult.value as {
              result?: any;
              error?: any;
              index: number;
              success: boolean;
              startTime: string;
              endTime: string;
            };
            if (stepResult.success) {
              results.push(stepResult.result);
            } else {
              hasError = true;
              if (!firstError) {
                firstError = stepResult.error;
              }
              results.push(undefined); // Placeholder for failed step
            }
          } else {
            hasError = true;
            if (!firstError) {
              firstError = promiseResult.reason;
            }
            results.push(undefined); // Placeholder for rejected promise
          }
        }

        // 🏁 Publish success events for all sub-steps with timing
        for (let i = 0; i < steps.length; i++) {
          const subStepContext = createParallelSubStepContext(stepContext, i);
          const stepResult = allStepResults[i];

          if (stepResult.status === "fulfilled") {
            const stepData = stepResult.value as {
              result?: any;
              error?: any;
              index: number;
              success: boolean;
              startTime: string;
              endTime: string;
            };

            // Override sub-step context timing with actual execution times
            if (stepData.startTime) {
              subStepContext.startTime = new Date(stepData.startTime);
            }

            const subStepSuccessEvent = createWorkflowStepSuccessEvent(
              subStepContext,
              state.workflowContext,
              stepData.success ? stepData.result : undefined,
              stepStartEvent.id,
              {
                parallelIndex: i,
                isSkipped: false,
              },
            );

            // ✅ Override timing in the event for accurate duration
            if (stepData.startTime && stepData.endTime) {
              subStepSuccessEvent.startTime = stepData.startTime;
              subStepSuccessEvent.endTime = stepData.endTime;
            }

            try {
              await publishWorkflowEvent(subStepSuccessEvent, state.workflowContext);
            } catch (eventError) {
              getGlobalLogger()
                .child({ component: "workflow", stepType: "all" })
                .warn(`Failed to publish success event for sub-step ${i}:`, eventError);
            }
          }
        }

        // If any step failed, throw the first error
        if (hasError) {
          throw firstError;
        }

        const finalResults = results as INFERRED_RESULT;

        // Publish step success event
        const stepSuccessEvent = createWorkflowStepSuccessEvent(
          stepContext,
          state.workflowContext,
          finalResults,
          stepStartEvent.id,
          {
            completedSteps: Array.isArray(results) ? results.length : steps.length,
            parallelIndex: 0,
          },
        );

        try {
          await publishWorkflowEvent(stepSuccessEvent, state.workflowContext);
        } catch (eventError) {
          getGlobalLogger()
            .child({ component: "workflow", stepType: "all" })
            .warn("Failed to publish workflow step success event:", eventError);
        }

        return finalResults;
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
            parallelIndex: 0,
          },
        );

        try {
          await publishWorkflowEvent(stepErrorEvent, state.workflowContext);
        } catch (eventError) {
          getGlobalLogger()
            .child({ component: "workflow", stepType: "all" })
            .warn("Failed to publish workflow step error event:", eventError);
        }

        throw error;
      }
    },
  } satisfies WorkflowStepParallelAll<INPUT, DATA, INFERRED_RESULT>;
}
