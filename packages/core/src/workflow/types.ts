import type { VercelAIProvider } from "@voltagent/vercel-ai";
import type { AllowedAny } from "#/utils/types";
import type { Agent } from "../agents";
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
  agent: Agent<{ llm: VercelAIProvider }>;
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
export type InternalAnyStep<DATA = AllowedAny, RESULT = AllowedAny> = InternalBaseStep<
  DATA,
  RESULT
>;

export type InternalInferStepsResult<
  STEPS extends ReadonlyArray<InternalAnyStep<AllowedAny, AllowedAny>>,
> = { [K in keyof STEPS]: Awaited<ReturnType<STEPS[K]["execute"]>> };
