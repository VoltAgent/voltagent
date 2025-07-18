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
 *     execute: async (data) => {
 *       const processed = await someAsyncOperation(data.value);
 *       return { ...data, processed };
 *     },
 *   }),
 * );
 * const w = createWorkflow(
 *   andThen({
 *     execute: async (data) => {
 *       const processed = await someAsyncOperation(data.value);
 *       return { ...data, processed };
 *     },
 *   }),
 *   andWorkflow(nestedWorkflow)
 * );
 * ```
 *
 * @param fn - The async function to execute with the workflow data
 * @returns A workflow step that executes the function and returns the result
 */
export function andWorkflow<INPUT, DATA, RESULT>(workflow: InternalWorkflow<INPUT, DATA, RESULT>) {
  return {
    type: "workflow",
    workflow,
    id: workflow.id,
    name: workflow.name,
    purpose: workflow.purpose,
    execute: async (context) => {
      const { result } = await workflow.run(context.data, {
        active: context.state.active,
        executionId: context.state.executionId,
        conversationId: context.state.conversationId,
        userId: context.state.userId,
        userContext: context.state.userContext,
      });
      return result;
    },
  } as WorkflowStepWorkflow<INPUT, DATA, RESULT>;
}
