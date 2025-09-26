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

        // Track which step wins the race with execution times
        const stepPromises = steps.map(async (step, index) => {
          const startTime = new Date();
          const childSpan = childSpans[index];

          // Step events removed - now handled by OpenTelemetry spans

          const subState = {
            ...state,
            workflowContext: undefined, // ❌ Remove workflow context to prevent individual event publishing
          };

          // Execute within span context if available
          const executeStep = async () => {
            return matchStep(step).execute({ ...context, state: subState });
          };

          // Return promise with index and timing to track winner and execution times
          return (
            childSpan && traceContext
              ? traceContext.withSpan(childSpan, executeStep)
              : executeStep()
          )
            .then((result) => ({
              result,
              index,
              success: true,
              startTime: startTime.toISOString(),
              endTime: new Date().toISOString(),
              childSpan, // Keep reference to span for later ending
            }))
            .catch((error) => ({
              error,
              index,
              success: false,
              startTime: startTime.toISOString(),
              endTime: new Date().toISOString(),
              childSpan, // Keep reference to span for later ending
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

        // End child spans with appropriate status
        if (traceContext) {
          for (let i = 0; i < stepTimings.length; i++) {
            const stepResult = stepTimings[i] as any;
            const childSpan = stepResult?.childSpan;

            if (childSpan) {
              const isWinner = i === winner.index;

              if (stepResult.success) {
                if (isWinner) {
                  // Winner span - mark as completed
                  traceContext.endStepSpan(childSpan, "completed", {
                    output: stepResult.result,
                  });
                } else {
                  // Non-winner spans - mark as skipped
                  traceContext.endStepSpan(childSpan, "skipped", {
                    output: stepResult.result,
                    skippedReason: "Another step won the race",
                  });
                }
              } else {
                // Error span
                traceContext.endStepSpan(childSpan, "error", {
                  error: stepResult.error,
                });
              }
            }
          }
        }

        // Step events removed - now handled by OpenTelemetry spans

        return finalResult;
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
