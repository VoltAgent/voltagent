import type {
  InternalAnyWorkflowStep,
  InternalWorkflowFunc,
  InternalWorkflowStateParam,
} from "../internal/types";
import { matchStep } from "./helpers";
import type { WorkflowStepConditionalWhen } from "./types";

/**
 * Creates a conditional step for the workflow that executes only when a condition is met
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andWhen(
 *     (data) => data.userType === "admin",
 *     andThen(async (data) => {
 *       return { ...data, permissions: ["read", "write", "delete"] };
 *     })
 *   ),
 *   andWhen(
 *     (data) => data.value > 100,
 *     andAgent(
 *       (data) => `Process high value transaction: ${data.value}`,
 *       agent,
 *       { schema: z.object({ processed: z.boolean() }) }
 *     )
 *   )
 * );
 * ```
 *
 * @param condition - Function that determines if the step should execute based on the input data
 * @param stepInput - Either a workflow step or an agent to execute when the condition is true
 * @returns A conditional workflow step that executes the step only when the condition evaluates to true
 */
export function andWhen<INPUT, DATA, RESULT>(
  condition: InternalWorkflowFunc<INPUT, DATA, boolean>,
  stepInput: InternalAnyWorkflowStep<INPUT, DATA, RESULT>,
) {
  const step = matchStep<INPUT, DATA, RESULT>(stepInput);
  return {
    type: "conditional-when",
    condition,
    execute: async (data, state) => {
      if (await condition(data, state)) {
        return await step.execute(data, state);
      }
      return data;
    },
  } satisfies WorkflowStepConditionalWhen<INPUT, DATA, RESULT>;
}
