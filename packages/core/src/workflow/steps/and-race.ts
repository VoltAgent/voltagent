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
      if (steps.length === 0) throw new Error("andRace requires at least one step");
      const { data, state } = context;
      const traceContext = state.workflowContext?.traceContext;
      const controllers = steps.map(() => new AbortController());
      const childSpans: Array<Span | undefined> = steps.map((step, index) =>
        traceContext?.createStepSpan(index, matchStep(step).type, step.name || step.id, {
          stepId: step.id,
          parentStepId: config.id,
          parallelIndex: index,
          input: data,
          attributes: {
            "workflow.step.parallel": true,
            "workflow.step.parent_type": "parallel-race",
          },
        }),
      );
      // Every branch settles to a value, so late loser rejections are consumed.
      const promises = steps.map(async (step, index) => {
        const signal = state.signal
          ? AbortSignal.any([state.signal, controllers[index].signal])
          : controllers[index].signal;
        const executeStep = () =>
          matchStep(step).execute({
            ...context,
            state: { ...state, signal, workflowContext: undefined },
          });
        try {
          const span = childSpans[index];
          const result =
            span && traceContext
              ? await traceContext.withSpan(span, executeStep)
              : await executeStep();
          return { index, success: true as const, result };
        } catch (error) {
          return { index, success: false as const, error };
        }
      });
      const winner = await Promise.race(promises);
      for (const [index, controller] of controllers.entries()) {
        const span = childSpans[index];
        if (index !== winner.index) {
          controller.abort(new Error("Another step settled the race"));
          if (span)
            traceContext?.endStepSpan(span, "skipped", {
              skippedReason: "Another step settled the race",
            });
        } else if (span) {
          if (winner.success)
            traceContext?.endStepSpan(span, "completed", { output: winner.result });
          else traceContext?.endStepSpan(span, "error", { error: winner.error });
        }
      }
      if (!winner.success) throw winner.error;
      return winner.result as INFERRED_RESULT;
    },
  } satisfies WorkflowStepParallelRace<INPUT, DATA, INFERRED_RESULT>;
}
