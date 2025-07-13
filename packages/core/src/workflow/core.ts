import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import { createWorkflowStateManager } from "./internal/state";
import type { InternalBaseWorkflowInputSchema } from "./internal/types";
import { convertWorkflowStateToParam } from "./internal/utils";
import type { WorkflowStep } from "./steps";
import type { Workflow, WorkflowConfig, WorkflowInput, WorkflowResult } from "./types";
import { WorkflowRegistry } from "./registry";
import type { WorkflowExecutionContext } from "./context";
import {
  createWorkflowStartEvent,
  createWorkflowSuccessEvent,
  createWorkflowErrorEvent,
  publishWorkflowEvent,
} from "./event-utils";

/**
 * Creates a workflow from multiple and* functions
 * @param config - The workflow configuration
 * @param steps - Variable number of and* functions to execute
 * @returns A configured workflow instance
 */
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<
    WorkflowInput<INPUT_SCHEMA>,
    WorkflowInput<INPUT_SCHEMA>,
    z.infer<RESULT_SCHEMA>
  >,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  S1,
  S2,
  S3,
  S4,
  S5,
  S6,
>(
  config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, S14>,
  s15: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S14, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, S14>,
  s15: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S14, S15>,
  s16: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S15, WorkflowResult<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, S14>,
  s15: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S14, S15>,
  s16: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S15, S16>,
  s17: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S16, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, S14>,
  s15: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S14, S15>,
  s16: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S15, S16>,
  s17: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S16, S17>,
  s18: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S17, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, S14>,
  s15: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S14, S15>,
  s16: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S15, S16>,
  s17: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S16, S17>,
  s18: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S17, S18>,
  s19: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S18, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
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
  s1: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, WorkflowInput<INPUT_SCHEMA>, S1>,
  s2: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S1, S2>,
  s3: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S2, S3>,
  s4: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S3, S4>,
  s5: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S4, S5>,
  s6: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S5, S6>,
  s7: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S6, S7>,
  s8: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S7, S8>,
  s9: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S8, S9>,
  s10: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S9, S10>,
  s11: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S10, S11>,
  s12: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S11, S12>,
  s13: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S12, S13>,
  s14: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S13, S14>,
  s15: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S14, S15>,
  s16: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S15, S16>,
  s17: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S16, S17>,
  s18: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S17, S18>,
  s19: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S18, S19>,
  s20: WorkflowStep<WorkflowInput<INPUT_SCHEMA>, S19, z.infer<RESULT_SCHEMA>>,
): Workflow<INPUT_SCHEMA, RESULT_SCHEMA>;
export function createWorkflow<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
>(
  { id, name, purpose, hooks, input }: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>,
  ...steps: ReadonlyArray<BaseStep>
) {
  return {
    id,
    name,
    purpose: purpose ?? "No purpose provided",
    steps: steps as BaseStep[],
    inputSchema: input,
    run: async (input: WorkflowInput<INPUT_SCHEMA>) => {
      // Register execution with workflow registry first to get the correct execution ID
      const workflowRegistry = WorkflowRegistry.getInstance();
      let historyEntry: any;
      let executionId = crypto.randomUUID(); // fallback ID

      try {
        historyEntry = await workflowRegistry.recordWorkflowExecutionStart(id, name, input, {
          userId: (input as { userId?: string }).userId,
          conversationId: (input as { conversationId?: string }).conversationId,
        });
        // Use the execution ID from registry to ensure consistency
        executionId = historyEntry.id;
      } catch (registrationError) {
        console.warn(
          "Workflow not registered, proceeding without history tracking:",
          registrationError,
        );
      }

      // Initialize workflow execution context with the correct execution ID
      const executionContext: WorkflowExecutionContext = {
        workflowId: id,
        executionId: executionId,
        workflowName: name,
        userContext: new Map(),
        isActive: true,
        startTime: new Date(),
        currentStepIndex: 0,
        steps: [],
        signal: undefined, // TODO: Extract signal from input if available
        historyEntry: historyEntry,
      };

      // Workflow start event
      const workflowStartEvent = createWorkflowStartEvent(executionContext, input);

      try {
        await publishWorkflowEvent(workflowStartEvent, executionContext);
      } catch (eventError) {
        console.warn("Failed to publish workflow start event:", eventError);
      }

      const stateManager = createWorkflowStateManager<
        WorkflowInput<INPUT_SCHEMA>,
        WorkflowResult<RESULT_SCHEMA>
      >();

      // Enhanced state with workflow context
      stateManager.start(input);

      try {
        for (const [index, step] of (steps as BaseStep[]).entries()) {
          executionContext.currentStepIndex = index;

          await hooks?.onStepStart?.(stateManager.state);

          const result = await step.execute(
            stateManager.state.data,
            convertWorkflowStateToParam(stateManager.state, executionContext),
          );

          stateManager.update({
            data: result,
            result: result,
          });

          await hooks?.onStepEnd?.(stateManager.state);
        }

        const finalState = stateManager.finish();

        // Workflow success event
        const workflowSuccessEvent = createWorkflowSuccessEvent(
          executionContext,
          finalState.result,
          workflowStartEvent.id,
        );

        try {
          await publishWorkflowEvent(workflowSuccessEvent, executionContext);
        } catch (eventError) {
          console.warn("Failed to publish workflow success event:", eventError);
        }

        if (historyEntry) {
          try {
            workflowRegistry.recordWorkflowExecutionEnd(
              executionContext.executionId,
              "completed",
              finalState.result,
            );
          } catch (registrationError) {
            console.warn("Failed to record workflow completion:", registrationError);
          }
        }

        await hooks?.onEnd?.(stateManager.state);

        return {
          executionId: finalState.executionId,
          startAt: finalState.startAt,
          endAt: finalState.endAt,
          status: finalState.status,
          result: finalState.result as z.infer<RESULT_SCHEMA>,
        };
      } catch (error) {
        // Workflow error event
        const workflowErrorEvent = createWorkflowErrorEvent(
          executionContext,
          error,
          workflowStartEvent.id,
        );

        try {
          await publishWorkflowEvent(workflowErrorEvent, executionContext);
        } catch (eventError) {
          console.warn("Failed to publish workflow error event:", eventError);
        }

        if (historyEntry) {
          try {
            workflowRegistry.recordWorkflowExecutionEnd(
              executionContext.executionId,
              "error",
              undefined,
              error,
            );
          } catch (registrationError) {
            console.warn("Failed to record workflow failure:", registrationError);
          }
        }

        stateManager.fail(error);
        await hooks?.onEnd?.(stateManager.state);
        throw error;
      }
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
type BaseStep = WorkflowStep<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>;
