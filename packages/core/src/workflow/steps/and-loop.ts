import type { Span } from "@opentelemetry/api";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import { throwIfAborted } from "./signal";
import type { WorkflowStepLoop, WorkflowStepLoopConfig } from "./types";

type LoopType = "dowhile" | "dountil";

const createLoopStep = <INPUT, DATA, RESULT>(
  loopType: LoopType,
  { step, condition, ...config }: WorkflowStepLoopConfig<INPUT, DATA, RESULT>,
) => {
  const finalStep = matchStep(step);

  return {
    ...defaultStepConfig(config),
    type: "loop",
    loopType,
    step,
    condition,
    execute: async (context) => {
      const { state } = context;
      const traceContext = state.workflowContext?.traceContext;
      let currentData = context.data as DATA | RESULT;
      let iteration = 0;

      while (true) {
        throwIfAborted(state.signal);

        let childSpan: Span | undefined;
        if (traceContext) {
          childSpan = traceContext.createStepSpan(
            iteration,
            finalStep.type,
            finalStep.name || finalStep.id || `Loop ${iteration + 1}`,
            {
              parentStepId: config.id,
              parallelIndex: iteration,
              input: currentData,
              attributes: {
                "workflow.step.loop": true,
                "workflow.step.parent_type": "loop",
                "workflow.step.loop_type": loopType,
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
            data: currentData as DATA,
            state: subState,
          });

        try {
          currentData =
            childSpan && traceContext
              ? await traceContext.withSpan(childSpan, executeStep)
              : await executeStep();

          if (childSpan && traceContext) {
            traceContext.endStepSpan(childSpan, "completed", { output: currentData });
          }
        } catch (error) {
          if (childSpan && traceContext) {
            traceContext.endStepSpan(childSpan, "error", { error });
          }
          throw error;
        }

        iteration += 1;
        throwIfAborted(state.signal);
        const shouldContinue = await condition({
          ...context,
          data: currentData as RESULT,
        });

        if (loopType === "dowhile" ? !shouldContinue : shouldContinue) {
          break;
        }
      }

      return currentData as RESULT;
    },
  } satisfies WorkflowStepLoop<INPUT, DATA, RESULT>;
};

/**
 * Creates a do-while loop step for the workflow.
 */
export function andDoWhile<INPUT, DATA, RESULT>(
  config: WorkflowStepLoopConfig<INPUT, DATA, RESULT>,
) {
  return createLoopStep("dowhile", config);
}

/**
 * Creates a do-until loop step for the workflow.
 */
export function andDoUntil<INPUT, DATA, RESULT>(
  config: WorkflowStepLoopConfig<INPUT, DATA, RESULT>,
) {
  return createLoopStep("dountil", config);
}
