import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import type { Agent } from "../agent/index";
import { andAgent } from "./builder/and-agent";
import { andAll } from "./builder/and-all";
import { andRace } from "./builder/and-race";
import { andThen } from "./builder/and-then";
import { andWhen } from "./builder/and-when";
import { andWith } from "./builder/and-with";
import { createWorkflow } from "./core";
import type { ConditionalWith } from "./internal/pattern";
import type {
  InternalAnyStep,
  InternalInferStepsResult,
  WorkflowFunc,
  WorkflowStep,
} from "./types";

/**
 * Configuration for creating a workflow chain
 */
export type WorkflowChainConfig<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
> = {
  /** Unique identifier for the workflow */
  id: string;
  /** Human-readable name for the workflow */
  name: string;
  /** Description of what the workflow does */
  purpose: string;
  /** Schema for the input data */
  input: INPUT_SCHEMA;
  /** Schema for the result data */
  result: RESULT_SCHEMA;
};

/**
 * Agent configuration for the chain
 */
export type AgentConfig<SCHEMA extends z.ZodTypeAny> = {
  schema: SCHEMA;
};

/**
 * A workflow chain that provides a fluent API for building workflows
 */
export class WorkflowChain<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
  CURRENT_DATA = z.infer<INPUT_SCHEMA>,
> {
  private steps: WorkflowStep<DangerouslyAllowAny, DangerouslyAllowAny>[] = [];
  private config: WorkflowChainConfig<INPUT_SCHEMA, RESULT_SCHEMA>;

  constructor(config: WorkflowChainConfig<INPUT_SCHEMA, RESULT_SCHEMA>) {
    this.config = config;
  }

  /**
   * Add an agent step to the workflow
   * @param agent - The agent to execute
   * @param config - Configuration for the agent including schema
   * @returns A new chain with the agent step added
   */
  andAgent<SCHEMA extends z.ZodTypeAny>(
    task: string | ((data: CURRENT_DATA) => string),
    agent: Agent<{ llm: DangerouslyAllowAny }>,
    config: AgentConfig<SCHEMA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, z.infer<SCHEMA>> {
    const step = andAgent(task, agent, config);
    this.steps.push(step);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, z.infer<SCHEMA>>;
  }

  /**
   * Add a function step to the workflow
   * @param fn - The async function to execute
   * @returns A new chain with the function step added
   */
  andThen<NEW_DATA>(
    fn: (data: CURRENT_DATA) => Promise<NEW_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA> {
    const step = andThen(fn);
    this.steps.push(step);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA>;
  }

  /**
   * Add a conditional step that executes when a condition is true
   * @param condition - Function that determines if the step should execute
   * @param stepInput - Either a workflow step or an agent
   * @returns A new chain with the conditional step added
   */
  andWhen<NEW_DATA>(
    condition: (data: CURRENT_DATA) => boolean,
    stepInput: WorkflowStep<CURRENT_DATA, NEW_DATA> | WorkflowFunc<CURRENT_DATA, NEW_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA | CURRENT_DATA> {
    const step = andWhen(condition, stepInput);
    this.steps.push(step);
    return this as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA | CURRENT_DATA>;
  }

  /**
   * Add a pattern matching step to the workflow
   * @param patterns - The ts-pattern pattern(s) to match against
   * @param stepInput - Either a workflow step or an agent
   * @returns A new chain with the pattern matching step added
   */
  andWith<NEW_DATA>(
    patterns: ConditionalWith<CURRENT_DATA, NEW_DATA>,
    stepInput: WorkflowStep<CURRENT_DATA, NEW_DATA> | WorkflowFunc<CURRENT_DATA, NEW_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA | CURRENT_DATA> {
    const step = andWith(patterns, stepInput);
    this.steps.push(step);
    return this as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA | CURRENT_DATA>;
  }

  /**
   * Add a parallel execution step that runs multiple steps simultaneously
   * @param steps - Array of workflow steps to execute in parallel
   * @returns A new chain with the parallel step added
   */
  andAll<
    NEW_DATA,
    STEPS extends ReadonlyArray<InternalAnyStep<CURRENT_DATA, NEW_DATA>>,
    INFERRED_RESULT = InternalInferStepsResult<STEPS>,
  >(steps: STEPS): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT> {
    const step = andAll(steps as any);
    this.steps.push(step);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT>;
  }

  /**
   * Add a race execution step that runs multiple steps simultaneously and returns the first completed result
   * @param steps - Array of workflow steps to execute in parallel
   * @returns A new chain with the race step added
   */
  andRace<
    NEW_DATA,
    STEPS extends ReadonlyArray<InternalAnyStep<CURRENT_DATA, NEW_DATA>>,
    INFERRED_RESULT = InternalInferStepsResult<STEPS>[number],
  >(steps: STEPS): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT> {
    const step = andRace(steps as any);
    this.steps.push(step);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT>;
  }

  /**
   * Execute the workflow with the given input
   * @param input - The input data for the workflow
   * @returns The workflow execution result
   */
  async run(input: z.infer<INPUT_SCHEMA>) {
    // TODO: Fix type error
    // @ts-expect-error - need to fix but upstream types work
    const workflow = createWorkflow(this.config, ...this.steps);
    return await workflow.run(input);
  }
}

/**
 * Creates a new workflow chain with the given configuration
 * @param config - The workflow configuration
 * @returns A new workflow chain instance
 */
export function createWorkflowChain<
  INPUT_SCHEMA extends z.ZodTypeAny,
  RESULT_SCHEMA extends z.ZodTypeAny,
>(config: WorkflowChainConfig<INPUT_SCHEMA, RESULT_SCHEMA>) {
  return new WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA>(config);
}
