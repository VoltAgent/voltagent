import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "../../agent/agent";
import type {
  InternalAnyWorkflowStep,
  InternalBaseWorkflowStep,
  InternalExtractWorkflowInputData,
  InternalWorkflowFunc,
  InternalWorkflowStepConfig,
} from "../internal/types";
import type { Workflow, WorkflowRunOptions } from "../types";

export type WorkflowStepType =
  | "agent"
  | "func"
  | "conditional-when"
  | "parallel-all"
  | "parallel-race";

export interface WorkflowStepAgent<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "agent";
  agent: Agent<{ llm: DangerouslyAllowAny }>;
}

export type WorkflowStepFuncConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  execute: InternalWorkflowFunc<INPUT, DATA, RESULT>;
}>;

export interface WorkflowStepFunc<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "func";
}

export interface WorkflowStepWorkflow<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "workflow";
  workflow: InternalWorkflow<INPUT, DATA, RESULT>;
}
export type WorkflowStepTapConfig<INPUT, DATA, _RESULT> = InternalWorkflowStepConfig<{
  execute: InternalWorkflowFunc<INPUT, DATA, DangerouslyAllowAny>;
}>;

export interface WorkflowStepTap<INPUT, DATA, _RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, DATA> {
  type: "tap";
}

export type WorkflowStepConditionalWhenConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  condition: InternalWorkflowFunc<INPUT, DATA, boolean>;
  step: InternalAnyWorkflowStep<INPUT, DATA, RESULT>;
}>;

export interface WorkflowStepConditionalWhen<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, InternalExtractWorkflowInputData<DATA> | RESULT> {
  type: "conditional-when";
  condition: InternalWorkflowFunc<INPUT, DATA, boolean>;
}

export type WorkflowStepParallelRaceConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  steps: ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>;
}>;

export interface WorkflowStepParallelRace<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "parallel-race";
  steps: ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>;
}

export type WorkflowStepParallelAllConfig<
  STEPS extends ReadonlyArray<InternalAnyWorkflowStep<DangerouslyAllowAny, DangerouslyAllowAny>>,
> = InternalWorkflowStepConfig<{
  steps: STEPS;
}>;

export interface WorkflowStepParallelAll<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "parallel-all";
  steps: ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>;
}

export type WorkflowStep<INPUT, DATA, RESULT> =
  | WorkflowStepAgent<INPUT, DATA, RESULT>
  | WorkflowStepFunc<INPUT, DATA, RESULT>
  | WorkflowStepConditionalWhen<INPUT, DATA, RESULT>
  | WorkflowStepParallelAll<INPUT, DATA, RESULT>
  | WorkflowStepTap<INPUT, DATA, RESULT>
  | WorkflowStepParallelRace<INPUT, DATA, RESULT>
  | WorkflowStepWorkflow<INPUT, DATA, RESULT>;

/**
 * Internal type to allow overriding the run method for the workflow
 */
export interface InternalWorkflow<_INPUT, DATA, RESULT>
  extends Omit<Workflow<DangerouslyAllowAny, DangerouslyAllowAny>, "run"> {
  run: (
    input: InternalExtractWorkflowInputData<DATA>,
    options?: InternalWorkflowRunOptions,
  ) => Promise<{
    executionId: string;
    startAt: Date;
    endAt: Date;
    status: "completed";
    result: RESULT;
  }>;
}

export interface InternalWorkflowRunOptions extends WorkflowRunOptions {}
