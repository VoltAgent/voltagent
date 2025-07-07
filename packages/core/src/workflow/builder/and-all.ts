import type { InternalAnyStep, InternalInferStepsResult, WorkflowStepParallelAll } from "../types";
import { matchStep } from "./helpers";

/**
 * Creates a parallel execution step that runs multiple steps simultaneously
 * @param steps - Array of workflow steps to execute in parallel
 * @returns A workflow step that executes all steps and returns their results as an array
 */
export function andAll<
  DATA,
  RESULT,
  STEPS extends ReadonlyArray<InternalAnyStep<DATA, RESULT>>,
  INFERRED_RESULT = InternalInferStepsResult<STEPS>,
>(steps: STEPS): WorkflowStepParallelAll<DATA, INFERRED_RESULT> {
  return {
    type: "parallel-all",
    // @ts-expect-error - need to fix but upstream types work
    steps,
    execute: async (data: DATA) => {
      const promises = steps.map((step) => matchStep(step).execute(data));
      return (await Promise.all(promises)) as INFERRED_RESULT;
    },
  };
}
