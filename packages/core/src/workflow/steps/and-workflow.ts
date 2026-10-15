import type { WorkflowExecuteContext } from "../internal/types";
import type { InternalWorkflow, WorkflowStepWorkflow } from "./types";

/**
 * Creates an async function step for the workflow
 *
 * Child runs use their own execution identity and nest under the current step's trace span.
 * Suspended child runs do not automatically suspend/resume their parent.
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
      const execution = await workflow.run(context.data, {
        conversationId: context.state.conversationId,
        userId: context.state.userId,
        context: context.state.context,
        parentSpan: context.state.workflowContext?.currentStepSpan,
      });
      if (execution.status !== "completed") {
        throw execution.error instanceof Error
          ? execution.error
          : new Error(`Nested workflow ${workflow.id} ${execution.status}`);
      }
      return execution.result;
    },
  } as WorkflowStepWorkflow<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
}
