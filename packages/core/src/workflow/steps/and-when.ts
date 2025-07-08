import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import type { WorkflowStepConditionalWhen, WorkflowStepConditionalWhenConfig } from "./types";

/**
 * Creates a conditional step for the workflow that executes only when a condition is met
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andWhen({
 *     condition: (data) => data.userType === "admin",
 *     stepOrFunc: andThen(async (data) => {
 *       return { ...data, permissions: ["read", "write", "delete"] };
 *     })
 *   }),
 *   andWhen({
 *       condition: (data) => data.value > 100,
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
 * @param stepOrFunc - Either a workflow step or an agent to execute when the condition is true
 * @returns A conditional workflow step that executes the step only when the condition evaluates to true
 */
export function andWhen<INPUT, DATA, RESULT>({
  condition,
  step,
  ...config
}: WorkflowStepConditionalWhenConfig<INPUT, DATA, RESULT>) {
  const finalStep = matchStep<INPUT, DATA, RESULT>(step);
  return {
    ...defaultStepConfig(config),
    type: "conditional-when",
    condition,
    execute: async (data, state) => {
      if (await condition(data, state)) {
        return await finalStep.execute(data, state);
      }
      return data;
    },
  } satisfies WorkflowStepConditionalWhen<INPUT, DATA, RESULT>;
}
