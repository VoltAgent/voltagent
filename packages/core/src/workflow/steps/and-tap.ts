import { devLogger } from "@voltagent/internal/dev";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { defaultStepConfig } from "../internal/utils";
import type { WorkflowStepTap, WorkflowStepTapConfig } from "./types";
import type { WorkflowExecuteContext } from "../internal/types";

/**
 * A safe way to tap into the workflow state without affecting the result.
 * @param fn - The async function to execute
 * @returns A workflow step that executes the function
 */
export function andTap<
  INPUT,
  DATA,
  RESULT,
  SUSPEND_DATA = DangerouslyAllowAny,
  RESUME_DATA = DangerouslyAllowAny,
>({ execute, ...config }: WorkflowStepTapConfig<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>) {
  return {
    ...defaultStepConfig(config),
    type: "tap",
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>) => {
      try {
        await execute(context);
      } catch (error) {
        devLogger.error("Error executing tap step", error);
      }
      return context.data as DATA;
    },
  } satisfies WorkflowStepTap<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
}
