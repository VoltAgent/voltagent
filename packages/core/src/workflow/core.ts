import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import { createWorkflowStateManager } from "./internal/state-manager";
import type { WorkflowHooks, WorkflowStep } from "./types";

/**
 * Input for running a workflow
 */
export type WorkflowPayload<INPUT> = {
  /** Initial data to start the workflow with */
  initialData: INPUT;
  /** User ID for context */
  userId: string;
};

/**
 * Configuration for creating a workflow
 */
export type WorkflowConfig<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
> = {
  /** Unique identifier for the workflow */
  id: string;
  /** Human-readable name for the workflow */
  name: string;
  /** Description of what the workflow does */
  purpose: string;
  /** Schema for the input data */
  input: INPUT_SCHEMA;
  /** Schema for the result data */
  result: RESULT_SCHEMA;
  /** Hooks for the workflow */
  hooks?: WorkflowHooks<z.infer<INPUT_SCHEMA>, z.infer<RESULT_SCHEMA>>;
};

/**
 * A workflow instance that can be executed
 */
export type Workflow<INPUT_SCHEMA extends z.ZodTypeAny, RESULT_SCHEMA extends z.ZodTypeAny> = {
  /** Unique identifier for the workflow */
  id: string;
  /** Human-readable name for the workflow */
  name: string;
  /** Description of what the workflow does */
  purpose: string;
  /** Array of steps to execute in order */
  steps: BaseStep[];
  /** Execute the workflow with the given input */
  run: (input: z.infer<INPUT_SCHEMA>) => Promise<{
    executionId: string;
    startAt: Date;
    endAt: Date;
    status: "completed";
    result: z.infer<RESULT_SCHEMA>;
  }>;
};

/**
 * Creates a workflow from multiple and* functions
 * @param config - The workflow configuration
 * @param steps - Variable number of and* functions to execute
 * @returns A configured workflow instance
 */
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
  S14,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, S14>,
  s15: WorkflowStep<S14, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
  S14,
  S15,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, S14>,
  s15: WorkflowStep<S14, S15>,
  s16: WorkflowStep<S15, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
  S14,
  S15,
  S16,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, S14>,
  s15: WorkflowStep<S14, S15>,
  s16: WorkflowStep<S15, S16>,
  s17: WorkflowStep<S16, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
  S14,
  S15,
  S16,
  S17,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, S14>,
  s15: WorkflowStep<S14, S15>,
  s16: WorkflowStep<S15, S16>,
  s17: WorkflowStep<S16, S17>,
  s18: WorkflowStep<S17, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
  S14,
  S15,
  S16,
  S17,
  S18,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, S14>,
  s15: WorkflowStep<S14, S15>,
  s16: WorkflowStep<S15, S16>,
  s17: WorkflowStep<S16, S17>,
  s18: WorkflowStep<S17, S18>,
  s19: WorkflowStep<S18, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
  S7,
  S8,
  S9,
  S10,
  S11,
  S12,
  S13,
  S14,
  S15,
  S16,
  S17,
  S18,
  S19,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<z.infer<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<S1, S2>,
  s3: WorkflowStep<S2, S3>,
  s4: WorkflowStep<S3, S4>,
  s5: WorkflowStep<S4, S5>,
  s6: WorkflowStep<S5, S6>,
  s7: WorkflowStep<S6, S7>,
  s8: WorkflowStep<S7, S8>,
  s9: WorkflowStep<S8, S9>,
  s10: WorkflowStep<S9, S10>,
  s11: WorkflowStep<S10, S11>,
  s12: WorkflowStep<S11, S12>,
  s13: WorkflowStep<S12, S13>,
  s14: WorkflowStep<S13, S14>,
  s15: WorkflowStep<S14, S15>,
  s16: WorkflowStep<S15, S16>,
  s17: WorkflowStep<S16, S17>,
  s18: WorkflowStep<S17, S18>,
  s19: WorkflowStep<S18, S19>,
  s20: WorkflowStep<S19, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
>(
  { id, name, purpose, hooks }: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  ...steps: ReadonlyArray<BaseStep>
) {
  return {
    id,
    name,
    purpose,
    steps: steps as BaseStep[],
    run: async (input: z.infer<INPUT_SCHEMA>) => {
      const stateManager = createWorkflowStateManager();

      stateManager.start(input);
      for (const step of steps as BaseStep[]) {
        try {
          await hooks?.onStepStart?.(stateManager.state);
          const result = await step.execute(stateManager.state.data);
          // Update the state with the result
          stateManager.update({
            data: result,
            result: result,
          });
          await hooks?.onStepEnd?.(stateManager.state);
        } catch (error) {
          stateManager.fail(error);
          await hooks?.onEnd?.(stateManager.state);
          throw error;
        }
      }
      const finalState = stateManager.finish();
      await hooks?.onEnd?.(stateManager.state);
      return {
        executionId: finalState.executionId,
        startAt: finalState.startAt,
        endAt: finalState.endAt,
        status: finalState.status,
        result: finalState.result as z.infer<RESULT_SCHEMA>,
      };
    },
  } satisfies Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
}

/*
|------------------
| Internals
|------------------
*/

/**
 * Base type for workflow steps to avoid repetition
 */
type BaseStep = WorkflowStep<DangerouslyAllowAny, DangerouslyAllowAny>;
