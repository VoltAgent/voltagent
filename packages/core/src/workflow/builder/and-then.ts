import type { WorkflowStepFunc } from "../types";
import { createFuncStep } from "./helpers";

/**
 * Creates an async function step for the workflow
 * @param fn - The async function to execute
 * @returns A workflow step that executes the function
 */
export function andThen<DATA, RESULT>(fn: (data: DATA) => Promise<RESULT>) {
  return createFuncStep<DATA, RESULT>(fn) satisfies WorkflowStepFunc<DATA, RESULT>;
}
