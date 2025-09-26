import type { Span } from "@opentelemetry/api";
import { isFunction } from "@voltagent/internal/utils";
import type {
  InternalAnyWorkflowStep,
  InternalInferWorkflowStepsResult,
  InternalWorkflowFunc,
} from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import type {
  WorkflowStepParallelAll,
  WorkflowStepParallelAllConfig,
  WorkflowStepParallelDynamicStepsFunc,
} from "./types";

/**
 * Creates a parallel execution step that runs multiple steps simultaneously and waits for all to complete
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andAll({
 *     id: "parallel-fetch",
 *     steps: [
 *       andThen({
 *         id: "fetch-user",
 *         execute: async ({ data }) => {
 *           const userInfo = await fetchUserInfo(data.userId);
 *           return { userInfo };
 *         }
 *       }),
 *       andThen({
 *         id: "fetch-permissions",
 *         execute: async ({ data }) => {
 *           const permissions = await fetchPermissions(data.userId);
 *           return { permissions };
 *         }
 *       }),
 *       andAgent(
 *         ({ data }) => `Generate recommendations for user ${data.userId}`,
 *         agent,
 *         { schema: z.object({ recommendations: z.array(z.string()) }) }
 *       )
 *     ]
 *   }),
 *   andThen({
 *     id: "combine-results",
 *     execute: async ({ data }) => {
 *       // data is now an array: [{ userInfo }, { permissions }, { recommendations }]
 *       return { combined: data.flat() };
 *     }
 *   })
 * );
 * ```
 *
 * @param config - Configuration object with steps array and metadata
 * @returns A workflow step that executes all steps simultaneously and returns their results as an array
 */
export function andAll<
  INPUT,
  DATA,
  RESULT,
  STEPS extends
    | ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>
    | WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT>,
>({ steps: inputSteps, ...config }: WorkflowStepParallelAllConfig<INPUT, DATA, RESULT, STEPS>) {
  type INFERRED_RESULT = STEPS extends ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>
    ? InternalInferWorkflowStepsResult<STEPS>
    : STEPS extends WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT>
      ? InternalInferWorkflowStepsResult<Awaited<ReturnType<STEPS>>>
      : never;

  return {
    ...defaultStepConfig(config),
    type: "parallel-all",
    steps: inputSteps as unknown as InternalAnyWorkflowStep<INPUT, DATA, INFERRED_RESULT>[],
    execute: async (context) => {
      const { data, state } = context;

      // @ts-expect-error - TODO: fix this
      const steps = await getStepsFunc(inputSteps)(context);
      // No workflow context, execute without events
      if (!state.workflowContext) {
        const promises = steps.map((step) =>
          // @ts-expect-error - TODO: fix this
          matchStep(step).execute(context),
        );
        return (await Promise.all(promises)) as unknown as INFERRED_RESULT;
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
              "func", // Child steps in parallel-all are typically functions
              step.name || step.id || `Parallel Step ${index + 1}`,
              {
                stepId: step.id,
                parentStepId: config.id,
                parallelIndex: index,
                input: data,
                attributes: {
                  "workflow.step.parallel": true,
                  "workflow.step.parent_type": "parallel-all",
                },
              },
            );
            childSpans.push(childSpan);
          });
        }

        // Each parallel step executes with tracing
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
            return (
              matchStep(step)
                // @ts-expect-error - TODO: fix this
                .execute({ ...context, state: subState })
            );
          };

          // Return promise with index and timing to track execution times
          return (
            childSpan && traceContext
              ? traceContext.withSpan(childSpan, executeStep)
              : executeStep()
          )
            .then((result) => {
              // End child span successfully if available
              if (childSpan && traceContext) {
                traceContext.endStepSpan(childSpan, "completed", {
                  output: result,
                });
              }
              return {
                result,
                index,
                success: true,
                startTime: startTime.toISOString(),
                endTime: new Date().toISOString(),
              };
            })
            .catch((error) => {
              // End child span with error if available
              if (childSpan && traceContext) {
                traceContext.endStepSpan(childSpan, "error", {
                  error,
                });
              }
              return {
                error,
                index,
                success: false,
                startTime: startTime.toISOString(),
                endTime: new Date().toISOString(),
              };
            });
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

        // Step events removed - now handled by OpenTelemetry spans

        // If any step failed, throw the first error
        if (hasError) {
          throw firstError;
        }

        const finalResults = results as unknown as INFERRED_RESULT;

        // Step events removed - now handled by OpenTelemetry spans

        return finalResults;
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
  } satisfies WorkflowStepParallelAll<INPUT, DATA, INFERRED_RESULT>;
}

function getStepsFunc<
  INPUT,
  DATA,
  RESULT,
  STEPS extends
    | ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>
    | WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT>,
>(
  steps: STEPS,
): InternalWorkflowFunc<INPUT, DATA, InternalAnyWorkflowStep<INPUT, DATA, RESULT>[], any, any> {
  if (isStepsFunction(steps)) {
    return steps;
  }
  return (async () => {
    return steps;
  }) as unknown as InternalWorkflowFunc<
    INPUT,
    DATA,
    InternalAnyWorkflowStep<INPUT, DATA, RESULT>[],
    any,
    any
  >;
}

function isStepsFunction<INPUT, DATA, RESULT>(
  steps:
    | ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>
    | WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT>,
): steps is InternalWorkflowFunc<
  INPUT,
  DATA,
  InternalAnyWorkflowStep<INPUT, DATA, RESULT>[],
  any,
  any
> {
  return isFunction(steps) && !Array.isArray(steps);
}
