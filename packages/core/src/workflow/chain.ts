import type { z } from "zod";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { Agent } from "../agent";
import { createWorkflow } from "./core";
import type {
  InternalAnyWorkflowStep,
  InternalBaseWorkflowInputSchema,
  InternalInferWorkflowStepsResult,
  InternalWorkflowFunc,
} from "./internal/types";
import {
  type WorkflowStep,
  type WorkflowStepConditionalWhenConfig,
  type WorkflowStepFuncConfig,
  type WorkflowStepParallelAllConfig,
  type WorkflowStepParallelRaceConfig,
  type WorkflowStepTapConfig,
  andAgent,
  andAll,
  andRace,
  andTap,
  andThen,
  andWhen,
} from "./steps";
import type { WorkflowConfig, WorkflowInput, WorkflowRunOptions, Workflow } from "./types";

/**
 * Agent configuration for the chain
 */
export type AgentConfig<SCHEMA extends z.ZodTypeAny> = {
  schema: SCHEMA;
};

/**
 * A workflow chain that provides a fluent API for building workflows
 *
 * @example
 * ```ts
 * const workflow = createWorkflowChain({
 *   id: "user-processing",
 *   name: "User Processing Workflow",
 *   purpose: "Process user data and generate personalized content",
 *   input: z.object({ userId: z.string(), userType: z.enum(["admin", "user"]) }),
 *   result: z.object({ processed: z.boolean(), content: z.string() }),
 *   memory: new LibSQLStorage({ url: "file:memory.db" }) // Optional workflow-specific memory
 * })
 *   .andThen(async (data) => {
 *     const userInfo = await fetchUserInfo(data.userId);
 *     return { ...data, userInfo };
 *   })
 *   .andWhen(
 *     (data) => data.userType === "admin",
 *     async (data) => ({ ...data, permissions: ["read", "write", "delete"] })
 *   )
 *   .andAgent(
 *     (data) => `Generate personalized content for ${data.userInfo.name}`,
 *     agent,
 *     { schema: z.object({ content: z.string() }) }
 *   )
 *   .andThen(async (data) => ({
 *     processed: true,
 *     content: data.content
 *   }));
 *
 * // Run with optional memory override
 * const result = await workflow.run(
 *   { userId: "123", userType: "admin" },
 *   { memory: new LibSQLStorage({ url: "file:memory.db" }) }
 * );
 * ```
 */
