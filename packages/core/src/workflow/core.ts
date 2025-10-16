import { type Logger, safeStringify } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { z } from "zod";
import type { UsageInfo } from "../agent/providers";
import { LoggerProxy } from "../logger";
import { Memory as MemoryV2 } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { type VoltAgentObservability, createVoltAgentObservability } from "../observability";
import { AgentRegistry } from "../registries/agent-registry";
import { randomUUID } from "../utils/id";
import type { WorkflowExecutionContext } from "./context";
import { createWorkflowStateManager } from "./internal/state";
import type { InternalBaseWorkflowInputSchema } from "./internal/types";
import {
  convertWorkflowStateToParam,
  createStepExecutionContext,
  eventToUIMessageStreamResponse,
} from "./internal/utils";
import { WorkflowTraceContext } from "./open-telemetry/trace-context";
import { WorkflowRegistry } from "./registry";
import type { WorkflowStep } from "./steps";

import {
  NoOpWorkflowStreamWriter,
  WorkflowStreamController,
  WorkflowStreamWriterImpl,
} from "./stream";
import { createSuspendController as createDefaultSuspendController } from "./suspend-controller";
import type {
  Workflow,
  WorkflowCancellationMetadata,
  WorkflowConfig,
  WorkflowExecutionResult,
  WorkflowInput,
  WorkflowResult,
  WorkflowRunOptions,
  WorkflowStreamResult,
  WorkflowSuspensionMetadata,
} from "./types";

