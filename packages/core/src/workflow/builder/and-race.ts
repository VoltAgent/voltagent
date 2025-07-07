import type { InternalAnyStep, InternalInferStepsResult, WorkflowStepParallelRace } from "../types";
import { matchStep } from "./helpers";

/**
 * Creates a race execution step that runs multiple steps simultaneously
 * @param steps - Array of workflow steps to execute in parallel
 * @returns A workflow step that executes all steps and returns the first completed result
 */
export function andRace<
  DATA,
  RESULT,
  STEPS extends ReadonlyArray<InternalAnyStep<DATA, RESULT>> = ReadonlyArray<
    InternalAnyStep<DATA, RESULT>
  >,
  INFERRED_RESULT = InternalInferStepsResult<STEPS>[number],
>(steps: STEPS): WorkflowStepParallelRace<DATA, INFERRED_RESULT> {
  return {
    type: "parallel-race",
    // @ts-expect-error - need to fix but upstream types work
    steps,
    execute: async (data: DATA) => {
      const promises = steps.map((step) => matchStep(step).execute(data));
      return (await Promise.race(promises)) as INFERRED_RESULT;
    },
  };
}
