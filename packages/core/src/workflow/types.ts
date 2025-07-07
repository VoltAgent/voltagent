import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "../agent/index";
import type { ConditionalWith } from "./internal/pattern";

export interface WorkflowRunOptions {
  active?: number;
  executionId?: string;
}

export type WorkflowHooks<DATA, RESULT> = {
  onStart?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
  onStepStart?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
  onStepEnd?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
  onEnd?: (state: WorkflowState<DATA, RESULT>) => Promise<void>;
};

export type WorkflowState<DATA, RESULT> = {
  executionId: string;
  active: number;
  startAt: Date;
  endAt: Date | null;
  status: "pending" | "running" | "completed" | "failed";
  data: DATA;
  result: RESULT | null;
  error: Error | null;
};

export type WorkflowFunc<DATA, RESULT> = (data: DATA) => Promise<RESULT>;

export type WorkflowStepType =
  | "agent"
  | "func"
  | "conditional-when"
  | "conditional-with"
  | "parallel-all"
  | "parallel-race";

export interface WorkflowStepAgent<DATA, RESULT> extends InternalBaseStep<DATA, RESULT> {
  type: "agent";
  agent: Agent<{ llm: DangerouslyAllowAny }>;
}

export interface WorkflowStepFunc<DATA, RESULT> extends InternalBaseStep<DATA, RESULT> {
  type: "func";
  fn: WorkflowFunc<DATA, RESULT>;
}

export interface WorkflowStepConditionalWhen<DATA, RESULT>
  extends InternalBaseStep<DATA, RESULT | DATA> {
  type: "conditional-when";
  condition: (data: DATA) => boolean;
}

export interface WorkflowStepConditionalWith<DATA, RESULT>
  extends InternalBaseStep<DATA, RESULT | DATA> {
  type: "conditional-with";
  condition: ConditionalWith<DATA, RESULT>;
}

export interface WorkflowStepParallelRace<DATA, RESULT> extends InternalBaseStep<DATA, RESULT> {
  type: "parallel-race";
  steps: ReadonlyArray<InternalAnyStep<DATA, RESULT>>;
}

export interface WorkflowStepParallelAll<DATA, RESULT> extends InternalBaseStep<DATA, RESULT> {
  type: "parallel-all";
  steps: ReadonlyArray<InternalAnyStep<DATA, RESULT>>;
}

export type WorkflowStep<DATA, RESULT> =
  | WorkflowStepAgent<DATA, RESULT>
  | WorkflowStepFunc<DATA, RESULT>
  | WorkflowStepConditionalWhen<DATA, RESULT>
  | WorkflowStepConditionalWith<DATA, RESULT>
  | WorkflowStepParallelAll<DATA, RESULT>
  | WorkflowStepParallelRace<DATA, RESULT>;

/*
|------------------
| Internals
|------------------
*/

export interface InternalBaseStep<DATA, RESULT> {
  /** Type identifier for the step */
  type: string;
  /** Execute the step with the given data */
  execute: (data: DATA) => Promise<RESULT>;
}

/** @private */
export type InternalAnyStep<DATA = DangerouslyAllowAny, RESULT = DangerouslyAllowAny> =
  | InternalBaseStep<DATA, RESULT>
  | WorkflowFunc<DATA, RESULT>;

export type InternalInferStepsResult<
  STEPS extends ReadonlyArray<InternalAnyStep<DangerouslyAllowAny, DangerouslyAllowAny>>,
> = { [K in keyof STEPS]: Awaited<ReturnType<GetFunc<STEPS[K]>>> };

type GetFunc<T> = T extends (...args: any) => any
  ? T
  : T extends InternalBaseStep<any, any>
    ? T["execute"]
    : never;
