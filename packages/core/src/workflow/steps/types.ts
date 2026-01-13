import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { InputGuardrail, OutputGuardrail } from "../../agent/types";
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
  | "tap"
  | "workflow"
  | "guardrail"
  | "conditional-when"
  | "parallel-all"
  | "parallel-race"
  | "sleep"
  | "sleep-until"
  | "foreach"
  | "loop"
  | "branch"
  | "map";

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

export type WorkflowStepGuardrailConfig<_INPUT, DATA> = InternalWorkflowStepConfig<{
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<DATA>[];
}>;

export interface WorkflowStepGuardrail<INPUT, DATA>
  extends InternalBaseWorkflowStep<INPUT, DATA, DATA, any, any> {
  type: "guardrail";
  inputGuardrails?: InputGuardrail[];
  outputGuardrails?: OutputGuardrail<DATA>[];
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

export type WorkflowStepSleepConfig<INPUT, DATA> = InternalWorkflowStepConfig<{
  duration: number | InternalWorkflowFunc<INPUT, DATA, number, any, any>;
}>;

export interface WorkflowStepSleep<INPUT, DATA>
  extends InternalBaseWorkflowStep<INPUT, DATA, DATA, any, any> {
  type: "sleep";
  duration: number | InternalWorkflowFunc<INPUT, DATA, number, any, any>;
}

export type WorkflowStepSleepUntilConfig<INPUT, DATA> = InternalWorkflowStepConfig<{
  date: Date | InternalWorkflowFunc<INPUT, DATA, Date, any, any>;
}>;

export interface WorkflowStepSleepUntil<INPUT, DATA>
  extends InternalBaseWorkflowStep<INPUT, DATA, DATA, any, any> {
  type: "sleep-until";
  date: Date | InternalWorkflowFunc<INPUT, DATA, Date, any, any>;
}

export type WorkflowStepForEachConfig<INPUT, ITEM, RESULT> = InternalWorkflowStepConfig<{
  step: InternalAnyWorkflowStep<INPUT, ITEM, RESULT>;
  concurrency?: number;
}>;

export interface WorkflowStepForEach<INPUT, ITEM, RESULT>
  extends InternalBaseWorkflowStep<INPUT, ITEM[], RESULT[], any, any> {
  type: "foreach";
  step: InternalAnyWorkflowStep<INPUT, ITEM, RESULT>;
  concurrency?: number;
}

export type WorkflowStepLoopConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  step: InternalAnyWorkflowStep<INPUT, DATA, RESULT>;
  condition: InternalWorkflowFunc<INPUT, RESULT, boolean, any, any>;
}>;

export interface WorkflowStepLoop<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, RESULT, any, any> {
  type: "loop";
  loopType: "dowhile" | "dountil";
  step: InternalAnyWorkflowStep<INPUT, DATA, RESULT>;
  condition: InternalWorkflowFunc<INPUT, RESULT, boolean, any, any>;
}

export type WorkflowStepBranchConfig<INPUT, DATA, RESULT> = InternalWorkflowStepConfig<{
  branches: ReadonlyArray<{
    condition: InternalWorkflowFunc<INPUT, DATA, boolean, any, any>;
    step: InternalAnyWorkflowStep<INPUT, DATA, RESULT>;
  }>;
}>;

export interface WorkflowStepBranch<INPUT, DATA, RESULT>
  extends InternalBaseWorkflowStep<INPUT, DATA, Array<RESULT | undefined>, any, any> {
  type: "branch";
  branches: ReadonlyArray<{
    condition: InternalWorkflowFunc<INPUT, DATA, boolean, any, any>;
    step: InternalAnyWorkflowStep<INPUT, DATA, RESULT>;
  }>;
}

export type WorkflowStepMapEntry<INPUT, DATA> =
  | { source: "value"; value: unknown }
  | { source: "data"; path?: string }
  | { source: "input"; path?: string }
  | { source: "step"; stepId: string; path?: string }
  | { source: "context"; key: string; path?: string }
  | { source: "fn"; fn: InternalWorkflowFunc<INPUT, DATA, unknown, any, any> };

type WorkflowStepMapEntryResult<ENTRY> = ENTRY extends { source: "value"; value: infer VALUE }
  ? VALUE
  : ENTRY extends { source: "fn"; fn: (...args: any[]) => Promise<infer RESULT> }
    ? RESULT
    : unknown;

export type WorkflowStepMapResult<MAP extends Record<string, WorkflowStepMapEntry<any, any>>> = {
  [KEY in keyof MAP]: WorkflowStepMapEntryResult<MAP[KEY]>;
};

export type WorkflowStepMapConfig<
  INPUT,
  DATA,
  MAP extends Record<string, WorkflowStepMapEntry<INPUT, DATA>>,
> = InternalWorkflowStepConfig<{
  map: MAP;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
}>;

export interface WorkflowStepMap<
  INPUT,
  DATA,
  MAP extends Record<string, WorkflowStepMapEntry<INPUT, DATA>>,
> extends InternalBaseWorkflowStep<INPUT, DATA, WorkflowStepMapResult<MAP>, any, any> {
  type: "map";
  map: MAP;
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
  | WorkflowStepGuardrail<INPUT, DATA>
  | WorkflowStepParallelAll<INPUT, DATA, RESULT>
  | WorkflowStepTap<INPUT, DATA, RESULT, SUSPEND_DATA>
  | WorkflowStepParallelRace<INPUT, DATA, RESULT>
  | WorkflowStepWorkflow<INPUT, DATA, RESULT, SUSPEND_DATA>
  | WorkflowStepSleep<INPUT, DATA>
  | WorkflowStepSleepUntil<INPUT, DATA>
  | WorkflowStepForEach<INPUT, any, any>
  | WorkflowStepLoop<INPUT, DATA, RESULT>
  | WorkflowStepBranch<INPUT, DATA, RESULT>
  | WorkflowStepMap<INPUT, DATA, Record<string, WorkflowStepMapEntry<INPUT, DATA>>>;

/**
 * Internal type to allow overriding the run method for the workflow
 */
export interface InternalWorkflow<_INPUT, DATA, RESULT>
  extends Omit<Workflow<DangerouslyAllowAny, DangerouslyAllowAny>, "run"> {
  run: (
    input: DATA,
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
