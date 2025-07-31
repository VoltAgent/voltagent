import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { defaultStepConfig } from "../internal/utils";
import type { WorkflowStepTap, WorkflowStepTapConfig } from "./types";
import type { WorkflowExecuteContext } from "../internal/types";
import { getGlobalLogger } from "../../logger";

/**
 * A safe way to tap into the workflow state without affecting the result.
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andTap({
 *     id: "log-processing",
 *     execute: async ({ data }) => {
 *       console.log("Processing data:", data);
 *     }
 *   }),
 *   andThen({
 *     id: "process-data",
 *     execute: async ({ data }) => {
 *       // data is unchanged from the tap step
 *       return { ...data, processed: true };
 *     }
 *   })
 * );
 * ```
 *
 * @param config - Configuration object with execute function and metadata
 * @returns A workflow step that executes the function
 */
export function andTap<
  INPUT,
  DATA,
  RESULT,
  SUSPEND_DATA = DangerouslyAllowAny,
  RESUME_DATA = DangerouslyAllowAny,
>({
  execute,
  inputSchema,
  suspendSchema,
  resumeSchema,
  ...config
}: WorkflowStepTapConfig<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>) {
  return {
    ...defaultStepConfig(config),
    type: "tap",
    inputSchema,
    suspendSchema,
    resumeSchema,
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>) => {
      try {
        await execute(context);
      } catch (error) {
        getGlobalLogger()
          .child({ component: "workflow", stepType: "tap" })
          .error("Error executing tap step", { error: error });
      }
      return context.data as DATA;
    },
  } satisfies WorkflowStepTap<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
}
