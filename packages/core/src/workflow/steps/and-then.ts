import type { InternalWorkflowFunc } from "../internal/types";
import { createFuncStep } from "./helpers";
import type { WorkflowStepFunc } from "./types";

/**
 * Creates an async function step for the workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andThen(async (data) => {
 *     const processed = await someAsyncOperation(data.value);
 *     return { ...data, processed };
 *   }),
 *   andThen(async (data) => {
 *     return { result: `Processed: ${data.processed}` };
 *   })
 * );
 * ```
 *
 * @param fn - The async function to execute with the workflow data
 * @returns A workflow step that executes the function and returns the result
 */
export function andThen<INPUT, DATA, RESULT>(fn: InternalWorkflowFunc<INPUT, DATA, RESULT>) {
  return createFuncStep<INPUT, DATA, RESULT>(fn) satisfies WorkflowStepFunc<INPUT, DATA, RESULT>;
}
