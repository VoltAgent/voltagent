import { P, match } from "ts-pattern";
import type { InternalAnyStep, WorkflowFunc, WorkflowStepFunc } from "../types";

/**
 * Matches a step or agent to the appropriate step type
 * @param stepOrAgent - Either a workflow step or an agent
 * @returns The matched workflow step
 */
export function matchStep<DATA, RESULT>(stepOrAgent: InternalAnyStep<DATA, RESULT>) {
  return match(stepOrAgent)
    .with({ type: "agent" }, (agentStep) => agentStep)
    .with({ type: "func" }, (funcStep) => funcStep)
    .with({ type: "conditional-when" }, (condStep) => condStep)
    .with({ type: "conditional-with" }, (withInputStep) => withInputStep)
    .with({ type: "parallel-all" }, (allStep) => allStep)
    .with({ type: "parallel-race" }, (raceStep) => raceStep)
    .with(P.instanceOf(Function), (fn) => createFuncStep<DATA, RESULT>(fn))
    .otherwise(() => {
      throw new Error("Invalid step or agent");
    });
}

/**
 * Creates a function step with the given async function
 * @param fn - The async function to execute
 * @returns A function step
 */
export function createFuncStep<DATA, RESULT>(fn: WorkflowFunc<DATA, RESULT>) {
  return {
    type: "func",
    fn,
    execute: fn,
  } satisfies WorkflowStepFunc<DATA, RESULT>;
}
