import type { DangerouslyAllowAny, PlainObject } from "@voltagent/internal/types";
import type * as TF from "type-fest";
import type { z } from "zod";
import type { BaseMessage } from "../../agent/providers";
import type { WorkflowState } from "./state";

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
>;

/**
 * A function that can be executed by the workflow
 * @private - INTERNAL USE ONLY
 */
export type InternalWorkflowFunc<INPUT, DATA, RESULT> = (
  data: InternalExtractWorkflowInputData<DATA>,
  state: InternalWorkflowStateParam<INPUT>,
) => Promise<RESULT>;

export type InternalWorkflowStepConfig<T extends PlainObject = PlainObject> = {
  /**
   * Unique identifier for the step
   * @default uuidv4
   */
  id?: string;
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
export interface InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
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
   * Execute the step with the given data
   * @param data - The data to execute the step with
   * @param state - The state of the workflow
   * @returns The result of the step
   */
  execute: (
    data: InternalExtractWorkflowInputData<DATA>,
    state: InternalWorkflowStateParam<INPUT>,
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
> =
  | InternalBaseWorkflowStep<INPUT, DATA, RESULT>
  | Omit<InternalBaseWorkflowStep<INPUT, DATA, RESULT>, "type">;

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
    : T;

// type GetFunc<T> = T extends InternalAnyWorkflowStep<
//   DangerouslyAllowAny,
//   DangerouslyAllowAny,
//   DangerouslyAllowAny
// >
//   ? T["execute"]
//   : never;
