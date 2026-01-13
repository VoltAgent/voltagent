import type { Span } from "@opentelemetry/api";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import { throwIfAborted } from "./signal";
import type { WorkflowStepForEach, WorkflowStepForEachConfig } from "./types";

/**
 * Creates a foreach step that runs a step for each item in an array.
 */
export function andForEach<INPUT, ITEM, RESULT>({
  step,
  concurrency = 1,
  ...config
}: WorkflowStepForEachConfig<INPUT, ITEM, RESULT>) {
  const finalStep = matchStep(step);

  return {
    ...defaultStepConfig(config),
    type: "foreach",
    step,
    concurrency,
    execute: async (context) => {
      const { data, state } = context;
      if (!Array.isArray(data)) {
        throw new Error("andForEach expects array input data");
      }

      const items = data as ITEM[];
      if (items.length === 0) {
        return [];
      }

      const traceContext = state.workflowContext?.traceContext;
      const normalizedConcurrency = Number.isFinite(concurrency) ? Math.floor(concurrency) : 1;
      const maxConcurrency = Math.max(1, normalizedConcurrency);

      const runItem = async (item: ITEM, index: number) => {
        throwIfAborted(state.signal);

        let childSpan: Span | undefined;
        if (traceContext) {
          childSpan = traceContext.createStepSpan(
            index,
            finalStep.type,
            finalStep.name || finalStep.id || `ForEach ${index + 1}`,
            {
              parentStepId: config.id,
              parallelIndex: index,
              input: item,
              attributes: {
                "workflow.step.foreach": true,
                "workflow.step.parent_type": "foreach",
              },
            },
          );
        }

        const subState = {
          ...state,
          workflowContext: undefined,
        };

        const executeStep = () =>
          finalStep.execute({
            ...context,
            data: item,
            state: subState,
          });

        try {
          const result =
            childSpan && traceContext
              ? await traceContext.withSpan(childSpan, executeStep)
              : await executeStep();

          if (childSpan && traceContext) {
            traceContext.endStepSpan(childSpan, "completed", { output: result });
          }

          return result;
        } catch (error) {
          if (childSpan && traceContext) {
            traceContext.endStepSpan(childSpan, "error", { error });
          }
          throw error;
        }
      };

      if (maxConcurrency === 1) {
        const results: RESULT[] = [];
        for (let index = 0; index < items.length; index += 1) {
          results.push(await runItem(items[index] as ITEM, index));
        }
        return results;
      }

      const results = new Array<RESULT>(items.length);
      let nextIndex = 0;

      const workers = Array.from({ length: Math.min(maxConcurrency, items.length) }, async () => {
        while (nextIndex < items.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await runItem(items[index] as ITEM, index);
        }
      });

      await Promise.all(workers);
      return results;
    },
  } satisfies WorkflowStepForEach<INPUT, ITEM, RESULT>;
}
