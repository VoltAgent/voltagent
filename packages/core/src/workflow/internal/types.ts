import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny, PlainObject } from "@voltagent/internal/types";
import type { UIMessage } from "ai";
import type * as TF from "type-fest";
import type { z } from "zod";
import type { BaseMessage } from "../../agent/providers";
import type { WorkflowExecutionContext } from "../context";
import type { WorkflowStepData, WorkflowStreamWriter } from "../types";
import type { WorkflowState } from "./state";

/**
 * The base input type for the workflow
 * @private - INTERNAL USE ONLY
 */
export type InternalBaseWorkflowInputSchema =
  | z.ZodTypeAny
  | BaseMessage
  | BaseMessage[]
  | UIMessage
  | UIMessage[]
  | string;

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
  data: DATA;
  state: InternalWorkflowStateParam<INPUT>;
  getStepData: (stepId: string) => WorkflowStepData | undefined;
  suspend: (reason?: string, suspendData?: SUSPEND_DATA) => Promise<never>;
  resumeData?: RESUME_DATA;
  retryCount?: number;
  /**
   * Logger instance for this workflow execution.
   * Provides execution-scoped logging with full context (userId, conversationId, executionId).
   */
  logger: Logger;
  /**
   * Stream writer for emitting events during streaming execution.
   * Always available - uses NoOpWorkflowStreamWriter when not streaming
   */
  writer: WorkflowStreamWriter;
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
  /**
   * Number of retry attempts when the step throws an error
   */
  retries?: number;
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
   * Number of retry attempts when the step throws an error
   */
  retries?: number;
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
  INPUT = DangerouslyAllowAny,
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
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<any, any, any, any, any>>,
> = {
  [K in keyof STEPS]: ExtractExecuteResult<STEPS[K]>;
};

export type InternalExtractWorkflowInputData<T> = TF.IsUnknown<T> extends true
  ? BaseMessage | BaseMessage[] | UIMessage | UIMessage[] | string
  : TF.IsAny<T> extends true
    ? BaseMessage | BaseMessage[] | UIMessage | UIMessage[] | string
    : T extends z.ZodType
      ? z.infer<T>
      : T;

/*
|------------------
| Internals
|------------------
*/

// Type to extract the awaited return type from an execute function
type ExtractExecuteResult<T> = T extends { execute: (...args: any[]) => infer R }
  ? R extends Promise<infer U>
    ? U
    : R
  : never;
