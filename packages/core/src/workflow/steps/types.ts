import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import type { Agent } from "../../agent/agent";
import type {
  InternalAnyWorkflowStep,
  InternalBaseWorkflowStep,
  InternalExtractWorkflowInputData,
  InternalWorkflowFunc,
  InternalWorkflowStepConfig,
  WorkflowExecuteContext,
} from "../internal/types";
import type { Workflow, WorkflowRunOptions } from "../types";

export type WorkflowStepType =
  | "agent"
  | "func"
  | "conditional-when"
  | "parallel-all"
  | "parallel-race";

export interface WorkflowStepAgent<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT, any, any> {
  type: "agent";
  agent: Agent;
}

export type WorkflowStepFuncConfig<
  INPUT,
  DATA,
  RESULT,
  SUSPEND_DATA,
  RESUME_DATA = any,
> = InternalWorkflowStepConfig<{
  execute: InternalWorkflowFunc<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA>;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  suspendSchema?: z.ZodTypeAny;
  resumeSchema?: z.ZodTypeAny;
}>;

export interface WorkflowStepFunc<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA = any>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA> {
  type: "func";
}

export interface WorkflowStepWorkflow<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA = any>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT, SUSPEND_DATA, RESUME_DATA> {
  type: "workflow";
  workflow: InternalWorkflow<INPUT, DATA, RESULT>;
}

export type WorkflowStepTapConfig<
  INPUT,
  DATA,
  _RESULT,
  SUSPEND_DATA,
  RESUME_DATA = any,
> = InternalWorkflowStepConfig<{
  execute: InternalWorkflowFunc<INPUT, DATA, DangerouslyAllowAny, SUSPEND_DATA, RESUME_DATA>;
  inputSchema?: z.ZodTypeAny;
  suspendSchema?: z.ZodTypeAny;
  resumeSchema?: z.ZodTypeAny;
}>;

export interface WorkflowStepTap<INPUT, DATA, _RESULT, SUSPEND_DATA, RESUME_DATA = any>
  extends InternalBaseWorkflowStep<INPUT, DATA, DATA, SUSPEND_DATA, RESUME_DATA> {
  type: "tap";
}

export type WorkflowStepConditionalWhenConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  condition: InternalWorkflowFunc<INPUT, DATA, boolean, any, any>;
  step: InternalAnyWorkflowStep<INPUT, DATA, RESULT>;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  suspendSchema?: z.ZodTypeAny;
  resumeSchema?: z.ZodTypeAny;
}>;

export interface WorkflowStepConditionalWhen<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<
    INPUT,
    DATA,
    InternalExtractWorkflowInputData<DATA> | RESULT,
    any,
    any
  > {
  type: "conditional-when";
  condition: InternalWorkflowFunc<INPUT, DATA, boolean, any, any>;
}

export type WorkflowStepParallelRaceConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  steps: ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>;
}>;

export interface WorkflowStepParallelRace<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT, any, any> {
  type: "parallel-race";
  steps: ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>;
}

export type WorkflowStepParallelAllConfig<
  INPUT,
  DATA,
  RESULT,
  STEPS extends
    | ReadonlyArray<InternalAnyWorkflowStep<INPUT, DATA, RESULT>>
    | WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT>,
> = InternalWorkflowStepConfig<{
  steps: STEPS;
}>;

export interface WorkflowStepParallelAll<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT, any, any> {
  type: "parallel-all";
  steps:
    | WorkflowStepParallelSteps<INPUT, DATA, RESULT>
    | WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT>;
}

export type WorkflowStepParallelDynamicStepsFunc<INPUT, DATA, RESULT> = (
  context: WorkflowExecuteContext<INPUT, DATA, any, any>,
) => Promise<WorkflowStepParallelSteps<INPUT, DATA, RESULT>>;

export type WorkflowStepParallelSteps<INPUT, DATA, RESULT> = ReadonlyArray<
  InternalAnyWorkflowStep<INPUT, DATA, RESULT>
>;

export type WorkflowStep<INPUT, DATA, RESULT, SUSPEND_DATA = any> =
  | WorkflowStepAgent<INPUT, DATA, RESULT>
  | WorkflowStepFunc<INPUT, DATA, RESULT, SUSPEND_DATA>
  | WorkflowStepConditionalWhen<INPUT, DATA, RESULT>
  | WorkflowStepParallelAll<INPUT, DATA, RESULT>
  | WorkflowStepTap<INPUT, DATA, RESULT, SUSPEND_DATA>
  | WorkflowStepParallelRace<INPUT, DATA, RESULT>
  | WorkflowStepWorkflow<INPUT, DATA, RESULT, SUSPEND_DATA>;

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
