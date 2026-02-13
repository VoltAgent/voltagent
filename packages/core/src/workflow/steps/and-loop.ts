import type { Span } from "@opentelemetry/api";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import { throwIfAborted } from "./signal";
import type { WorkflowStepLoop, WorkflowStepLoopConfig, WorkflowStepLoopSteps } from "./types";

type LoopType = "dowhile" | "dountil";
type LoopStepMetadata = { id: string; name?: string; purpose?: string; retries?: number };

function splitLoopConfig<INPUT, DATA, RESULT>(config: WorkflowStepLoopConfig<INPUT, DATA, RESULT>) {
  if ("step" in config) {
    const { step: _step, condition, ...stepConfig } = config;
    return { condition, stepConfig: stepConfig as LoopStepMetadata };
  }

  const { steps: _steps, condition, ...stepConfig } = config;
  return { condition, stepConfig: stepConfig as LoopStepMetadata };
}

function getLoopSteps<INPUT, DATA, RESULT>(
  config: WorkflowStepLoopConfig<INPUT, DATA, RESULT>,
): WorkflowStepLoopSteps<INPUT, DATA, RESULT> {
  if ("steps" in config && config.steps) {
    if (config.steps.length === 0) {
      throw new Error("andDoWhile/andDoUntil requires at least one step");
    }
    return config.steps;
  }

  return [config.step];
}

const createLoopStep = <INPUT, DATA, RESULT>(
  loopType: LoopType,
  config: WorkflowStepLoopConfig<INPUT, DATA, RESULT>,
) => {
  const { condition, stepConfig } = splitLoopConfig(config);
  const loopSteps = getLoopSteps(config);
  const resolvedSteps = loopSteps.map((loopStep) => matchStep(loopStep));
  const firstStep = loopSteps[0];

  if (!firstStep) {
    throw new Error("andDoWhile/andDoUntil requires at least one step");
  }

  return {
    ...defaultStepConfig(stepConfig),
    type: "loop",
    loopType,
    step: firstStep,
    steps: loopSteps,
    condition,
    execute: async (context) => {
      const { state } = context;
      const traceContext = state.workflowContext?.traceContext;
      let currentData = context.data as DATA | RESULT;
      let iteration = 0;

      const runResolvedStep = async (stepIndex: number) => {
        const resolvedStep = resolvedSteps[stepIndex];
        if (!resolvedStep) {
          return;
        }

        let childSpan: Span | undefined;
        if (traceContext) {
          const isSingleLoopStep = resolvedSteps.length === 1;
          childSpan = traceContext.createStepSpan(
            iteration * resolvedSteps.length + stepIndex,
            resolvedStep.type,
            resolvedStep.name ||
              resolvedStep.id ||
              (isSingleLoopStep
                ? `Loop ${iteration + 1}`
                : `Loop ${iteration + 1}.${stepIndex + 1}`),
            {
              parentStepId: stepConfig.id,
              parallelIndex: isSingleLoopStep ? iteration : stepIndex,
              input: currentData,
              attributes: {
                "workflow.step.loop": true,
                "workflow.step.parent_type": "loop",
                "workflow.step.loop_type": loopType,
                "workflow.step.loop_iteration": iteration,
                "workflow.step.loop_step_index": stepIndex,
              },
            },
          );
        }

        const executeStep = () =>
          resolvedStep.execute({
            ...context,
            data: currentData as never,
            state: {
              ...state,
              workflowContext: undefined,
            },
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
      };

      while (true) {
        throwIfAborted(state.signal);

        for (let stepIndex = 0; stepIndex < resolvedSteps.length; stepIndex += 1) {
          throwIfAborted(state.signal);
          await runResolvedStep(stepIndex);
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
