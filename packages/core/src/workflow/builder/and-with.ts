import { match } from "ts-pattern";
import type { ConditionalWith } from "../internal/pattern";
import type { WorkflowFunc, WorkflowStep, WorkflowStepConditionalWith } from "../types";
import { matchStep } from "./helpers";

/**
 * Creates a step with pattern matching for the workflow
 * @param patterns - The ts-pattern pattern(s) to match against
 * @param stepInput - Either a workflow step or an agent
 * @returns A workflow step with pattern matching
 */
export function andWith<DATA, RESULT>(
  patterns: ConditionalWith<DATA, RESULT>,
  stepInput: WorkflowStep<DATA, RESULT> | WorkflowFunc<DATA, RESULT>,
): WorkflowStepConditionalWith<DATA, RESULT> {
  const step = matchStep<DATA, RESULT>(stepInput);
  return {
    type: "conditional-with",
    condition: patterns,
    execute: async (data) => {
      const result = await match(data)
        .with(patterns, async (d) => {
          return await step.execute(d);
        })
        .otherwise(async (d) => {
          return d;
        });
      return result;
    },
  } satisfies WorkflowStepConditionalWith<DATA, RESULT>;
}