/**
 * Creates a workflow from multiple and* functions
 *
 * @example
 * ```ts
 * const workflow = createWorkflow({
 *   id: "user-processing",
 *   name: "User Processing Workflow",
 *   purpose: "Process user data and generate personalized content",
 *   input: z.object({ userId: z.string(), userType: z.enum(["admin", "user"]) }),
 *   result: z.object({ processed: z.boolean(), content: z.string() }),
 *   memory: new InMemoryStorage() // Optional workflow-specific memory
 * },
 *   andThen({
 *     id: "fetch-user",
 *     execute: async ({ data }) => {
 *       const userInfo = await fetchUserInfo(data.userId);
 *       return { ...data, userInfo };
 *     }
 *   }),
 *   andWhen({
 *     id: "admin-permissions",
 *     condition: async ({ data }) => data.userType === "admin",
 *     execute: async ({ data }) => ({ ...data, permissions: ["read", "write", "delete"] })
 *   }),
 *   andAgent(
 *     ({ data }) => `Generate personalized content for ${data.userInfo.name}`,
 *     agent,
 *     { schema: z.object({ content: z.string() }) }
 *   ),
 *   andThen({
 *     id: "finalize-result",
 *     execute: async ({ data }) => ({
 *       processed: true,
 *       content: data.content
 *     })
 *   })
 * );
 *
 * // Run with optional memory override
 * const result = await workflow.run(
 *   { userId: "123", userType: "admin" },
 *   { memory: new InMemoryStorage() }
 * );
 * ```
 *
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
  SUSPEND_SCHEMA extends z.ZodTypeAny = z.ZodAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
>(
  {
    id,
    name,
    purpose,
    hooks,
    input,
    suspendSchema,
    resumeSchema,
    memory: workflowMemory,
    observability: workflowObservability,
  }: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>,
  ...steps: ReadonlyArray<BaseStep>
) {
  // ✅ Ensure every workflow has Memory V2 (like Agent system)
  const effectiveMemory = workflowMemory || new MemoryV2({ storage: new InMemoryStorageAdapter() });

  // Helper function to save suspension state to memory
  const saveSuspensionState = async (
    suspensionData: any,
    executionId: string,
    memory: typeof effectiveMemory,
    logger: Logger,
  ): Promise<void> => {
    try {
      logger.trace(`Storing suspension checkpoint for execution ${executionId}`);
      await memory.updateWorkflowState(executionId, {
        status: "suspended",
        suspension: suspensionData
          ? {
              suspendedAt: suspensionData.suspendedAt,
              reason: suspensionData.reason,
              stepIndex: suspensionData.suspendedStepIndex,
              lastEventSequence: suspensionData.lastEventSequence,
              checkpoint: suspensionData.checkpoint,
              suspendData: suspensionData.suspendData,
            }
          : undefined,
        updatedAt: new Date(),
      });
      logger.trace(`Successfully stored suspension checkpoint for execution ${executionId}`);
    } catch (error) {
      logger.error(`Failed to save suspension state for execution ${executionId}:`, { error });
    }
  };

  // Create logger for this workflow with LoggerProxy for lazy evaluation
  const logger = new LoggerProxy({
    component: "workflow",
    workflowId: id,
  });

  // Get observability instance (use provided, global, or create default)
  let cachedObservability: VoltAgentObservability | undefined;

  const getObservability = (): VoltAgentObservability => {
    // Priority 1: Workflow's own observability
    if (workflowObservability) {
      return workflowObservability;
    }
    // Priority 2: Global observability from registry
    const globalObservability = AgentRegistry.getInstance().getGlobalObservability();
    if (globalObservability) {
      return globalObservability;
    }
    if (!cachedObservability) {
      cachedObservability = createVoltAgentObservability({
        serviceName: `workflow-${name}`,
      });
    }
    return cachedObservability;
  };

  // Set default schemas if not provided
  const effectiveSuspendSchema = suspendSchema || z.any();
  const effectiveResumeSchema = resumeSchema || z.any();

  // Internal execution function shared by both run and stream
  const executeInternal = async (
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
    externalStreamController?: WorkflowStreamController | null,
  ): Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>> => {
    const workflowRegistry = WorkflowRegistry.getInstance();

    let executionId: string;

    // Determine executionId early
    if (options?.resumeFrom?.executionId) {
      executionId = options.resumeFrom.executionId;
    } else {
      executionId = options?.executionId || randomUUID();
    }

    // Only create stream controller if one is provided (for streaming execution)
    // For normal run, we don't need a stream controller
    const streamController = externalStreamController || null;

    // Get observability instance
    const observability = getObservability();

    // Convert context to Map if needed
    const contextMap =
      options?.context instanceof Map
        ? options.context
        : options?.context
          ? new Map(Object.entries(options.context))
          : new Map();

    // Get previous trace IDs if resuming
    let resumedFrom: { traceId: string; spanId: string } | undefined;
    if (options?.resumeFrom?.executionId) {
      try {
        const workflowState = await effectiveMemory.getWorkflowState(executionId);
        // Look for trace IDs from the original execution
        if (workflowState?.metadata?.traceId && workflowState?.metadata?.spanId) {
          resumedFrom = {
            traceId: workflowState.metadata.traceId as string,
            spanId: workflowState.metadata.spanId as string,
          };
          logger.debug("Found previous trace IDs for resume:", resumedFrom);
        } else {
          logger.warn("No suspended trace IDs found in workflow state metadata");
        }
      } catch (error) {
        logger.warn("Failed to get previous trace IDs for resume:", { error });
      }
    }

    // Create trace context for this workflow execution
    const traceContext = new WorkflowTraceContext(observability, `workflow.${name}`, {
      workflowId: id,
      workflowName: name,
      executionId: executionId,
      userId: options?.userId,
      conversationId: options?.conversationId,
      input: input,
      context: contextMap,
      resumedFrom,
    });

    // Wrap entire execution in root span
    const rootSpan = traceContext.getRootSpan();

    // Add workflow state snapshot for remote observability
    const workflowState = {
      id,
      name,
      purpose: purpose ?? "No purpose provided",
      stepsCount: steps.length,
      steps: steps.map((step, index) => serializeWorkflowStep(step, index)),
      inputSchema: input,
      suspendSchema: effectiveSuspendSchema,
      resumeSchema: effectiveResumeSchema,
    };
    rootSpan.setAttribute("workflow.stateSnapshot", safeStringify(workflowState));

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: workflow execution orchestrates many branches
    return await traceContext.withSpan(rootSpan, async () => {
      // Create run logger with initial context and trace info
      const runLogger = logger.child({
        executionId,
        userId: options?.userId,
        conversationId: options?.conversationId,
        traceId: rootSpan.spanContext().traceId,
        spanId: rootSpan.spanContext().spanId,
      });

      // Check if resuming an existing execution
      if (options?.resumeFrom?.executionId) {
        runLogger.debug(`Resuming execution ${executionId} for workflow ${id}`);

        // Record resume in trace
        traceContext.recordResume(
          options.resumeFrom.resumeStepIndex,
          options.resumeFrom.resumeData,
        );

        // Get the existing state and update its status
        try {
          const workflowState = await effectiveMemory.getWorkflowState(executionId);
          if (workflowState) {
            runLogger.debug(`Found existing workflow state with status: ${workflowState.status}`);
            // Update state to running and clear suspension metadata
            await effectiveMemory.updateWorkflowState(executionId, {
              status: "running",
              suspension: undefined, // Clear suspension metadata
              metadata: {
                ...workflowState.metadata,
                resumedAt: new Date(),
              },
              updatedAt: new Date(),
            });

            runLogger.debug(`Updated execution ${executionId} status to running`);
          } else {
            throw new Error(`Workflow state ${executionId} not found`);
          }
        } catch (error) {
          runLogger.error("Failed to get/update resumed execution:", { error });
          throw error; // Re-throw to prevent creating a new execution
        }
      } else {
        // Create new execution - ALWAYS create state directly (like Agent does)

        // 1. Create workflow state in Memory V2 (workflow's own memory)
        const workflowState = {
          id: executionId,
          workflowId: id,
          workflowName: name,
          status: "running" as const,
          input,
          context: options?.context ? Array.from(options.context.entries()) : undefined,
          metadata: {
            traceId: rootSpan.spanContext().traceId,
            spanId: rootSpan.spanContext().spanId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          await effectiveMemory.setWorkflowState(executionId, workflowState);
          runLogger.trace(`Created workflow state in Memory V2 for ${executionId}`);
        } catch (error) {
          runLogger.error("Failed to create workflow state in Memory V2:", { error });
          throw new Error(
            `Failed to create workflow state: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // ✅ Memory is always available (created with defaults in createWorkflow)
      // No need for managers - use them directly like Agent system

      // Create stream writer - real one for streaming, no-op for regular execution
      const streamWriter = streamController
        ? new WorkflowStreamWriterImpl(streamController, executionId, id, name, 0, options?.context)
        : new NoOpWorkflowStreamWriter();

      // Initialize workflow execution context with the correct execution ID
      const executionContext: WorkflowExecutionContext = {
        workflowId: id,
        executionId: executionId,
        workflowName: name,
        context: contextMap, // Use the converted Map
        isActive: true,
        startTime: new Date(),
        currentStepIndex: 0,
        steps: [],
        signal: options?.suspendController?.signal, // Get signal from suspendController
        // Store effective memory for use in steps if needed
        memory: effectiveMemory,
        // Initialize step data map for tracking inputs/outputs
        stepData: new Map(),
        // Initialize event sequence - restore from resume or start at 0
        eventSequence: options?.resumeFrom?.lastEventSequence || 0,
        // Include the execution-scoped logger
        logger: runLogger,
        // Stream writer is always available
        streamWriter: streamWriter,
        traceContext: traceContext,
      };

      // Emit workflow start event
      streamController?.emit({
        type: "workflow-start",
        executionId,
        from: name,
        input: input as Record<string, any>,
        status: "running",
        context: options?.context,
        timestamp: new Date().toISOString(),
      });

      // Log workflow start with only event-specific context
      runLogger.debug(
        `Workflow started | user=${options?.userId || "anonymous"} conv=${options?.conversationId || "none"}`,
        {
          input: input !== undefined ? input : null,
        },
      );

      const stateManager = createWorkflowStateManager<
        WorkflowInput<INPUT_SCHEMA>,
        WorkflowResult<RESULT_SCHEMA>
      >();

      // Enhanced state with workflow context
      if (options?.resumeFrom?.executionId) {
        // When resuming, use the existing execution ID
        stateManager.start(input, {
          ...options,
          executionId: executionId, // Use the resumed execution ID
          active: options.resumeFrom.resumeStepIndex,
        });
      } else {
        stateManager.start(input, {
          ...options,
          executionId: executionId, // Use the created execution ID
        });
      }

      // Handle resume from suspension
      let startStepIndex = 0;
      let resumeInputData: any = undefined;
      if (options?.resumeFrom) {
        startStepIndex = options.resumeFrom.resumeStepIndex;
        // Always use checkpoint state as the data
        stateManager.update({
          data: options.resumeFrom.checkpoint?.stepExecutionState,
        });
        // Store the resume input separately to pass to the step
        resumeInputData = options.resumeFrom.resumeData;
        // Update execution context for resume
        executionContext.currentStepIndex = startStepIndex;
      }

      try {
        for (const [index, step] of (steps as BaseStep[]).entries()) {
          // Skip already completed steps when resuming
          if (index < startStepIndex) {
            runLogger.debug(
              `Skipping already completed step ${index} (startStepIndex=${startStepIndex})`,
            );
            continue;
          }

          const stepName = step.name || step.id || `Step ${index + 1}`;

          executionContext.currentStepIndex = index;

          const activeController = workflowRegistry.activeExecutions.get(executionId);

          const completeCancellation = async (
            span: ReturnType<typeof traceContext.createStepSpan>,
            reason: string,
          ): Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>> => {
            stateManager.cancel(reason);

            traceContext.endStepSpan(span, "cancelled", {
              output: stateManager.state.data,
              cancellationReason: reason,
            });

            const stepData = executionContext.stepData.get(step.id);
            if (stepData) {
              stepData.output = stateManager.state.data;
            }

            streamController?.emit({
              type: "step-complete",
              executionId,
              from: stepName,
              input: stateManager.state.data,
              output: undefined,
              status: "cancelled",
              context: options?.context,
              timestamp: new Date().toISOString(),
              stepIndex: index,
              stepType: step.type,
              metadata: { reason },
            });

            await hooks?.onStepEnd?.(stateManager.state);

            traceContext.recordCancellation(reason);
            traceContext.end("cancelled");

            workflowRegistry.activeExecutions.delete(executionId);

            try {
              await effectiveMemory.updateWorkflowState(executionId, {
                status: "cancelled",
                metadata: {
                  ...(stateManager.state?.usage ? { usage: stateManager.state.usage } : {}),
                  cancellationReason: reason,
                },
                updatedAt: new Date(),
              });
            } catch (memoryError) {
              runLogger.warn("Failed to update workflow state to cancelled in Memory V2:", {
                error: memoryError,
              });
            }

            streamController?.emit({
              type: "workflow-cancelled",
              executionId,
              from: name,
              status: "cancelled",
              context: options?.context,
              timestamp: new Date().toISOString(),
              metadata: { reason },
            });

            streamController?.close();

            runLogger.debug(
              `Workflow cancelled | user=${options?.userId || "anonymous"} conv=${options?.conversationId || "none"}`,
              {
                stepIndex: index,
                reason,
              },
            );

            await hooks?.onEnd?.(stateManager.state);

            return createWorkflowExecutionResult(
              id,
              executionId,
              stateManager.state.startAt,
              new Date(),
              "cancelled",
              null,
              stateManager.state.usage,
              undefined,
              stateManager.state.cancellation,
              undefined,
              effectiveResumeSchema,
            );
          };

          const resolveCancellationReason = (abortValue?: unknown): string => {
            const reasonFromSignal =
              typeof abortValue === "string" && abortValue !== "cancelled" ? abortValue : undefined;

            return (
              options?.suspendController?.getCancelReason?.() ??
              activeController?.getCancelReason?.() ??
              reasonFromSignal ??
              options?.suspendController?.getReason?.() ??
              activeController?.getReason?.() ??
              "Workflow cancelled"
            );
          };

          // Check for suspension signal before each step
          const checkSignal = options?.suspendController?.signal;
          runLogger.trace(`Checking suspension signal at step ${index}`, {
            hasSignal: !!checkSignal,
            isAborted: checkSignal?.aborted,
            reason: (checkSignal as any)?.reason,
          });

          const signal = options?.suspendController?.signal;
          if (signal?.aborted) {
            const abortReason = (signal as AbortSignal & { reason?: unknown }).reason;
            const abortType =
              typeof abortReason === "object" && abortReason !== null && "type" in abortReason
                ? (abortReason as { type?: string }).type
                : abortReason;
            const isCancelled =
              options?.suspendController?.isCancelled?.() === true ||
              activeController?.isCancelled?.() === true ||
              abortType === "cancelled";

            if (isCancelled) {
              const cancellationReason = resolveCancellationReason(abortReason);

              runLogger.debug(
                `Cancellation signal detected at step ${index} for execution ${executionId}`,
              );

              const cancelSpan = traceContext.createStepSpan(index, step.type, stepName, {
                stepId: step.id,
                input: stateManager.state.data,
                attributes: {
                  "workflow.step.function": step.execute?.name,
                },
              });

              return completeCancellation(cancelSpan, cancellationReason);
            }

            runLogger.debug(
              `Suspension signal detected at step ${index} for execution ${executionId}`,
            );

            // Get the reason from suspension controller or registry
            let reason = "User requested suspension";

            // Check if we have a suspension controller with a reason
            if (options?.suspendController?.getReason()) {
              reason = options.suspendController.getReason() || "User requested suspension";
              runLogger.trace(`Using reason from suspension controller: ${reason}`);
            } else if (activeController?.getReason()) {
              reason = activeController.getReason() || "User requested suspension";
              runLogger.debug(`Using reason from registry: ${reason}`);
            }

            runLogger.trace(`Final suspension reason: ${reason}`);
            const checkpoint = {
              stepExecutionState: stateManager.state.data,
              completedStepsData: (steps as BaseStep[])
                .slice(0, index)
                .map((s, i) => ({ stepIndex: i, stepName: s.name || `Step ${i + 1}` })),
            };

            runLogger.debug(
              `Creating suspension with reason: ${reason}, suspendedStepIndex: ${index}`,
            );
            stateManager.suspend(reason, checkpoint, index);

            // Save suspension state to memory
            const suspensionData = stateManager.state.suspension;
            try {
              await saveSuspensionState(suspensionData, executionId, effectiveMemory, runLogger);
            } catch (_) {
              // Error already logged in saveSuspensionState, don't throw
            }

            // Update workflow execution status to suspended
            runLogger.trace(`Workflow execution suspended: ${executionId}`);

            // Record suspension in trace
            traceContext.recordSuspension(
              index,
              reason,
              stateManager.state.suspension?.suspendData,
              checkpoint,
            );

            // End root span as suspended
            traceContext.end("suspended");

            // Log workflow suspension with context
            runLogger.debug(
              `Workflow suspended | user=${options?.userId || "anonymous"} conv=${options?.conversationId || "none"} step=${index}`,
              {
                stepIndex: index,
                reason,
              },
            );

            // Return suspended state
            runLogger.trace(`Returning suspended state for execution ${executionId}`);
            return createWorkflowExecutionResult(
              id,
              executionId,
              stateManager.state.startAt,
              new Date(),
              "suspended",
              null,
              stateManager.state.usage,
              stateManager.state.suspension,
              stateManager.state.cancellation,
              undefined,
              effectiveResumeSchema,
            );
          }

          const stepSpan = traceContext.createStepSpan(index, step.type, stepName, {
            stepId: step.id,
            input: stateManager.state.data,
            attributes: {
              "workflow.step.function": step.execute?.name,
            },
          });

          // Create stream writer for this step - real one for streaming, no-op for regular execution
          const stepWriter = streamController
            ? new WorkflowStreamWriterImpl(
                streamController,
                executionId,
                step.id,
                step.name || step.id,
                index,
                options?.context,
              )
            : new NoOpWorkflowStreamWriter();
          executionContext.streamWriter = stepWriter;

          // Emit step start event
          streamController?.emit({
            type: "step-start",
            executionId,
            from: step.name || step.id,
            input: stateManager.state.data,
            status: "running",
            context: options?.context,
            timestamp: new Date().toISOString(),
            stepIndex: index,
            stepType: step.type,
            metadata: {
              displayName: `Step ${index + 1}: ${step.name || step.id}`,
            },
          });

          await hooks?.onStepStart?.(stateManager.state);

          // Store step input data before execution
          executionContext.stepData.set(step.id, {
            input: stateManager.state.data,
            output: null,
          });

          // Log step start with context
          runLogger.debug(`Step ${index + 1} starting: ${stepName} | type=${step.type}`, {
            stepIndex: index,
            stepType: step.type,
            stepName,
            input: stateManager.state.data,
          });

          // Use step-level schemas if available, otherwise fall back to workflow-level
          const stepSuspendSchema = step.suspendSchema || effectiveSuspendSchema;
          const stepResumeSchema = step.resumeSchema || effectiveResumeSchema;

          // Create suspend function for this step
          const suspendFn = async (reason?: string, suspendData?: any): Promise<never> => {
            runLogger.debug(
              `Step ${index} requested suspension: ${reason || "No reason provided"}`,
            );

            // Store suspend data to be validated later when actually suspending
            if (suspendData !== undefined) {
              executionContext.context.set("suspendData", suspendData);
            }

            // Trigger suspension via the controller if available
            if (options?.suspendController) {
              options.suspendController.suspend(reason || "Step requested suspension");
            }

            // Always throw the suspension error - it will be caught and handled properly
            throw new Error("WORKFLOW_SUSPENDED");
          };

          try {
            // Create execution context for the step with typed suspend function
            const typedSuspendFn = (
              reason?: string,
              suspendData?: z.infer<typeof stepSuspendSchema>,
            ) => suspendFn(reason, suspendData);

            // Only pass resumeData if we're on the step that was suspended and we have resume input
            const isResumingThisStep =
              options?.resumeFrom && index === startStepIndex && resumeInputData !== undefined;

            // Update stream writer for this specific step
            executionContext.streamWriter = streamController
              ? new WorkflowStreamWriterImpl(
                  streamController,
                  executionId,
                  step.id,
                  step.name || step.id,
                  index,
                  options?.context,
                )
              : new NoOpWorkflowStreamWriter();

            // Create a modified execution context with the current step span
            const stepExecutionContext = {
              ...executionContext,
              currentStepSpan: stepSpan, // Add the current step span for agent integration
            };

            const stepContext = createStepExecutionContext<
              WorkflowInput<INPUT_SCHEMA>,
              typeof stateManager.state.data,
              z.infer<typeof stepSuspendSchema>,
              z.infer<typeof stepResumeSchema>
            >(
              stateManager.state.data,
              convertWorkflowStateToParam(
                stateManager.state,
                stepExecutionContext,
                options?.suspendController?.signal,
              ),
              stepExecutionContext,
              typedSuspendFn,
              isResumingThisStep ? resumeInputData : undefined,
            );
            // Execute step within span context with automatic signal checking for immediate suspension
            const result = await traceContext.withSpan(stepSpan, async () => {
              return await executeWithSignalCheck(
                () => step.execute(stepContext),
                options?.suspendController?.signal,
                options?.suspensionMode === "immediate" ? 50 : 500, // Check more frequently in immediate mode
              );
            });

            // Update step output data after successful execution
            const stepData = executionContext.stepData.get(step.id);
            if (stepData) {
              stepData.output = result;
            }

            // Check if the step was skipped (for conditional steps)
            // For conditional-when steps, if the output equals the input, the condition wasn't met
            const isSkipped =
              step.type === "conditional-when" && result === stateManager.state.data;

            stateManager.update({
              data: result,
              result: result,
            });

            // End step span with appropriate status
            if (isSkipped) {
              traceContext.endStepSpan(stepSpan, "skipped", {
                output: result,
                skippedReason: "Condition not met",
              });
            } else {
              traceContext.endStepSpan(stepSpan, "completed", {
                output: result,
              });
            }

            // Log step completion with context
            runLogger.debug(
              `Step ${index + 1} ${isSkipped ? "skipped" : "completed"}: ${stepName} | type=${step.type}`,
              {
                stepIndex: index,
                stepType: step.type,
                stepName,
                output: result !== undefined ? result : null,
                skipped: isSkipped,
              },
            );

            // Emit step complete event
            streamController?.emit({
              type: "step-complete",
              executionId,
              from: stepName,
              input: stateManager.state.data,
              output: result,
              status: "success",
              context: options?.context,
              timestamp: new Date().toISOString(),
              stepIndex: index,
              stepType: step.type as any,
              metadata: {
                displayName: `Step ${index + 1}: ${stepName}`,
              },
            });

            await hooks?.onStepEnd?.(stateManager.state);
          } catch (stepError) {
            if (stepError instanceof Error && stepError.message === "WORKFLOW_CANCELLED") {
              const cancellationReason = resolveCancellationReason();
              return completeCancellation(stepSpan, cancellationReason);
            }

            // Check if this is a suspension, not an error
            if (stepError instanceof Error && stepError.message === "WORKFLOW_SUSPENDED") {
              runLogger.debug(`Step ${index} suspended during execution`);

              // Handle suspension
              const suspensionReason =
                options?.suspendController?.getReason() || "Step suspended during execution";

              // End step span as suspended with reason
              traceContext.endStepSpan(stepSpan, "suspended", {
                suspensionReason,
              });

              // Get suspend data if provided
              const suspendData = executionContext.context.get("suspendData");

              const suspensionMetadata = stateManager.suspend(
                suspensionReason,
                {
                  stepExecutionState: stateManager.state.data,
                  completedStepsData: Array.from({ length: index }, (_, i) => i),
                },
                index, // Current step that was suspended
                executionContext.eventSequence, // Pass current event sequence
              );

              // Add suspend data to suspension metadata if provided
              if (suspendData !== undefined && suspensionMetadata) {
                (suspensionMetadata as WorkflowSuspensionMetadata<any>).suspendData = suspendData;
              }

              runLogger.debug(`Workflow suspended at step ${index}`, suspensionMetadata);

              // Emit suspension event to stream
              streamController?.emit({
                type: "workflow-suspended",
                executionId,
                from: step.name || step.id,
                input: stateManager.state.data,
                output: undefined,
                status: "suspended",
                context: options?.context,
                timestamp: new Date().toISOString(),
                stepIndex: index,
                metadata: {
                  reason: suspensionReason,
                  suspendData,
                  suspension: suspensionMetadata,
                },
              });

              // Step suspend event removed - now handled by OpenTelemetry spans

              // Workflow suspend event removed - now handled by OpenTelemetry spans

              // Record suspension in trace
              traceContext.recordSuspension(
                index,
                suspensionReason,
                suspendData,
                suspensionMetadata?.checkpoint,
              );

              // End root span as suspended
              traceContext.end("suspended");

              // Save suspension state to workflow's own Memory V2
              try {
                await saveSuspensionState(
                  suspensionMetadata,
                  executionId,
                  effectiveMemory,
                  runLogger,
                );
              } catch (_) {
                // Error already logged in saveSuspensionState, don't throw
              }

              runLogger.trace(`Workflow execution suspended: ${executionContext.executionId}`);

              // Return suspended state without throwing
              // Don't close the stream when suspended - it will continue after resume
              return createWorkflowExecutionResult(
                id,
                executionId,
                stateManager.state.startAt,
                new Date(),
                "suspended",
                null,
                stateManager.state.usage,
                stateManager.state.suspension,
                stateManager.state.cancellation,
                undefined,
                effectiveResumeSchema,
              );
            }

            // End step span with error
            traceContext.endStepSpan(stepSpan, "error", {
              error: stepError as Error,
            });

            throw stepError; // Re-throw the original error
          }
        }

        const finalState = stateManager.finish();

        // Record workflow completion in trace
        traceContext.setOutput(finalState.result);
        traceContext.setUsage(stateManager.state.usage);
        traceContext.end("completed");

        // Update Memory V2 state to completed
        try {
          await effectiveMemory.updateWorkflowState(executionContext.executionId, {
            status: "completed",
            updatedAt: new Date(),
          });
        } catch (memoryError) {
          runLogger.warn("Failed to update workflow state to completed in Memory V2:", {
            error: memoryError,
          });
        }

        await hooks?.onEnd?.(stateManager.state);

        // Log workflow completion with context
        const duration = finalState.endAt.getTime() - finalState.startAt.getTime();
        runLogger.debug(
          `Workflow completed | user=${options?.userId || "anonymous"} conv=${options?.conversationId || "none"} duration=${duration}ms`,
          {
            duration,
            output: finalState.result !== undefined ? finalState.result : null,
          },
        );

        // Emit workflow complete event
        streamController?.emit({
          type: "workflow-complete",
          executionId,
          from: name,
          output: finalState.result,
          status: "success",
          context: options?.context,
          timestamp: new Date().toISOString(),
        });

        streamController?.close();
        return createWorkflowExecutionResult(
          id,
          executionId,
          finalState.startAt,
          finalState.endAt,
          "completed",
          finalState.result as z.infer<RESULT_SCHEMA>,
          stateManager.state.usage,
          undefined,
          stateManager.state.cancellation,
          undefined,
          effectiveResumeSchema,
        );
      } catch (error) {
        // Check if this is a cancellation or suspension, not an error
        if (error instanceof Error && error.message === "WORKFLOW_CANCELLED") {
          const cancellationReason =
            options?.suspendController?.getCancelReason?.() ??
            workflowRegistry.activeExecutions.get(executionId)?.getCancelReason?.() ??
            options?.suspendController?.getReason?.() ??
            workflowRegistry.activeExecutions.get(executionId)?.getReason?.() ??
            "Workflow cancelled";

          stateManager.cancel(cancellationReason);

          traceContext.recordCancellation(cancellationReason);
          traceContext.end("cancelled");

          workflowRegistry.activeExecutions.delete(executionId);

          streamController?.emit({
            type: "workflow-cancelled",
            executionId,
            from: name,
            status: "cancelled",
            context: options?.context,
            timestamp: new Date().toISOString(),
            metadata: cancellationReason ? { reason: cancellationReason } : undefined,
          });

          streamController?.close();

          try {
            await effectiveMemory.updateWorkflowState(executionId, {
              status: "cancelled",
              metadata: {
                ...(stateManager.state?.usage ? { usage: stateManager.state.usage } : {}),
                cancellationReason,
              },
              updatedAt: new Date(),
            });
          } catch (memoryError) {
            runLogger.warn("Failed to update workflow state to cancelled in Memory V2:", {
              error: memoryError,
            });
          }

          await hooks?.onEnd?.(stateManager.state);

          return createWorkflowExecutionResult(
            id,
            executionId,
            stateManager.state.startAt,
            new Date(),
            "cancelled",
            null,
            stateManager.state.usage,
            undefined,
            undefined,
            effectiveResumeSchema,
          );
        }

        if (error instanceof Error && error.message === "WORKFLOW_SUSPENDED") {
          runLogger.debug("Workflow suspended (caught at top level)");
          // Record suspension in trace
          traceContext.recordSuspension(
            executionContext.currentStepIndex,
            "Workflow suspended",
            stateManager.state.suspension?.suspendData,
            stateManager.state.suspension?.checkpoint,
          );
          traceContext.end("suspended");
          // This case should be handled in the step catch block,
          // but just in case it bubbles up here
          streamController?.close();
          return createWorkflowExecutionResult(
            id,
            executionId,
            stateManager.state.startAt,
            new Date(),
            "suspended",
            null,
            stateManager.state.usage,
            stateManager.state.suspension,
            stateManager.state.cancellation,
            undefined,
            effectiveResumeSchema,
          );
        }

        // End trace with error
        traceContext.end("error", error as Error);

        // Log workflow error with context
        runLogger.debug(
          `Workflow failed | user=${options?.userId || "anonymous"} conv=${options?.conversationId || "none"} error=${error instanceof Error ? error.message : String(error)}`,
          {
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          },
        );

        // Emit workflow error event
        streamController?.emit({
          type: "workflow-error",
          executionId,
          from: name,
          status: "error",
          error: error,
          context: options?.context,
          timestamp: new Date().toISOString(),
        });

        // Update state before closing stream (only if not already completed/failed)
        if (stateManager.state.status !== "completed" && stateManager.state.status !== "failed") {
          stateManager.fail(error);
        }
        // Persist error status to Memory V2 so /state reflects the failure
        try {
          await effectiveMemory.updateWorkflowState(executionId, {
            status: "error",
            // Store a lightweight error summary in metadata for debugging
            metadata: {
              ...(stateManager.state?.usage ? { usage: stateManager.state.usage } : {}),
              errorMessage: error instanceof Error ? error.message : String(error),
            },
            updatedAt: new Date(),
          });
        } catch (memoryError) {
          runLogger.warn("Failed to update workflow state to error in Memory V2:", {
            error: memoryError,
          });
        }
        await hooks?.onEnd?.(stateManager.state);

        // Close stream after state update
        streamController?.close();

        // Return error state
        return createWorkflowExecutionResult(
          id,
          executionId,
          stateManager.state.startAt,
          new Date(),
          "error",
          null,
          stateManager.state.usage,
          undefined,
          stateManager.state.cancellation,
          error,
          effectiveResumeSchema,
        );
      }
    }); // Close the withSpan callback
  };

  return {
    id,
    name,
    purpose: purpose ?? "No purpose provided",
    steps: steps as BaseStep[],
    inputSchema: input,
    suspendSchema: effectiveSuspendSchema as SUSPEND_SCHEMA,
    resumeSchema: effectiveResumeSchema as RESUME_SCHEMA,
    // ✅ Always expose memory for registry access
    memory: effectiveMemory,
    observability: workflowObservability,
    getFullState: () => {
      // Return workflow state similar to agent.getFullState
      return {
        id,
        name,
        purpose: purpose ?? "No purpose provided",
        stepsCount: steps.length,
        steps: steps.map((step, index) => serializeWorkflowStep(step, index)),
        inputSchema: input,
        suspendSchema: effectiveSuspendSchema,
        resumeSchema: effectiveResumeSchema,
      };
    },
    createSuspendController: () => createDefaultSuspendController(),
    run: async (input: WorkflowInput<INPUT_SCHEMA>, options?: WorkflowRunOptions) => {
      // Simply call executeInternal which handles everything without stream
      return executeInternal(input, options);
    },
    stream: (input: WorkflowInput<INPUT_SCHEMA>, options?: WorkflowRunOptions) => {
      // Create stream controller for this execution
      const streamController = new WorkflowStreamController();
      const executionId = options?.executionId || crypto.randomUUID();

      // Use provided suspend controller or create a default one
      const suspendController = options?.suspendController ?? createDefaultSuspendController();

      // Ensure suspend controller is passed to execution internals alongside exec ID
      const executionOptions: WorkflowRunOptions = {
        ...options,
        executionId,
        suspendController,
      };

      // Save the original input for resume
      const originalInput = input;

      // Create deferred promises for async fields
      let resultResolve: (value: WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>) => void;
      let resultReject: (error: any) => void;
      const resultPromise = new Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>(
        (resolve, reject) => {
          resultResolve = resolve;
          resultReject = reject;
        },
      );

      // Start execution in background
      const executeWithStream = async () => {
        // Pass our stream controller to executeInternal so it emits events to our stream
        const result = await executeInternal(input, executionOptions, streamController);
        return result;
      };

      executeWithStream()
        .then(
          (result) => {
            // Only close stream if workflow completed or errored (not suspended)
            if (result.status !== "suspended") {
              streamController?.close();
            }
            resultResolve(result);
          },
          (error) => {
            streamController?.close();
            resultReject(error);
          },
        )
        .catch(() => {
          // Silently catch any unhandled rejections to prevent console errors
          // The error is already handled above and will be available via the promise fields
        });

      // Return stream result immediately
      const streamResult: WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA> = {
        executionId,
        workflowId: id,
        startAt: new Date(),
        endAt: resultPromise.then((r) => r.endAt),
        status: resultPromise.then((r) => r.status),
        result: resultPromise.then((r) => r.result),
        suspension: resultPromise.then((r) => r.suspension),
        cancellation: resultPromise.then((r) => r.cancellation),
        error: resultPromise.then((r) => r.error),
        usage: resultPromise.then((r) => r.usage),
        toUIMessageStreamResponse: eventToUIMessageStreamResponse(streamController),

        resume: async (input: z.infer<RESUME_SCHEMA>, opts?: { stepId?: string }) => {
          const execResult = await resultPromise;
          if (execResult.status !== "suspended") {
            throw new Error(`Cannot resume workflow in ${execResult.status} state`);
          }

          // Continue with the same stream controller - don't create a new one
          // Create new promise for the resumed execution
          let resumedResolve: (
            value: WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>,
          ) => void;
          let resumedReject: (error: any) => void;
          const resumedPromise = new Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>(
            (resolve, reject) => {
              resumedResolve = resolve;
              resumedReject = reject;
            },
          );

          // Execute the resume by calling stream again with resume options
          const executeResume = async () => {
            // Get the suspension metadata
            if (!execResult.suspension) {
              throw new Error("No suspension metadata found");
            }

            let resumeStepIndex = execResult.suspension.suspendedStepIndex;
            if (opts?.stepId) {
              const overrideIndex = (steps as BaseStep[]).findIndex(
                (step) => step.id === opts.stepId,
              );
              if (overrideIndex === -1) {
                throw new Error(`Step '${opts.stepId}' not found in workflow '${id}'`);
              }
              resumeStepIndex = overrideIndex;
            }

            // Create resume options to continue from where we left off
            const resumeOptions: WorkflowRunOptions = {
              executionId: execResult.executionId,
              resumeFrom: {
                executionId: execResult.executionId,
                checkpoint: execResult.suspension.checkpoint,
                resumeStepIndex,
                resumeData: input,
              },
              suspendController,
            };

            // Re-execute with streaming from the suspension point
            // This will emit events to the same stream controller
            const resumed = await executeInternal(
              originalInput, // Use the original input saved in closure
              resumeOptions,
              streamController,
            );
            return resumed;
          };

          // Start resume execution and emit events to the same stream
          executeResume()
            .then(
              (result) => {
                // Only close stream if workflow completed or errored (not suspended again)
                if (result.status !== "suspended") {
                  streamController?.close();
                }
                resumedResolve(result);
              },
              (error) => {
                streamController?.close();
                resumedReject(error);
              },
            )
            .catch(() => {});

          // Return a stream result that continues using the same stream
          const resumedStreamResult: WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA> = {
            executionId: execResult.executionId, // Keep same execution ID
            workflowId: execResult.workflowId,
            startAt: execResult.startAt,
            endAt: resumedPromise.then((r) => r.endAt),
            status: resumedPromise.then((r) => r.status),
            result: resumedPromise.then((r) => r.result),
            suspension: resumedPromise.then((r) => r.suspension),
            cancellation: resumedPromise.then((r) => r.cancellation),
            error: resumedPromise.then((r) => r.error),
            usage: resumedPromise.then((r) => r.usage),
            resume: async (input2: z.infer<RESUME_SCHEMA>, opts?: { stepId?: string }) => {
              // Resume again using the same stream
              const nextResult = await resumedPromise;
              if (nextResult.status !== "suspended") {
                throw new Error(`Cannot resume workflow in ${nextResult.status} state`);
              }
              // Recursively call resume on the stream result (which will use the same stream controller)
              return streamResult.resume(input2, opts);
            },
            suspend: (reason?: string) => {
              suspendController.suspend(reason);
            },
            cancel: (reason?: string) => {
              suspendController.cancel(reason);
            },
            abort: () => streamController.abort(),
            toUIMessageStreamResponse: eventToUIMessageStreamResponse(streamController),
            // Continue using the same stream iterator
            [Symbol.asyncIterator]: () => streamController.getStream(),
          };

          return resumedStreamResult;
        },
        suspend: (reason?: string) => {
          suspendController.suspend(reason);
        },
        cancel: (reason?: string) => {
          suspendController.cancel(reason);
        },
        abort: () => {
          streamController.abort();
        },
        // AsyncIterable implementation
        [Symbol.asyncIterator]: () => streamController.getStream(),
      };

      return streamResult;
    },
  } satisfies Workflow<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>;
}

/*
|------------------
| Internals
|------------------
*/

