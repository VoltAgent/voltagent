import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "../../agent";
import type {
  InternalAnyWorkflowStep,
  InternalBaseWorkflowStep,
  InternalExtractWorkflowInputData,
  InternalWorkflowFunc,
} from "../internal/types";

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

export interface WorkflowStepFunc<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "func";
  fn: InternalWorkflowFunc<INPUT, DATA, RESULT>;
}

export interface WorkflowStepConditionalWhen<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, InternalExtractWorkflowInputData<DATA> | RESULT> {
  type: "conditional-when";
  condition: InternalWorkflowFunc<INPUT, DATA, boolean>;
}

export interface WorkflowStepParallelRace<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT> {
  type: "parallel-race";
  steps: ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>;
}

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
