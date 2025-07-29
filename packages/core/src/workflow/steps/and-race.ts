import type {
  InternalAnyWorkflowStep,
  InternalInferWorkflowStepsResult,
  InternalWorkflowStepConfig,
} from "../internal/types";
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
import type { WorkflowStepParallelRace } from "./types";
import { getGlobalLogger } from "../../logger";

/**
 * Creates a race execution step that runs multiple steps simultaneously and returns the first completed result
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andRace([
 *     andThen(async (data) => {
 *       // Fast operation
 *       const cacheResult = await checkCache(data.query);
 *       return { source: "cache", result: cacheResult };
 *     }),
 *     andThen(async (data) => {
 *       // Slower operation
 *       const dbResult = await queryDatabase(data.query);
 *       return { source: "database", result: dbResult };
 *     }),
 *     andAgent(
 *       (data) => `Generate fallback response for: ${data.query}`,
 *       agent,
 *       { schema: z.object({ source: z.literal("ai"), result: z.string() }) }
 *     )
 *   ]),
 *   andThen(async (data) => {
 *     // data is the result from whichever step completed first
 *     return { finalResult: data.result, source: data.source };
 *   })
 * );
 * ```
 *
 * @param steps - Array of workflow steps to execute in parallel
 * @returns A workflow step that executes all steps simultaneously and returns the result from the first step to complete
 */
export function andRace<
  INPUT,
  DATA,
  RESULT,
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>,
  INFERRED_RESULT = InternalInferWorkflowStepsResult<STEPS>[number],
>({
  steps,
  ...config
}: InternalWorkflowStepConfig<{
  steps: STEPS;
}>) {
  return {
    ...defaultStepConfig(config),
    type: "parallel-race",
    steps: steps as unknown as InternalAnyWorkflowStep<INPUT, DATA, INFERRED_RESULT>[],
    execute: async (context) => {
      const { data, state } = context;
      // No workflow context, execute without events
      if (!state.workflowContext) {
        const promises = steps.map((step) => matchStep(step).execute(context));
        return (await Promise.race(promises)) as INFERRED_RESULT;
      }

      // Create step context and publish start event
      const stepContext = createStepContext(
        state.workflowContext,
        "parallel-race",
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
          .child({ component: "workflow", stepType: "race" })
          .warn("Failed to publish workflow step start event:", { error: eventError });
      }

      try {
        // 🏁 Enhanced: Track which step wins the race with execution times
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
              .child({ component: "workflow", stepType: "race" })
              .warn(`Failed to publish sub-step ${index} start event:`, { error: eventError });
          }

          const subState = {
            ...state,
            workflowContext: undefined, // ❌ Remove workflow context to prevent individual event publishing
          };

          // Return promise with index and timing to track winner and execution times
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

        // Wait for the first step to complete (winner)
        const winner = await Promise.race(stepPromises);

        // 🕐 Collect execution results from all steps for duration tracking
        const allStepResults = await Promise.allSettled(stepPromises);
        const stepTimings = allStepResults.map((result, index) => {
          if (result.status === "fulfilled") {
            return result.value;
          }
          // For rejected promises, create a timing entry with error info
          return {
            error: result.reason,
            index,
            success: false,
            startTime: new Date().toISOString(), // Fallback timing
            endTime: new Date().toISOString(),
          };
        });

        // Handle winner result with proper type discrimination
        let finalResult: INFERRED_RESULT;
        if (winner.success) {
          finalResult = (
            winner as {
              result: RESULT;
              index: number;
              success: boolean;
              startTime: string;
              endTime: string;
            }
          ).result as unknown as INFERRED_RESULT;
        } else {
          throw (
            winner as {
              error: any;
              index: number;
              success: boolean;
              startTime: string;
              endTime: string;
            }
          ).error;
        }

        // 🏆 Publish success events for winner and skipped events for losers with timing
        for (let i = 0; i < steps.length; i++) {
          const subStepContext = createParallelSubStepContext(stepContext, i);
          const isWinner = i === winner.index;
          const stepTiming = stepTimings[i];

          // Override sub-step context timing with actual execution times
          if (stepTiming) {
            subStepContext.startTime = new Date(stepTiming.startTime);
          }

          const eventResult = isWinner ? finalResult : undefined;
          const eventIsSkipped = !isWinner;

          const subStepSuccessEvent = createWorkflowStepSuccessEvent(
            subStepContext,
            state.workflowContext,
            eventResult,
            stepStartEvent.id,
            {
              parallelIndex: i,
              isSkipped: eventIsSkipped,
            },
          );

          // ✅ Override timing in the event for accurate duration
          if (stepTiming) {
            subStepSuccessEvent.startTime = stepTiming.startTime;
            subStepSuccessEvent.endTime = stepTiming.endTime;
          }

          try {
            await publishWorkflowEvent(subStepSuccessEvent, state.workflowContext);
          } catch (eventError) {
            const eventType = isWinner ? "winner" : "loser";
            getGlobalLogger()
              .child({ component: "workflow", stepType: "race" })
              .warn(`Failed to publish ${eventType} success event for sub-step ${i}:`, {
                error: eventError,
              });
          }
        }

        // Publish main step success event
        const stepSuccessEvent = createWorkflowStepSuccessEvent(
          stepContext,
          state.workflowContext,
          finalResult,
          stepStartEvent.id,
          {
            parallelIndex: 0,
          },
        );

        try {
          await publishWorkflowEvent(stepSuccessEvent, state.workflowContext);
        } catch (eventError) {
          getGlobalLogger()
            .child({ component: "workflow", stepType: "race" })
            .warn("Failed to publish workflow step success event:", { error: eventError });
        }

        return finalResult;
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
            .child({ component: "workflow", stepType: "race" })
            .warn("Failed to publish workflow step error event:", { error: eventError });
        }

        throw error;
      }
    },
  } satisfies WorkflowStepParallelRace<INPUT, DATA, INFERRED_RESULT>;
}
