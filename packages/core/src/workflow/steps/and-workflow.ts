import type { WorkflowExecuteContext } from "../internal/types";
import type { InternalWorkflow, WorkflowStepWorkflow } from "./types";

/**
 * Creates an async function step for the workflow
 *
 * EXPERIMENTAL: This step is experimental and doesn't directly hook into or support the Observability
 *
 * @example
 * ```ts
 * const nestedWorkflow = createWorkflow(
 *   andThen({
 *     id: "nested-process",
 *     execute: async ({ data }) => {
 *       const processed = await someAsyncOperation(data.value);
 *       return { ...data, processed };
 *     }
 *   })
 * );
 *
 * const w = createWorkflow(
 *   andThen({
 *     id: "main-process",
 *     execute: async ({ data }) => {
 *       const processed = await someAsyncOperation(data.value);
 *       return { ...data, processed };
 *     }
 *   }),
 *   andWorkflow(nestedWorkflow)
 * );
 * ```
 *
 * @param workflow - The workflow to execute as a step
 * @returns A workflow step that executes the function and returns the result
 */
export function andWorkflow<INPUT, DATA, RESULT, SUSPEND_DATA = any, RESUME_DATA = any>(
  workflow: InternalWorkflow<INPUT, DATA, RESULT>,
) {
  return {
    type: "workflow",
    workflow,
    id: workflow.id,
    name: workflow.name,
    purpose: workflow.purpose,
    execute: async (context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>) => {
      const { result } = await workflow.run(context.data, {
        active: context.state.active,
        executionId: context.state.executionId,
        conversationId: context.state.conversationId,
        userId: context.state.userId,
        userContext: context.state.userContext,
      });
      return result;
    },
  } as WorkflowStepWorkflow<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
}
