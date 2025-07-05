import type { WorkflowFunc, WorkflowStep, WorkflowStepConditionalWhen } from "../types";
import { matchStep } from "./helpers";

/**
 * Creates a conditional step for the workflow
 * @param condition - Function that determines if the step should execute
 * @param stepInput - Either a workflow step or an agent
 * @returns A conditional workflow step
 */
export function andWhen<DATA, RESULT>(
  condition: (data: DATA) => boolean,
  stepInput: WorkflowStep<DATA, RESULT> | WorkflowFunc<DATA, RESULT>,
) {
  const step = matchStep<DATA, RESULT>(stepInput);
  return {
    type: "conditional-when",
    condition,
    execute: async (data) => {
      if (condition(data)) {
        return await step.execute(data);
      }
      return data;
    },
  } satisfies WorkflowStepConditionalWhen<DATA, RESULT>;
}
