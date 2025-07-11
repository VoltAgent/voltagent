import { devLogger } from "@voltagent/internal/dev";
import { defaultStepConfig } from "../internal/utils";
import type { WorkflowStepTap, WorkflowStepTapConfig } from "./types";

/**
 * A safe way to tap into the workflow state without affecting the result.
 * @param fn - The async function to execute
 * @returns A workflow step that executes the function
 */
export function andTap<INPUT, DATA, RESULT>({
  execute,
  ...config
}: WorkflowStepTapConfig<INPUT, DATA, RESULT>) {
  return {
    ...defaultStepConfig(config),
    type: "tap",
    execute: async (data, context) => {
      try {
        await execute(data, context);
      } catch (error) {
        devLogger.error("Error executing tap step", error);
      }
      return data as DATA;
    },
  } satisfies WorkflowStepTap<INPUT, DATA, RESULT>;
}
