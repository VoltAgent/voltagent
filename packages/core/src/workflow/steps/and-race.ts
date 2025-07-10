import type {
  InternalAnyWorkflowStep,
  InternalInferWorkflowStepsResult,
  InternalWorkflowStepConfig,
} from "../internal/types";
import { defaultStepConfig } from "../internal/utils";
import { matchStep } from "./helpers";
import type { WorkflowStepParallelRace } from "./types";

/**
 * Creates a race execution step that runs multiple steps simultaneously and returns the first completed result
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andRace([
 *     andThen(async (data) => {
 *       // Fast operation
 *       const cacheResult = await checkCache(data.query);
 *       return { source: "cache", result: cacheResult };
 *     }),
 *     andThen(async (data) => {
 *       // Slower operation
 *       const dbResult = await queryDatabase(data.query);
 *       return { source: "database", result: dbResult };
 *     }),
 *     andAgent(
 *       (data) => `Generate fallback response for: ${data.query}`,
 *       agent,
 *       { schema: z.object({ source: z.literal("ai"), result: z.string() }) }
 *     )
 *   ]),
 *   andThen(async (data) => {
 *     // data is the result from whichever step completed first
 *     return { finalResult: data.result, source: data.source };
 *   })
 * );
 * ```
 *
 * @param steps - Array of workflow steps to execute in parallel
 * @returns A workflow step that executes all steps simultaneously and returns the result from the first step to complete
 */
export function andRace<
  INPUT,
  DATA,
  RESULT,
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>,
  INFERRED_RESULT = InternalInferWorkflowStepsResult<STEPS>[number],
>({
  steps,
  ...config
}: InternalWorkflowStepConfig<{
  steps: STEPS;
}>) {
  return {
    ...defaultStepConfig(config),
    type: "parallel-race",
    steps: steps as unknown as InternalAnyWorkflowStep<INPUT, DATA, INFERRED_RESULT>[],
    execute: async (data, state) => {
      const promises = steps.map((step) => matchStep(step).execute(data, state));
      return (await Promise.race(promises)) as INFERRED_RESULT;
    },
  } satisfies WorkflowStepParallelRace<INPUT, DATA, INFERRED_RESULT>;
}
