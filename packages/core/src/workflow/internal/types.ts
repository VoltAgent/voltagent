import type { DangerouslyAllowAny } from "@voltagent/internal/types";
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

/**
 * Base step interface for building new steps
 * @private - INTERNAL USE ONLY
 */
export interface InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  /** Type identifier for the step */
  type: string;
  /** Execute the step with the given data */
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
> = InternalBaseWorkflowStep<INPUT, DATA, RESULT> | InternalWorkflowFunc<INPUT, DATA, RESULT>;

/**
 * Infer the result type from a list of steps
 * @private - INTERNAL USE ONLY
 */
export type InternalInferWorkflowStepsResult<
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<DangerouslyAllowAny, DangerouslyAllowAny>>,
> = { [K in keyof STEPS]: Awaited<ReturnType<GetFunc<STEPS[K]>>> };

export type InternalExtractWorkflowInputData<T> = TF.IsUnknown<T> extends true
  ? BaseMessage | BaseMessage[] | string
  : TF.IsAny<T> extends true
    ? BaseMessage | BaseMessage[] | string
    : T;

type GetFunc<T> = T extends (...args: DangerouslyAllowAny) => DangerouslyAllowAny
  ? T
  : T extends InternalBaseWorkflowStep<
        DangerouslyAllowAny,
        DangerouslyAllowAny,
        DangerouslyAllowAny
      >
    ? T["execute"]
    : never;
