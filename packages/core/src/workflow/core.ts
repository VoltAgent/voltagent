import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import { z } from "zod";
import { createWorkflowStateManager } from "./internal/state";
import type { InternalBaseWorkflowInputSchema } from "./internal/types";
import { convertWorkflowStateToParam, createStepExecutionContext } from "./internal/utils";
import type { WorkflowStep } from "./steps";
import type {
  Workflow,
  WorkflowConfig,
  WorkflowInput,
  WorkflowResult,
  WorkflowRunOptions,
  WorkflowStepHistoryEntry,
  WorkflowExecutionResult,
  WorkflowSuspensionMetadata,
} from "./types";
import type { WorkflowExecutionContext } from "./context";
import {
  createWorkflowErrorEvent,
  createWorkflowStartEvent,
  createWorkflowSuccessEvent,
  createWorkflowSuspendEvent,
  createWorkflowStepSuspendEvent,
  publishWorkflowEvent,
  createStepContext,
} from "./event-utils";
import { LibSQLStorage } from "../memory/libsql";
import { WorkflowHistoryManager } from "./history-manager";
import { devLogger } from "@voltagent/internal/dev";
import { WorkflowRegistry } from "./registry";

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
  status: "completed" | "suspended" | "error",
  result: z.infer<RESULT_SCHEMA> | null,
  suspension?: any,
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
        resumeResult.status as "completed" | "suspended" | "error",
        resumeResult.result,
        resumeResult.suspension,
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
    suspension,
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
  checkInterval: number = 100, // Check signal every 100ms
): Promise<T> {
  if (!signal) {
    // No signal provided, just execute normally
    return await fn();
  }

  // Create a promise that rejects when signal is aborted
  const abortPromise = new Promise<never>((_, reject) => {
    const checkSignal = () => {
      if (signal.aborted) {
        reject(new Error("WORKFLOW_SUSPENDED"));
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
        reject(new Error("WORKFLOW_SUSPENDED"));
      },
      { once: true },
    );
  });

  // Race between the actual function and abort signal
  return Promise.race([fn(), abortPromise]);
}

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
  }: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>,
  ...steps: ReadonlyArray<BaseStep>
) {
  // ✅ Ensure every workflow has memory (like Agent system)
  const effectiveMemory = workflowMemory || new LibSQLStorage({ url: "file:memory.db" });

  // Set default schemas if not provided
  const effectiveSuspendSchema = suspendSchema || z.any();
  const effectiveResumeSchema = resumeSchema || z.any();

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
    createSuspendController: () => {
      const abortController = new AbortController();
      let suspensionReason: string | undefined;
      let suspended = false;

      return {
        signal: abortController.signal,
        suspend: (reason?: string) => {
          suspensionReason = reason;
          suspended = true;
          abortController.abort();
        },
        isSuspended: () => suspended,
        getReason: () => suspensionReason,
      };
    },
    run: async (input: WorkflowInput<INPUT_SCHEMA>, options?: WorkflowRunOptions) => {
      const workflowRegistry = WorkflowRegistry.getInstance();

      let historyEntry: any;
      let executionId: string;

      // Check if resuming an existing execution
      if (options?.resumeFrom?.executionId) {
        executionId = options.resumeFrom.executionId;
        devLogger.info(`[Workflow] Resuming execution ${executionId} for workflow ${id}`);

        // Get the existing history entry and update its status
        try {
          const workflowMemoryManager = workflowRegistry.getWorkflowMemoryManager(id);
          if (workflowMemoryManager) {
            historyEntry = await workflowMemoryManager.getExecutionWithDetails(executionId);
            if (historyEntry) {
              devLogger.debug(
                `[Workflow] Found existing execution with status: ${historyEntry.status}`,
              );
              // Update status to running and clear suspension metadata
              await workflowRegistry.updateWorkflowExecution(id, executionId, {
                status: "running" as any,
                endTime: undefined, // Clear end time when resuming
                metadata: {
                  ...historyEntry.metadata,
                  resumedAt: new Date(),
                  suspension: undefined, // Clear suspension metadata
                },
              });
              devLogger.info(`[Workflow] Updated execution ${executionId} status to running`);

              // Re-fetch the updated entry
              historyEntry = await workflowMemoryManager.getExecutionWithDetails(executionId);
            } else {
              throw new Error(`Execution ${executionId} not found`);
            }
          } else {
            throw new Error(`No memory manager available for workflow: ${id}`);
          }
        } catch (error) {
          devLogger.error(`[Workflow] Failed to get/update resumed execution:`, error);
          throw error; // Re-throw to prevent creating a new execution
        }
      } else {
        // Create new execution
        executionId = options?.executionId || crypto.randomUUID();
        devLogger.info(
          `[Workflow] Creating new execution for workflow ${id} with executionId ${executionId}`,
        );

        try {
          devLogger.debug(
            `[Workflow] Attempting to create execution via WorkflowRegistry for workflow ${id}`,
          );
          historyEntry = await workflowRegistry.createWorkflowExecution(id, name, input, {
            userId: options?.userId,
            conversationId: options?.conversationId,
            userContext: options?.userContext,
          });

          if (historyEntry) {
            executionId = historyEntry.id;
            devLogger.info(
              `[Workflow] Successfully created execution via registry with executionId ${executionId}`,
            );
          } else {
            devLogger.warn(
              "[Workflow] Failed to create execution via WorkflowRegistry, using fallback",
            );
          }
        } catch (memoryError) {
          devLogger.error("Failed to create execution with WorkflowRegistry:", memoryError);
        }
      }

      // Get WorkflowMemoryManager for local operations
      const workflowMemoryManager = workflowRegistry.getWorkflowMemoryManager(id);
      if (!workflowMemoryManager) {
        throw new Error(`No memory manager available for workflow: ${id}`);
      }

      // ✅ Initialize WorkflowHistoryManager (like Agent system)
      const historyManager = new WorkflowHistoryManager(id, workflowMemoryManager);

      // Initialize workflow execution context with the correct execution ID
      const executionContext: WorkflowExecutionContext = {
        workflowId: id,
        executionId: executionId,
        workflowName: name,
        userContext: options?.userContext || new Map(),
        isActive: true,
        startTime: new Date(),
        currentStepIndex: 0,
        steps: [],
        signal: options?.signal, // Pass signal from options
        historyEntry: historyEntry,
        // Store effective memory for use in steps if needed
        memory: effectiveMemory,
        // Initialize step data map for tracking inputs/outputs
        stepData: new Map(),
        // Initialize event sequence - restore from resume or start at 0
        eventSequence: options?.resumeFrom?.lastEventSequence || 0,
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
            devLogger.debug(
              `[Workflow] Skipping already completed step ${index} (startStepIndex=${startStepIndex})`,
            );
            continue;
          }

          // Check for suspension signal before each step
          devLogger.debug(`[Workflow] Checking suspension signal at step ${index}`, {
            hasSignal: !!options?.signal,
            isAborted: options?.signal?.aborted,
            reason: (options?.signal as any)?.reason,
          });

          if (options?.signal?.aborted) {
            devLogger.info(
              `[Workflow] Suspension signal detected at step ${index} for execution ${executionId}`,
            );

            // Get the reason from suspension controller or registry
            let reason = "User requested suspension";

            // Check if we have a suspension controller with a reason
            if (options.suspendController?.getReason()) {
              reason = options.suspendController.getReason()!;
              devLogger.debug(`[Workflow] Using reason from suspension controller: ${reason}`);
            } else {
              // Fallback to registry's active executions
              const activeController = workflowRegistry.activeExecutions.get(executionId);
              if (activeController?.getReason()) {
                reason = activeController.getReason()!;
                devLogger.debug(`[Workflow] Using reason from registry: ${reason}`);
              }
            }
            devLogger.debug(`[Workflow] Final suspension reason: ${reason}`);
            const checkpoint = {
              stepExecutionState: stateManager.state.data,
              completedStepsData: (steps as BaseStep[])
                .slice(0, index)
                .map((s, i) => ({ stepIndex: i, stepName: s.name || `Step ${i + 1}` })),
            };

            devLogger.debug(
              `[Workflow] Creating suspension with reason: ${reason}, suspendedStepIndex: ${index}`,
            );
            stateManager.suspend(reason, checkpoint, index);

            // Save suspension state to memory
            try {
              devLogger.debug(
                `[Workflow] Storing suspension checkpoint for execution ${executionId}`,
              );
              await workflowMemoryManager.storeSuspensionCheckpoint(
                executionId,
                stateManager.state.suspension,
              );
              devLogger.info(
                `[Workflow] Successfully stored suspension checkpoint for execution ${executionId}`,
              );
            } catch (suspendError) {
              devLogger.error(
                `[Workflow] Failed to save suspension state for execution ${executionId}:`,
                suspendError,
              );
              console.error("Failed to save suspension state:", suspendError);
            }

            // Update workflow execution status to suspended
            if (historyEntry) {
              try {
                devLogger.debug(
                  `[Workflow] Updating workflow execution status to suspended for ${executionId}`,
                );
                await workflowRegistry.updateWorkflowExecution(id, executionId, {
                  status: "suspended" as any,
                  endTime: new Date(),
                  metadata: {
                    ...historyEntry.metadata,
                    suspension: stateManager.state.suspension,
                  },
                });
                devLogger.info(`[Workflow] Updated workflow execution status to suspended`);
              } catch (updateError) {
                devLogger.error(
                  `[Workflow] Failed to update workflow status to suspended:`,
                  updateError,
                );
              }
            } else {
              devLogger.warn(`[Workflow] No historyEntry found, skipping status update`);
            }

            // Return suspended state
            devLogger.info(`[Workflow] Returning suspended state for execution ${executionId}`);
            return createWorkflowExecutionResult(
              id,
              executionId,
              stateManager.state.startAt,
              new Date(),
              "suspended",
              null,
              stateManager.state.suspension,
              undefined,
              effectiveResumeSchema,
            );
          }

          executionContext.currentStepIndex = index;

          // ✅ NEW: Record step start (persistent step tracking)
          let stepRecord: WorkflowStepHistoryEntry | null = null;
          try {
            stepRecord = await historyManager.recordStepStart(
              executionId,
              index,
              step.type as "agent" | "func" | "conditional-when" | "parallel-all" | "parallel-race",
              step.name || step.id || `Step ${index + 1}`, // ✅ FIX: Include step.id fallback
              stateManager.state.data,
              {
                stepId: step.id,
                metadata: {
                  stepConfig: step,
                  stepIndex: index,
                },
              },
            );
          } catch (stepError) {
            console.warn(`Failed to record step start for step ${index}:`, stepError);
          }

          await hooks?.onStepStart?.(stateManager.state);

          // Store step input data before execution
          executionContext.stepData.set(step.id, {
            input: stateManager.state.data,
            output: null,
          });

          // Use step-level schemas if available, otherwise fall back to workflow-level
          const stepSuspendSchema = step.suspendSchema || effectiveSuspendSchema;
          const stepResumeSchema = step.resumeSchema || effectiveResumeSchema;

          // Create suspend function for this step
          const suspendFn = async (reason?: string, suspendData?: any): Promise<never> => {
            devLogger.info(
              `[Workflow] Step ${index} requested suspension: ${reason || "No reason provided"}`,
            );

            // Store suspend data to be validated later when actually suspending
            if (suspendData !== undefined) {
              executionContext.userContext.set("suspendData", suspendData);
            }

            // Trigger suspension via the controller
            if (options?.suspendController) {
              options.suspendController.suspend(reason || "Step requested suspension");
            }

            // Throw a special error that will be caught by the workflow
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

            const stepContext = createStepExecutionContext<
              WorkflowInput<INPUT_SCHEMA>,
              typeof stateManager.state.data,
              z.infer<typeof stepSuspendSchema>,
              z.infer<typeof stepResumeSchema>
            >(
              stateManager.state.data,
              convertWorkflowStateToParam(stateManager.state, executionContext, options?.signal),
              executionContext,
              typedSuspendFn,
              isResumingThisStep ? resumeInputData : undefined,
            );
            // Execute step with automatic signal checking for immediate suspension
            const result = await executeWithSignalCheck(
              () => step.execute(stepContext),
              options?.signal,
              options?.suspensionMode === "immediate" ? 50 : 500, // Check more frequently in immediate mode
            );

            // Update step output data after successful execution
            const stepData = executionContext.stepData.get(step.id);
            if (stepData) {
              stepData.output = result;
            }

            stateManager.update({
              data: result,
              result: result,
            });

            // ✅ NEW: Record step completion (persistent step tracking)
            if (stepRecord) {
              try {
                await historyManager.recordStepEnd(stepRecord.id, {
                  status: "completed",
                  output: result,
                  metadata: {
                    completedAt: new Date().toISOString(),
                  },
                });
              } catch (stepEndError) {
                console.warn(`Failed to record step completion for step ${index}:`, stepEndError);
              }
            }

            await hooks?.onStepEnd?.(stateManager.state);
          } catch (stepError) {
            // Check if this is a suspension, not an error
            if (stepError instanceof Error && stepError.message === "WORKFLOW_SUSPENDED") {
              devLogger.info(`[Workflow] Step ${index} suspended during execution`);

              // Handle suspension
              const suspensionReason =
                options?.suspendController?.getReason() || "Step suspended during execution";

              // Get suspend data if provided
              const suspendData = executionContext.userContext.get("suspendData");

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

              devLogger.info(`[Workflow] Workflow suspended at step ${index}`, suspensionMetadata);

              // First publish step suspend event
              const stepCtx = createStepContext(
                executionContext,
                step.type as
                  | "agent"
                  | "func"
                  | "conditional-when"
                  | "parallel-all"
                  | "parallel-race",
                step.name || step.id || `Step ${index + 1}`,
              );

              const stepSuspendEvent = createWorkflowStepSuspendEvent(
                stepCtx,
                executionContext,
                suspensionReason,
                undefined, // No parent event ID for workflow-level suspension
                {
                  userContext: executionContext.userContext
                    ? Object.fromEntries(executionContext.userContext)
                    : undefined,
                },
              );

              try {
                await publishWorkflowEvent(stepSuspendEvent, executionContext);
              } catch (eventError) {
                console.warn("Failed to publish workflow step suspend event:", eventError);
              }

              // Then publish workflow suspend event
              const workflowSuspendEvent = createWorkflowSuspendEvent(
                executionContext,
                suspensionReason,
                index,
                workflowStartEvent.id,
              );

              try {
                await publishWorkflowEvent(workflowSuspendEvent, executionContext);
              } catch (eventError) {
                console.warn("Failed to publish workflow suspend event:", eventError);
              }

              // Update workflow status to suspended
              if (historyEntry) {
                try {
                  await workflowRegistry.updateWorkflowExecution(id, executionContext.executionId, {
                    status: "suspended" as any,
                    endTime: new Date(),
                    metadata: {
                      suspension: suspensionMetadata,
                      lastActiveStep: index,
                    },
                  });
                  devLogger.info(`[Workflow] Updated workflow execution status to suspended`);
                } catch (updateError) {
                  devLogger.error(
                    `[Workflow] Failed to update workflow status to suspended:`,
                    updateError,
                  );
                }
              }

              // Return suspended state without throwing
              return createWorkflowExecutionResult(
                id,
                executionId,
                stateManager.state.startAt,
                new Date(),
                "suspended",
                null,
                stateManager.state.suspension,
                undefined,
                effectiveResumeSchema,
              );
            }

            // ✅ NEW: Record step error (persistent step tracking)
            if (stepRecord) {
              try {
                await historyManager.recordStepEnd(stepRecord.id, {
                  status: "error",
                  errorMessage: stepError instanceof Error ? stepError.message : String(stepError),
                  metadata: {
                    errorOccurredAt: new Date().toISOString(),
                    errorDetails: stepError,
                  },
                });
              } catch (stepEndError) {
                console.warn(`Failed to record step error for step ${index}:`, stepEndError);
              }
            }
            throw stepError; // Re-throw the original error
          }
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
            await workflowRegistry.updateWorkflowExecution(id, executionContext.executionId, {
              status: "completed",
              endTime: new Date(),
              output: finalState.result,
            });
          } catch (registrationError) {
            console.warn("Failed to record workflow completion:", registrationError);
          }
        }

        await hooks?.onEnd?.(stateManager.state);

        return createWorkflowExecutionResult(
          id,
          executionId,
          finalState.startAt,
          finalState.endAt,
          "completed",
          finalState.result as z.infer<RESULT_SCHEMA>,
          undefined,
          undefined,
          effectiveResumeSchema,
        );
      } catch (error) {
        // Check if this is a suspension, not an error
        if (error instanceof Error && error.message === "WORKFLOW_SUSPENDED") {
          devLogger.info(`[Workflow] Workflow suspended (caught at top level)`);
          // This case should be handled in the step catch block,
          // but just in case it bubbles up here
          return createWorkflowExecutionResult(
            id,
            executionId,
            stateManager.state.startAt,
            new Date(),
            "suspended",
            null,
            stateManager.state.suspension,
          );
        }

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
            await workflowRegistry.updateWorkflowExecution(id, executionContext.executionId, {
              status: "error",
              endTime: new Date(),
              output: error,
            });
          } catch (registrationError) {
            console.warn("Failed to record workflow failure:", registrationError);
          }
        }

        stateManager.fail(error);
        await hooks?.onEnd?.(stateManager.state);

        // Return error state
        return createWorkflowExecutionResult(
          id,
          executionId,
          stateManager.state.startAt,
          new Date(),
          "error",
          null,
          undefined,
          error,
          effectiveResumeSchema,
        );
      }
    },
  } satisfies Workflow<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>;
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
