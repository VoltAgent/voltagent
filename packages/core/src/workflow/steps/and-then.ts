import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { WorkflowExecuteContext } from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import type { WorkflowStepFunc, WorkflowStepFuncConfig } from "./types";

/**
 * Creates an async function step for the workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andThen({
 *     id: "process-data",
 *     execute: async ({ data }) => {
 *       const processed = await someAsyncOperation(data.value);
 *       return { ...data, processed };
 *     }
 *   }),
 *   andThen({
 *     id: "format-result",
 *     execute: async ({ data }) => {
 *       return { result: `Processed: ${data.processed}` };
 *     }
 *   })
 * );
 * ```
 *
 * @param config - Configuration object with execute function and metadata
 * @returns A workflow step that executes the function and returns the result
 */
export function andThen<
  INPUT,
  DATA,
  RESULT,
  SUSPEND_DATA = DangerouslyAllowAny,
  RESUME_DATA = DangerouslyAllowAny,
>({
  execute,
  inputSchema,
  outputSchema,
  suspendSchema,
  resumeSchema,
  ...config
}: WorkflowStepFuncConfig<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>) {
  return {
    ...defaultStepConfig(config),
    type: "func",
    inputSchema,
    outputSchema,
    suspendSchema,
    resumeSchema,
    originalExecute: execute, // ✅ Store original function for serialization
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>) => {
      const { state } = context;
      // No workflow context, execute without events
      if (!state.workflowContext) {
        return await execute(context);
      }

      // Step events removed - now handled by OpenTelemetry spans

      try {
        const result = await execute(context);

        // Step events removed - now handled by OpenTelemetry spans

        return result;
      } catch (error) {
        // Check if this is a suspension, not an error
        if (
          error instanceof Error &&
          (error.message === "WORKFLOW_SUSPENDED" || error.message === "WORKFLOW_CANCELLED")
        ) {
          // For suspension, we don't publish an error event
          // The workflow core will handle publishing the suspend event
          throw error;
        }

        // Step events removed - now handled by OpenTelemetry spans

        throw error;
      }
    },
  } as WorkflowStepFunc<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
}
