import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import type { Agent } from "../../agent";
import type { PublicGenerateOptions } from "../../agent/types";
import type {
  InternalAnyWorkflowStep,
  InternalBaseWorkflowStep,
  InternalExtractWorkflowInputData,
  InternalWorkflowFunc,
  InternalWorkflowStepConfig,
} from "../internal/types";

export type WorkflowStepType =
  | "agent"
  | "func"
  | "conditional-when"
  | "parallel-all"
  | "parallel-race";

export type WorkflowStepAgentConfig<
  INPUT,
  DATA,
  SCHEMA extends z.ZodTypeAny,
> = InternalWorkflowStepConfig<{
  task: string | InternalWorkflowFunc<INPUT, DATA, string>;
  agent: Agent<{ llm: DangerouslyAllowAny }>;
  config: PublicGenerateOptions & {
    schema: SCHEMA;
  };
}>;

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
  | WorkflowStepParallelRace<INPUT, DATA, RESULT>;
