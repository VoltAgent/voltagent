import type { Span } from "@opentelemetry/api";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import { throwIfAborted } from "./signal";
import type { WorkflowStepBranch, WorkflowStepBranchConfig } from "./types";

/**
 * Creates a branching step that runs all steps whose conditions match.
 */
export function andBranch<INPUT, DATA, RESULT>({
  branches,
  ...config
}: WorkflowStepBranchConfig<INPUT, DATA, RESULT>) {
  return {
    ...defaultStepConfig(config),
    type: "branch",
    branches,
    execute: async (context) => {
      const { state } = context;
      const traceContext = state.workflowContext?.traceContext;

      const conditionResults = await Promise.all(
        branches.map(async (branch) => {
          throwIfAborted(state.signal);
          return branch.condition(context);
        }),
      );

      const results = await Promise.all(
        branches.map(async (branch, index) => {
          if (!conditionResults[index]) {
            return undefined;
          }

          throwIfAborted(state.signal);

          const finalStep = matchStep(branch.step);
          let childSpan: Span | undefined;

          if (traceContext) {
            childSpan = traceContext.createStepSpan(
              index,
              finalStep.type,
              finalStep.name || finalStep.id || `Branch ${index + 1}`,
              {
                parentStepId: config.id,
                parallelIndex: index,
                input: context.data,
                attributes: {
                  "workflow.step.branch": true,
                  "workflow.step.parent_type": "branch",
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
        }),
      );

      return results as Array<RESULT | undefined>;
    },
  } satisfies WorkflowStepBranch<INPUT, DATA, RESULT>;
}
