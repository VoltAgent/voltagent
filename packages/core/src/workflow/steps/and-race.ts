import type { Span } from "@opentelemetry/api";
import type {
  InternalAnyWorkflowStep,
  InternalInferWorkflowStepsResult,
  InternalWorkflowStepConfig,
} from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import type { WorkflowStepParallelRace } from "./types";

/**
 * Creates a race execution step that runs multiple steps simultaneously and returns the first completed result
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andRace({
 *     id: "race-data-sources",
 *     steps: [
 *       andThen({
 *         id: "check-cache",
 *         execute: async ({ data }) => {
 *           // Fast operation
 *           const cacheResult = await checkCache(data.query);
 *           return { source: "cache", result: cacheResult };
 *         }
 *       }),
 *       andThen({
 *         id: "query-database",
 *         execute: async ({ data }) => {
 *           // Slower operation
 *           const dbResult = await queryDatabase(data.query);
 *           return { source: "database", result: dbResult };
 *         }
 *       }),
 *       andAgent(
 *         ({ data }) => `Generate fallback response for: ${data.query}`,
 *         agent,
 *         { schema: z.object({ source: z.literal("ai"), result: z.string() }) }
 *       )
 *     ]
 *   }),
 *   andThen({
 *     id: "process-result",
 *     execute: async ({ data }) => {
 *       // data is the result from whichever step completed first
 *       return { finalResult: data.result, source: data.source };
 *     }
 *   })
 * );
 * ```
 *
 * @param config - Configuration object with steps array and metadata
 * @returns A workflow step that executes all steps simultaneously and returns the result from the first step to complete
 */
export function andRace<
  INPUT,
  DATA,
  RESULT,
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>,
>({
  steps,
  ...config
}: InternalWorkflowStepConfig<{
  steps: STEPS;
}>) {
  type INFERRED_RESULT = InternalInferWorkflowStepsResult<STEPS>[number];

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

      // Step events removed - now handled by OpenTelemetry spans

      try {
        // Create child spans for parallel execution if traceContext is available
        const traceContext = state.workflowContext?.traceContext;
        const childSpans: Span[] = [];

        if (traceContext) {
          // Create a child span for each parallel step
          steps.forEach((step, index) => {
            const childSpan = traceContext.createStepSpan(
              index,
              "func", // Child steps in parallel-race are typically functions
              step.name || step.id || `Race Step ${index + 1}`,
              {
                stepId: step.id,
                parentStepId: config.id,
                parallelIndex: index,
                input: data,
                attributes: {
                  "workflow.step.parallel": true,
                  "workflow.step.parent_type": "parallel-race",
                },
              },
            );
            childSpans.push(childSpan);
          });
        }

        const stepPromises = steps.map(async (step, index) => {
          const childSpan = childSpans[index];
          const subState = {
            ...state,
            workflowContext: undefined,
          };
          const executeStep = async () => matchStep(step).execute({ ...context, state: subState });

          // Observe every rejection, including losing steps that settle after the race.
          return (
            childSpan && traceContext
              ? traceContext.withSpan(childSpan, executeStep)
              : executeStep()
          ).then(
            (result) => ({ result, index, success: true as const }),
            (error: unknown) => ({ error, index, success: false as const }),
          );
        });

        const winner = await Promise.race(stepPromises);

        // Close all race spans now, even if a losing step never settles. Skipping a
        // losing result does not cancel the underlying operation.
        if (traceContext) {
          childSpans.forEach((childSpan, index) => {
            if (index !== winner.index) {
              traceContext.endStepSpan(childSpan, "skipped", {
                skippedReason: "Another step won the race",
              });
            } else if (winner.success) {
              traceContext.endStepSpan(childSpan, "completed", { output: winner.result });
            } else if (
              winner.error instanceof Error &&
              winner.error.message === "WORKFLOW_SUSPENDED"
            ) {
              traceContext.endStepSpan(childSpan, "suspended");
            } else if (
              winner.error instanceof Error &&
              winner.error.message === "WORKFLOW_CANCELLED"
            ) {
              traceContext.endStepSpan(childSpan, "cancelled");
            } else {
              traceContext.endStepSpan(childSpan, "error", { error: winner.error });
            }
          });
        }

        if (!winner.success) {
          throw winner.error;
        }

        return winner.result as INFERRED_RESULT;
      } catch (error) {
        // Check if this is a suspension, not an error
        if (
          error instanceof Error &&
          (error.message === "WORKFLOW_SUSPENDED" || error.message === "WORKFLOW_CANCELLED")
        ) {
          // For suspension, we don't publish an error event
          // The workflow core will handle publishing the suspend event
          throw error;
        }

        // Step events removed - now handled by OpenTelemetry spans

        throw error;
      }
    },
  } satisfies WorkflowStepParallelRace<INPUT, DATA, INFERRED_RESULT>;
}