export class WorkflowChain<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  CURRENT_DATA = WorkflowInput<INPUT_SCHEMA>,
> {
  private steps: WorkflowStep<
    WorkflowInput<INPUT_SCHEMA>,
    DangerouslyAllowAny,
    DangerouslyAllowAny
  >[] = [];
  private config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>;

  constructor(config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>) {
    this.config = config;
  }

  /**
   * Creates an agent step for a workflow
   *
   * @example
   * ```ts
   * const w = createWorkflowChain<{ name: string }>()
   *   .andAgent(
   *     (data) => `Generate a greeting for the user ${data.name}`,
   *     agent,
   *     { schema: z.object({ greeting: z.string() }) }
   *   )
   *   .andThen(async (data) => data.greeting)
   * ```
   *
   * @param task - The task (prompt) to execute for the agent, can be a string or a function that returns a string
   * @param agent - The agent to execute the task using `generateObject`
   * @param config - The config for the agent (schema) `generateObject` call
   * @returns A workflow step that executes the agent with the task
   */
  andAgent<SCHEMA extends z.ZodTypeAny>(
    task: string | InternalWorkflowFunc<INPUT_SCHEMA, CURRENT_DATA, string>,
    agent: Agent<{ llm: DangerouslyAllowAny }>,
    config: AgentConfig<SCHEMA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, z.infer<SCHEMA>> {
    const step = andAgent(task, agent, config) as unknown as WorkflowStep<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      z.infer<SCHEMA> | DangerouslyAllowAny
    >;
    this.steps.push(step);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, z.infer<SCHEMA>>;
  }

  /**
   * Add a function step to the workflow
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andThen(async (data) => {
   *     const processed = await someAsyncOperation(data.value);
   *     return { ...data, processed };
   *   })
   *   .andThen(async (data) => {
   *     const enriched = await enrichData(data.processed);
   *     return { ...data, enriched };
   *   });
   * ```
   *
   * @param fn - The async function to execute with the current workflow data
   * @returns A new chain with the function step added
   */
  andThen<NEW_DATA>({
    execute,
    ...config
  }: WorkflowStepFuncConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    NEW_DATA
  > {
    const step = andThen({ execute, ...config }) as WorkflowStep<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      NEW_DATA
    >;
    this.steps.push(step);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA>;
  }

  /**
   * Add a conditional step that executes when a condition is true
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andWhen(
   *     (data) => data.userType === "admin",
   *     async (data) => ({ ...data, permissions: ["read", "write", "delete"] })
   *   )
   *   .andWhen(
   *     (data) => data.value > 1000,
   *     async (data) => ({ ...data, flagged: true, requiresReview: true })
   *   )
   *   .andWhen(
   *     (data) => data.status === "pending",
   *     (data) => andAgent(
   *       `Process pending request for ${data.userId}`,
   *       agent,
   *       { schema: z.object({ processed: z.boolean() }) }
   *     )
   *   );
   * ```
   *
   * @param condition - Function that determines if the step should execute based on the current data
   * @param stepInput - Either a workflow step or an agent to execute when the condition is true
   * @returns A new chain with the conditional step added
   */
  andWhen<NEW_DATA>({
    condition,
    step,
    ...config
  }: WorkflowStepConditionalWhenConfig<
    WorkflowInput<INPUT_SCHEMA>,
    CURRENT_DATA,
    NEW_DATA
  >): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA | CURRENT_DATA> {
    const finalStep = andWhen({ condition, step, ...config }) as WorkflowStep<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      NEW_DATA
    >;
    this.steps.push(finalStep);
    return this as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA | CURRENT_DATA>;
  }

  /**
   * Add a tap step to the workflow
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andTap({
   *     execute: async (data) => {
   *       console.log("🔄 Translating text:", data);
   *     }
   *   })
   *   .andThen({
   *     // the input data is still the same as the andTap ONLY executes, it doesn't return anything
   *     execute: async (data) => {
   *       return { ...data, translatedText: data.translatedText };
   *     }
   *   });
   * ```
   *
   * @param fn - The async function to execute with the current workflow data
   * @returns A new chain with the tap step added
   */
  andTap<NEW_DATA>({
    execute,
    ...config
  }: WorkflowStepTapConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    CURRENT_DATA
  > {
    const finalStep = andTap({ execute, ...config }) as WorkflowStep<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      NEW_DATA
    >;
    this.steps.push(finalStep);
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, CURRENT_DATA>;
  }

  /**
   * Add a parallel execution step that runs multiple steps simultaneously and waits for all to complete
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andAll([
   *     async (data) => {
   *       const userInfo = await fetchUserInfo(data.userId);
   *       return { userInfo };
   *     },
   *     async (data) => {
   *       const permissions = await fetchPermissions(data.userId);
   *       return { permissions };
   *     },
   *     (data) => andAgent(
   *       `Generate recommendations for user ${data.userId}`,
   *       agent,
   *       { schema: z.object({ recommendations: z.array(z.string()) }) }
   *     )
   *   ])
   *   .andThen(async (data) => {
   *     // data is now an array: [{ userInfo }, { permissions }, { recommendations }]
   *     return { combined: data.flat() };
   *   });
   * ```
   *
   * @param steps - Array of workflow steps to execute in parallel
   * @returns A new chain with the parallel step added
   */
  andAll<
    NEW_DATA,
    STEPS extends ReadonlyArray<
      InternalAnyWorkflowStep<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>
    >,
    INFERRED_RESULT = InternalInferWorkflowStepsResult<STEPS>,
  >({
    steps,
    ...config
  }: WorkflowStepParallelAllConfig<STEPS>): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    INFERRED_RESULT
  > {
    this.steps.push(andAll({ steps, ...config }));
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT>;
  }

  /**
   * Add a race execution step that runs multiple steps simultaneously and returns the first completed result
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andRace([
   *     async (data) => {
   *       // Fast operation
   *       const cacheResult = await checkCache(data.query);
   *       return { source: "cache", result: cacheResult };
   *     },
   *     async (data) => {
   *       // Slower operation
   *       const dbResult = await queryDatabase(data.query);
   *       return { source: "database", result: dbResult };
   *     },
   *     (data) => andAgent(
   *       `Generate fallback response for: ${data.query}`,
   *       agent,
   *       { schema: z.object({ source: z.literal("ai"), result: z.string() }) }
   *     )
   *   ])
   *   .andThen(async (data) => {
   *     // data is the result from whichever step completed first
   *     return { finalResult: data.result, source: data.source };
   *   });
   * ```
   *
   * @param steps - Array of workflow steps to execute in parallel
   * @returns A new chain with the race step added
   */
  andRace<
    NEW_DATA,
    STEPS extends ReadonlyArray<
      InternalAnyWorkflowStep<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>
    >,
    INFERRED_RESULT = InternalInferWorkflowStepsResult<STEPS>[number],
  >({
    steps,
    ...config
  }: WorkflowStepParallelRaceConfig<STEPS, CURRENT_DATA, NEW_DATA>): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    INFERRED_RESULT
  > {
    this.steps.push(
      andRace({
        steps: steps as unknown as InternalAnyWorkflowStep<
          WorkflowInput<INPUT_SCHEMA>,
          CURRENT_DATA,
          INFERRED_RESULT
        >[],
        ...config,
      }),
    );
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT>;
  }

  /**
   * Convert the current chain to a runnable workflow
   */
  public toWorkflow(): Workflow<INPUT_SCHEMA, RESULT_SCHEMA> {
    // @ts-expect-error - upstream types work and this is nature of how the createWorkflow function is typed using variadic args
    return createWorkflow<INPUT_SCHEMA, RESULT_SCHEMA>(this.config, ...this.steps);
  }

  /**
   * Execute the workflow with the given input
   */
  async run(input: WorkflowInput<INPUT_SCHEMA>, options?: WorkflowRunOptions) {
    // @ts-expect-error - upstream types work and this is nature of how the createWorkflow function is typed using variadic args
    const workflow = createWorkflow<INPUT_SCHEMA, RESULT_SCHEMA>(this.config, ...this.steps);
    return await workflow.run(input, options);
  }
}

/**
 * Creates a new workflow chain with the given configuration
 */
export function createWorkflowChain<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
>(config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA>) {
  return new WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA>(config);
}
