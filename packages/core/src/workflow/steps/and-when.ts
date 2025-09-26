import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import type { WorkflowStepConditionalWhen, WorkflowStepConditionalWhenConfig } from "./types";

/**
 * Creates a conditional step for the workflow that executes only when a condition is met
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andWhen({
 *     id: "admin-permissions",
 *     condition: async ({ data }) => data.userType === "admin",
 *     execute: async ({ data }) => {
 *       return { ...data, permissions: ["read", "write", "delete"] };
 *     }
 *   }),
 *   andWhen({
 *     id: "high-value-processing",
 *     condition: async ({ data }) => data.value > 100,
 *     step: andAgent(
 *       ({ data }) => `Process high value transaction: ${data.value}`,
 *       agent,
 *       { schema: z.object({ processed: z.boolean() }) }
 *     )
 *   })
 * );
 * ```
 *
 * @param config - Configuration object with condition, step/execute function, and metadata
 * @returns A conditional workflow step that executes the step only when the condition evaluates to true
 */
export function andWhen<INPUT, DATA, RESULT>({
  condition,
  step,
  inputSchema,
  outputSchema,
  suspendSchema,
  resumeSchema,
  ...config
}: WorkflowStepConditionalWhenConfig<INPUT, DATA, RESULT>) {
  const finalStep = matchStep<INPUT, DATA, RESULT>(step);
  return {
    ...defaultStepConfig(config),
    type: "conditional-when",
    condition,
    originalCondition: condition, // ✅ Store original condition for serialization
    inputSchema,
    outputSchema,
    suspendSchema,
    resumeSchema,
    execute: async (context) => {
      const { data, state } = context;
      // No workflow context, execute without events
      if (!state.workflowContext) {
        if (await condition(context)) {
          return await finalStep.execute(context);
        }
        return data;
      }

      // Step events removed - now handled by OpenTelemetry spans

      try {
        const conditionMet = await condition(context);
        let result: any;

        if (conditionMet) {
          // ✅ FIXED: Execute nested step WITHOUT workflow context to prevent duplicate events
          // Wrapper conditional step already publishes the appropriate events
          const nestedContext = {
            ...context,
            state: {
              ...state,
              workflowContext: undefined, // ❌ Remove workflow context to prevent nested event publishing
            },
          };
          result = await finalStep.execute(nestedContext);
        } else {
          // Condition not met, return original data
          result = data;
        }

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
  } as WorkflowStepConditionalWhen<INPUT, DATA, RESULT>;
}
