import type { DangerouslyAllowAny, PlainObject } from "@voltagent/internal/types";
import type * as TF from "type-fest";
import type { z } from "zod";
import type { BaseMessage } from "../../agent/providers";
import type { WorkflowState } from "./state";
import type { WorkflowExecutionContext } from "../context";

/**
 * The base input type for the workflow
 * @private - INTERNAL USE ONLY
 */
export type InternalBaseWorkflowInputSchema = z.ZodTypeAny | BaseMessage | BaseMessage[] | string;

/**
 * The state parameter for the workflow, used to pass the state to a step or other function (i.e. hooks)
 * @private - INTERNAL USE ONLY
 */
export type InternalWorkflowStateParam<INPUT> = Omit<
  WorkflowState<INPUT, DangerouslyAllowAny>,
  "data" | "result"
> & {
  /** Workflow execution context for event tracking */
  workflowContext?: WorkflowExecutionContext;
  /** AbortSignal for checking suspension during step execution */
  signal?: AbortSignal;
};

/**
 * Context object for new execute API with helper functions
 * @private - INTERNAL USE ONLY
 */
export interface WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA> {
  data: InternalExtractWorkflowInputData<DATA>;
  state: InternalWorkflowStateParam<INPUT>;
  getStepData: (stepId: string) => { input: any; output: any } | undefined;
  suspend: (reason?: string, suspendData?: SUSPEND_DATA) => Promise<never>;
  resumeData?: RESUME_DATA;
}

/**
 * A function that can be executed by the workflow
 * Uses context-based API with data, state, and helper functions
 * @private - INTERNAL USE ONLY
 */
export type InternalWorkflowFunc<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA> = (
  context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>,
) => Promise<RESULT>;

export type InternalWorkflowStepConfig<T extends PlainObject = PlainObject> = {
  /**
   * Unique identifier for the step
   * @required - Must be provided for proper step tracking
   */
  id: string;
  /**
   * Human-readable name for the step
   */
  name?: string;
  /**
   * Description of what the step does
   */
  purpose?: string;
} & T;

/**
 * Base step interface for building new steps
 * @private - INTERNAL USE ONLY
 */
export interface InternalBaseWorkflowStep<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA> {
  /**
   * Unique identifier for the step
   */
  id: string;
  /**
   * Human-readable name for the step
   */
  name: string | null;
  /**
   * Description of what the step does
   */
  purpose: string | null;
  /**
   * Type identifier for the step
   */
  type: string;
  /**
   * Optional input schema for runtime validation
   */
  inputSchema?: z.ZodTypeAny;
  /**
   * Optional output schema for runtime validation
   */
  outputSchema?: z.ZodTypeAny;
  /**
   * Optional suspend data schema for this step
   */
  suspendSchema?: z.ZodTypeAny;
  /**
   * Optional resume data schema for this step
   */
  resumeSchema?: z.ZodTypeAny;
  /**
   * Execute the step with the given context
   * @param context - The execution context containing data, state, and helpers
   * @returns The result of the step
   */
  execute: (
    context: WorkflowExecuteContext<INPUT, DATA, SUSPEND_DATA, RESUME_DATA>,
  ) => Promise<RESULT>;
}

/**
 * Any step that can be accepted by the workflow
 * @private - INTERNAL USE ONLY
 */
export type InternalAnyWorkflowStep<
  INPUT,
  DATA = DangerouslyAllowAny,
  RESULT = DangerouslyAllowAny,
  SUSPEND_DATA = DangerouslyAllowAny,
  RESUME_DATA = DangerouslyAllowAny,
> =
  | InternalBaseWorkflowStep<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>
  | Omit<InternalBaseWorkflowStep<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>, "type">;

/**
 * Infer the result type from a list of steps
 * @private - INTERNAL USE ONLY
 */
export type InternalInferWorkflowStepsResult<
  STEPS extends ReadonlyArray<
    InternalAnyWorkflowStep<DangerouslyAllowAny, DangerouslyAllowAny, DangerouslyAllowAny>
  >,
> = {
  [K in keyof STEPS]: Awaited<ReturnType<STEPS[K]["execute"]>>;
};

// Awaited<ReturnType<GetFunc<STEPS[K]>>>

export type InternalExtractWorkflowInputData<T> = TF.IsUnknown<T> extends true
  ? BaseMessage | BaseMessage[] | string
  : TF.IsAny<T> extends true
    ? BaseMessage | BaseMessage[] | string
    : T extends z.ZodType
      ? z.infer<T>
      : T;

// type GetFunc<T> = T extends InternalAnyWorkflowStep<
//   DangerouslyAllowAny,
//   DangerouslyAllowAny,
//   DangerouslyAllowAny
// >
//   ? T["execute"]
//   : never;
