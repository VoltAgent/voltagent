import { match } from "ts-pattern";
import type { InternalAnyWorkflowStep } from "../internal/types";

/**
 * Matches a step or agent to the appropriate step type
 * @param stepOrAgent - Either a workflow step or an agent
 * @returns The matched workflow step
 */
export function matchStep<INPUT, DATA, RESULT>(
  stepOrAgent: InternalAnyWorkflowStep<INPUT, DATA, RESULT>,
) {
  return match(stepOrAgent)
    .with({ type: "agent" }, (agentStep) => agentStep)
    .with({ type: "func" }, (funcStep) => funcStep)
    .with({ type: "conditional-when" }, (condStep) => condStep)
    .with({ type: "parallel-all" }, (allStep) => allStep)
    .with({ type: "parallel-race" }, (raceStep) => raceStep)
    .otherwise(() => {
      throw new Error("Invalid step or agent");
    });
}