/**
 * Helper function to create a WorkflowExecutionResult with resume capability
 */
function createWorkflowExecutionResult<
  RESULT_SCHEMA extends z.ZodTypeAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
>(
  workflowId: string,
  executionId: string,
  startAt: Date,
  endAt: Date,
  status: "completed" | "suspended" | "cancelled" | "error",
  result: z.infer<RESULT_SCHEMA> | null,
  usage: UsageInfo,
  suspension?: WorkflowSuspensionMetadata,
  cancellation?: WorkflowCancellationMetadata,
  error?: unknown,
  resumeSchema?: RESUME_SCHEMA,
): WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA> {
  const resumeFn = async (input?: any, options?: { stepId?: string }) => {
    // Use the registry to resume the workflow
    const registry = WorkflowRegistry.getInstance();

    if (status !== "suspended") {
      throw new Error(`Cannot resume workflow in ${status} state`);
    }

    try {
      const resumeResult = await registry.resumeSuspendedWorkflow(
        workflowId,
        executionId,
        input,
        options?.stepId,
      );

      if (!resumeResult) {
        throw new Error("Failed to resume workflow");
      }

      // Convert registry result to WorkflowExecutionResult
      return createWorkflowExecutionResult(
        workflowId,
        resumeResult.executionId,
        resumeResult.startAt,
        resumeResult.endAt,
        resumeResult.status as "completed" | "suspended" | "cancelled" | "error",
        resumeResult.result,
        resumeResult.usage,
        resumeResult.suspension,
        resumeResult.cancellation,
        resumeResult.error,
        resumeSchema,
      );
    } catch (error) {
      throw new Error(
        `Failed to resume workflow: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return {
    executionId,
    workflowId,
    startAt,
    endAt,
    status,
    result,
    usage,
    suspension,
    cancellation,
    error,
    resume: resumeFn as any, // Type is handled by the interface
  };
}

/**
 * Executes a step with automatic signal checking for suspension
 * Monitors the signal during async operations and throws if suspension is requested
 */
async function executeWithSignalCheck<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  checkInterval = 100, // Check signal every 100ms
): Promise<T> {
  if (!signal) {
    // No signal provided, just execute normally
    return await fn();
  }

  // Create a promise that rejects when signal is aborted
  const abortPromise = new Promise<never>((_, reject) => {
    const getAbortError = () => {
      const reason = (signal as AbortSignal & { reason?: unknown }).reason;
      if (reason && typeof reason === "object" && reason !== null && "type" in reason) {
        const typedReason = reason as { type?: string };
        if (typedReason.type === "cancelled") {
          return new Error("WORKFLOW_CANCELLED");
        }
      }
      if (reason === "cancelled") {
        return new Error("WORKFLOW_CANCELLED");
      }
      return new Error("WORKFLOW_SUSPENDED");
    };

    const checkSignal = () => {
      if (signal.aborted) {
        reject(getAbortError());
      }
    };

    // Check immediately
    checkSignal();

    // Set up periodic checking
    const intervalId = setInterval(checkSignal, checkInterval);

    // Clean up on signal abort
    signal.addEventListener(
      "abort",
      () => {
        clearInterval(intervalId);
        reject(getAbortError());
      },
      { once: true },
    );
  });

  // Race between the actual function and abort signal
  return Promise.race([fn(), abortPromise]);
}

/**
 * Base type for workflow steps to avoid repetition
 */
type BaseStep = WorkflowStep<
  DangerouslyAllowAny,
  DangerouslyAllowAny,
  DangerouslyAllowAny,
  DangerouslyAllowAny
>;

/**
 * Serialized workflow step for API/snapshot
 */
export interface SerializedWorkflowStep {
  id: string;
  name: string;
  purpose?: string;
  type: string;
  stepIndex: number;
  inputSchema?: unknown;
  outputSchema?: unknown;
  suspendSchema?: unknown;
  resumeSchema?: unknown;
  agentId?: string;
  executeFunction?: string;
  conditionFunction?: string;
  nestedStep?: SerializedWorkflowStep;
  subSteps?: SerializedWorkflowStep[];
  subStepsCount?: number;
}

/**
 * Serialize a workflow step for API response or state snapshot
 */
export function serializeWorkflowStep(step: BaseStep, index: number): SerializedWorkflowStep {
  const baseStep: SerializedWorkflowStep = {
    id: step.id,
    name: step.name || step.id,
    ...(step.purpose && { purpose: step.purpose }),
    type: step.type,
    stepIndex: index,
    // Include step-level schemas if present
    ...(step.inputSchema && { inputSchema: step.inputSchema }),
    ...(step.outputSchema && { outputSchema: step.outputSchema }),
    ...(step.suspendSchema && { suspendSchema: step.suspendSchema }),
    ...(step.resumeSchema && { resumeSchema: step.resumeSchema }),
  };

  // Add type-specific data
  switch (step.type) {
    case "agent": {
      const agentStep = step as WorkflowStep<unknown, unknown, unknown, unknown> & {
        agent?: { id: string };
      };
      return {
        ...baseStep,
        ...(agentStep.agent && {
          agentId: agentStep.agent.id,
        }),
      };
    }

    case "func": {
      const funcStep = step as WorkflowStep<unknown, unknown, unknown, unknown> & {
        originalExecute?: (...args: any[]) => unknown;
      };
      return {
        ...baseStep,
        // Use original execute function (clean user code)
        ...(funcStep.originalExecute && {
          executeFunction: funcStep.originalExecute.toString(),
        }),
      };
    }

    case "conditional-when": {
      const conditionalStep = step as WorkflowStep<unknown, unknown, unknown, unknown> & {
        originalCondition?: (...args: any[]) => unknown;
        step?: BaseStep;
      };
      return {
        ...baseStep,
        ...(conditionalStep.originalCondition && {
          conditionFunction: conditionalStep.originalCondition.toString(),
        }),
        // Serialize nested step if available
        ...(conditionalStep.step && {
          nestedStep: serializeWorkflowStep(conditionalStep.step, 0),
        }),
      };
    }

    case "parallel-all":
    case "parallel-race": {
      const parallelStep = step as WorkflowStep<unknown, unknown, unknown, unknown> & {
        steps?: BaseStep[];
      };
      return {
        ...baseStep,
        // Serialize sub-steps
        ...(parallelStep.steps &&
          Array.isArray(parallelStep.steps) && {
            subSteps: parallelStep.steps.map((subStep: BaseStep, subIndex: number) =>
              serializeWorkflowStep(subStep, subIndex),
            ),
            subStepsCount: parallelStep.steps.length,
          }),
      };
    }

    default: {
      return baseStep;
    }
  }
}
