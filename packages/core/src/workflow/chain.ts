import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { Logger } from "@voltagent/internal";
import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { UIMessage } from "ai";
import type { z } from "zod";
import type { Agent } from "../agent/agent";
import { createWorkflow } from "./core";
import type {
  InternalAnyWorkflowStep,
  InternalBaseWorkflowInputSchema,
  InternalInferWorkflowStepsResult,
  InternalWorkflowFunc,
  WorkflowExecuteContext,
} from "./internal/types";
import {
  type WorkflowStep,
  type WorkflowStepBranchConfig,
  type WorkflowStepConditionalWhenConfig,
  type WorkflowStepForEachConfig,
  type WorkflowStepGuardrailConfig,
  type WorkflowStepLoopConfig,
  type WorkflowStepMapConfig,
  type WorkflowStepMapEntry,
  type WorkflowStepMapResult,
  type WorkflowStepParallelAllConfig,
  type WorkflowStepParallelRaceConfig,
  type WorkflowStepSleepConfig,
  type WorkflowStepSleepUntilConfig,
  andAgent,
  andAll,
  andBranch,
  andDoUntil,
  andDoWhile,
  andForEach,
  andGuardrail,
  andMap,
  andRace,
  andSleep,
  andSleepUntil,
  andTap,
  andThen,
  andWhen,
  andWorkflow,
} from "./steps";
import type { AgentConfig, AgentOutputSchema, InferAgentOutput } from "./steps/and-agent";
import type { InternalWorkflow } from "./steps/types";
import type {
  Workflow,
  WorkflowConfig,
  WorkflowExecutionResult,
  WorkflowInput,
  WorkflowRunOptions,
  WorkflowStateStore,
  WorkflowStateUpdater,
  WorkflowStepData,
  WorkflowStepState,
  WorkflowStreamResult,
  WorkflowStreamWriter,
} from "./types";

export type { AgentConfig } from "./steps/and-agent";

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
 *   memory: new Memory({ storage: new LibSQLMemoryAdapter({ url: "file:memory.db" }) }) // Optional workflow-specific memory
 * })
 *   .andThen({
 *     id: "fetch-user",
 *     execute: async ({ data }) => {
 *       const userInfo = await fetchUserInfo(data.userId);
 *       return { ...data, userInfo };
 *     }
 *   })
 *   .andWhen({
 *     id: "admin-permissions",
 *     condition: async ({ data }) => data.userType === "admin",
 *     execute: async ({ data }) => ({ ...data, permissions: ["read", "write", "delete"] })
 *   })
 *   .andAgent(
 *     ({ data }) => `Generate personalized content for ${data.userInfo.name}`,
 *     agent,
 *     { schema: z.object({ content: z.string() }) }
 *   )
 *   .andThen({
 *     id: "finalize-result",
 *     execute: async ({ data }) => ({
 *       processed: true,
 *       content: data.content
 *     })
 *   });
 *
 * // Run with optional memory override
 * const result = await workflow.run(
 *   { userId: "123", userType: "admin" },
 *   { memory: new Memory({ storage: new LibSQLMemoryAdapter({ url: "file:memory.db" }) }) }
 * );
 * ```
 */
export class WorkflowChain<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  CURRENT_DATA = WorkflowInput<INPUT_SCHEMA>,
  SUSPEND_SCHEMA extends z.ZodTypeAny = z.ZodAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
> {
  private steps: WorkflowStep<
    WorkflowInput<INPUT_SCHEMA>,
    DangerouslyAllowAny,
    DangerouslyAllowAny,
    z.infer<SUSPEND_SCHEMA>
  >[] = [];
  private config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  constructor(config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>) {
    this.config = config;
  }

  /**
   * Creates an agent step for a workflow
   *
   * @example
   * ```ts
   * const w = createWorkflowChain({
   *   id: "greeting-workflow",
   *   input: z.object({ name: z.string() }),
   *   result: z.string()
   * })
   *   .andAgent(
   *     ({ data }) => `Generate a greeting for the user ${data.name}`,
   *     agent,
   *     { schema: z.object({ greeting: z.string() }) }
   *   )
   *   .andThen({
   *     id: "extract-greeting",
   *     execute: async ({ data }) => data.greeting
   *   })
   * ```
   *
   * @param task - The task (prompt) to execute for the agent, can be a string or a function that returns a string
   * @param agent - The agent to execute the task using `generateText`
   * @param config - The config for the agent (schema) `generateText` call
   * @param map - Optional mapper to shape or merge the agent output with existing data
   * @returns A workflow step that executes the agent with the task
   */
  andAgent<SCHEMA extends AgentOutputSchema>(
    task:
      | string
      | UIMessage[]
      | ModelMessage[]
      | InternalWorkflowFunc<
          WorkflowInput<INPUT_SCHEMA>,
          CURRENT_DATA,
          string | UIMessage[] | ModelMessage[],
          any,
          any
        >,
    agent: Agent,
    config: AgentConfig<SCHEMA, WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>,
  ): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    InferAgentOutput<SCHEMA>,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  >;

  andAgent<SCHEMA extends AgentOutputSchema, NEW_DATA>(
    task:
      | string
      | UIMessage[]
      | ModelMessage[]
      | InternalWorkflowFunc<
          WorkflowInput<INPUT_SCHEMA>,
          CURRENT_DATA,
          string | UIMessage[] | ModelMessage[],
          any,
          any
        >,
    agent: Agent,
    config: AgentConfig<SCHEMA, WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>,
    map: (
      output: InferAgentOutput<SCHEMA>,
      context: WorkflowExecuteContext<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, any, any>,
    ) => Promise<NEW_DATA> | NEW_DATA,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  andAgent(
    task:
      | string
      | UIMessage[]
      | ModelMessage[]
      | InternalWorkflowFunc<
          WorkflowInput<INPUT_SCHEMA>,
          CURRENT_DATA,
          string | UIMessage[] | ModelMessage[],
          any,
          any
        >,
    agent: Agent,
    config: AgentConfig<AgentOutputSchema, WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>,
    map?: (
      output: unknown,
      context: WorkflowExecuteContext<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, any, any>,
    ) => Promise<unknown> | unknown,
  ): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    DangerouslyAllowAny,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  > {
    const step = andAgent(task, agent, config, map) as unknown as WorkflowStep<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      DangerouslyAllowAny
    >;
    this.steps.push(step);
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      DangerouslyAllowAny,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a function step to the workflow with both input and output schemas
   * @param config - Step configuration with schemas
   * @returns A new chain with the function step added
   */
  andThen<
    IS extends z.ZodTypeAny,
    OS extends z.ZodTypeAny,
    SS extends z.ZodTypeAny = z.ZodTypeAny,
    RS extends z.ZodTypeAny = z.ZodTypeAny,
  >(config: {
    inputSchema: IS;
    outputSchema: OS;
    suspendSchema?: SS;
    resumeSchema?: RS;
    execute: (context: {
      data: z.infer<IS>;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (
        reason?: string,
        suspendData?: SS extends z.ZodTypeAny ? z.infer<SS> : z.infer<SUSPEND_SCHEMA>,
      ) => Promise<never>;
      resumeData?: RS extends z.ZodTypeAny ? z.infer<RS> : z.infer<RESUME_SCHEMA>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<z.infer<OS>>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, z.infer<OS>, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  /**
   * Add a function step to the workflow with only input schema
   * @param config - Step configuration with input schema
   * @returns A new chain with the function step added
   */
  andThen<
    IS extends z.ZodTypeAny,
    NEW_DATA,
    SS extends z.ZodTypeAny = z.ZodTypeAny,
    RS extends z.ZodTypeAny = z.ZodTypeAny,
  >(config: {
    inputSchema: IS;
    outputSchema?: never;
    suspendSchema?: SS;
    resumeSchema?: RS;
    execute: (context: {
      data: z.infer<IS>;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (
        reason?: string,
        suspendData?: SS extends z.ZodTypeAny ? z.infer<SS> : z.infer<SUSPEND_SCHEMA>,
      ) => Promise<never>;
      resumeData?: RS extends z.ZodTypeAny ? z.infer<RS> : z.infer<RESUME_SCHEMA>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<NEW_DATA>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  /**
   * Add a function step to the workflow with only output schema
   * @param config - Step configuration with output schema
   * @returns A new chain with the function step added
   */
  andThen<
    OS extends z.ZodTypeAny,
    SS extends z.ZodTypeAny = z.ZodTypeAny,
    RS extends z.ZodTypeAny = z.ZodTypeAny,
  >(config: {
    inputSchema?: never;
    outputSchema: OS;
    suspendSchema?: SS;
    resumeSchema?: RS;
    execute: (context: {
      data: CURRENT_DATA;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (
        reason?: string,
        suspendData?: SS extends z.ZodTypeAny ? z.infer<SS> : z.infer<SUSPEND_SCHEMA>,
      ) => Promise<never>;
      resumeData?: RS extends z.ZodTypeAny ? z.infer<RS> : z.infer<RESUME_SCHEMA>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<z.infer<OS>>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, z.infer<OS>, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  /**
   * Add a function step to the workflow with only resumeSchema
   * @param config - Step configuration with resumeSchema
   * @returns A new chain with the function step added
   */
  andThen<
    NEW_DATA,
    SS extends z.ZodTypeAny = z.ZodTypeAny,
    RS extends z.ZodTypeAny = z.ZodTypeAny,
  >(config: {
    inputSchema?: never;
    outputSchema?: never;
    suspendSchema?: SS;
    resumeSchema: RS;
    execute: (context: {
      data: CURRENT_DATA;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (
        reason?: string,
        suspendData?: SS extends z.ZodTypeAny ? z.infer<SS> : z.infer<SUSPEND_SCHEMA>,
      ) => Promise<never>;
      resumeData?: z.infer<RS>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<NEW_DATA>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  /**
   * Add a function step to the workflow
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andThen({
   *     id: "process",
   *     execute: async ({ data }) => {
   *       const processed = await someAsyncOperation(data.value);
   *       return { ...data, processed };
   *     }
   *   })
   *   .andThen({
   *     id: "enrich",
   *     execute: async ({ data }) => {
   *       const enriched = await enrichData(data.processed);
   *       return { ...data, enriched };
   *     }
   *   });
   * ```
   *
   * @param config - Step configuration
   * @returns A new chain with the function step added
   */
  andThen<NEW_DATA>(config: {
    execute: (context: {
      data: CURRENT_DATA;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (reason?: string, suspendData?: z.infer<SUSPEND_SCHEMA>) => Promise<never>;
      resumeData?: z.infer<RESUME_SCHEMA>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<NEW_DATA>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
    inputSchema?: never;
    outputSchema?: never;
    suspendSchema?: z.ZodTypeAny;
    resumeSchema?: z.ZodTypeAny;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  andThen(config: any): any {
    const step = andThen(config) as WorkflowStep<WorkflowInput<INPUT_SCHEMA>, any, any, any>;
    this.steps.push(step);

    // Return type is handled by overloads
    return this as any;
  }

  /**
   * Add a conditional step with explicit schemas
   * @param config - Step configuration with schemas
   * @returns A new chain with the conditional step added
   */
  andWhen<
    IS extends z.ZodTypeAny,
    OS extends z.ZodTypeAny,
    SS extends z.ZodTypeAny = z.ZodTypeAny,
    RS extends z.ZodTypeAny = z.ZodTypeAny,
  >(
    config: WorkflowStepConditionalWhenConfig<
      WorkflowInput<INPUT_SCHEMA>,
      z.infer<IS>,
      z.infer<OS>
    > & {
      inputSchema: IS;
      outputSchema: OS;
      suspendSchema?: SS;
      resumeSchema?: RS;
      condition: (context: {
        data: z.infer<IS>;
        state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
        workflowState: WorkflowStateStore;
        setWorkflowState: (update: WorkflowStateUpdater) => void;
        getStepData: (stepId: string) => WorkflowStepData | undefined;
        suspend: (
          reason?: string,
          suspendData?: SS extends z.ZodTypeAny ? z.infer<SS> : z.infer<SUSPEND_SCHEMA>,
        ) => Promise<never>;
        resumeData?: RS extends z.ZodTypeAny ? z.infer<RS> : z.infer<RESUME_SCHEMA>;
        logger: Logger;
        writer: WorkflowStreamWriter;
      }) => Promise<boolean>;
    },
  ): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    z.infer<OS> | z.infer<IS>,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  >;

  /**
   * Add a conditional step that executes when a condition is true
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andWhen({
   *     id: "admin-permissions",
   *     condition: async ({ data }) => data.userType === "admin",
   *     execute: async ({ data }) => ({ ...data, permissions: ["read", "write", "delete"] })
   *   })
   *   .andWhen({
   *     id: "high-value-flag",
   *     condition: async ({ data }) => data.value > 1000,
   *     execute: async ({ data }) => ({ ...data, flagged: true, requiresReview: true })
   *   })
   *   .andWhen({
   *     id: "process-pending",
   *     condition: async ({ data }) => data.status === "pending",
   *     execute: async ({ data }) => {
   *       const result = await agent.generateText(
   *         `Process pending request for ${data.userId}`,
   *         { output: Output.object({ schema: z.object({ processed: z.boolean() }) }) }
   *       );
   *       return { ...data, ...result.output };
   *     }
   *   });
   * ```
   *
   * @param condition - Function that determines if the step should execute based on the current data
   * @param stepInput - Either a workflow step or an agent to execute when the condition is true
   * @returns A new chain with the conditional step added
   */
  andWhen<NEW_DATA>(
    config: WorkflowStepConditionalWhenConfig<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      NEW_DATA
    > & {
      inputSchema?: never;
      outputSchema?: never;
      suspendSchema?: z.ZodTypeAny;
      resumeSchema?: z.ZodTypeAny;
    },
  ): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    NEW_DATA | CURRENT_DATA,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  >;

  andWhen(config: any): any {
    const finalStep = andWhen(config) as WorkflowStep<WorkflowInput<INPUT_SCHEMA>, any, any>;
    this.steps.push(finalStep);
    // Return type is handled by overloads
    return this as any;
  }

  /**
   * Add a tap step to the workflow with optional input schema
   * @param config - Step configuration with optional inputSchema
   * @returns A new chain with the tap step added (data unchanged)
   */
  andTap<
    IS extends z.ZodTypeAny,
    SS extends z.ZodTypeAny = z.ZodTypeAny,
    RS extends z.ZodTypeAny = z.ZodTypeAny,
  >(config: {
    inputSchema: IS;
    suspendSchema?: SS;
    resumeSchema?: RS;
    execute: (context: {
      data: z.infer<IS>;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (
        reason?: string,
        suspendData?: SS extends z.ZodTypeAny ? z.infer<SS> : z.infer<SUSPEND_SCHEMA>,
      ) => Promise<never>;
      resumeData?: RS extends z.ZodTypeAny ? z.infer<RS> : z.infer<RESUME_SCHEMA>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<void>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, CURRENT_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  /**
   * Add a tap step to the workflow
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andTap({
   *     id: "log-translation",
   *     execute: async ({ data }) => {
   *       console.log("🔄 Translating text:", data);
   *     }
   *   })
   *   .andThen({
   *     id: "return-translation",
   *     // the input data is still the same as the andTap ONLY executes, it doesn't return anything
   *     execute: async ({ data }) => {
   *       return { ...data, translatedText: data.translatedText };
   *     }
   *   });
   * ```
   *
   * @param fn - The async function to execute with the current workflow data
   * @returns A new chain with the tap step added
   */
  andTap<_NEW_DATA>(config: {
    execute: (context: {
      data: CURRENT_DATA;
      state: WorkflowStepState<WorkflowInput<INPUT_SCHEMA>>;
      workflowState: WorkflowStateStore;
      setWorkflowState: (update: WorkflowStateUpdater) => void;
      getStepData: (stepId: string) => WorkflowStepData | undefined;
      suspend: (reason?: string, suspendData?: z.infer<SUSPEND_SCHEMA>) => Promise<never>;
      resumeData?: z.infer<RESUME_SCHEMA>;
      retryCount?: number;
      logger: Logger;
      writer: WorkflowStreamWriter;
    }) => Promise<void>;
    id: string;
    name?: string;
    purpose?: string;
    retries?: number;
    inputSchema?: never;
    suspendSchema?: z.ZodTypeAny;
    resumeSchema?: z.ZodTypeAny;
  }): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, CURRENT_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA>;

  andTap(config: any): any {
    const finalStep = andTap(config) as WorkflowStep<WorkflowInput<INPUT_SCHEMA>, any, any, any>;
    this.steps.push(finalStep);
    return this;
  }

  /**
   * Add a guardrail step to validate or sanitize data
   */
  andGuardrail(
    config: WorkflowStepGuardrailConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, CURRENT_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andGuardrail(config));
    return this;
  }

  /**
   * Add a sleep step to the workflow
   */
  andSleep(
    config: WorkflowStepSleepConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, CURRENT_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andSleep(config));
    return this;
  }

  /**
   * Add a sleep-until step to the workflow
   */
  andSleepUntil(
    config: WorkflowStepSleepUntilConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, CURRENT_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andSleepUntil(config));
    return this;
  }

  /**
   * Add a branching step that runs all matching branches
   */
  andBranch<NEW_DATA>(
    config: WorkflowStepBranchConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>,
  ): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    Array<NEW_DATA | undefined>,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  > {
    this.steps.push(andBranch(config));
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      Array<NEW_DATA | undefined>,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a foreach step that runs a step for each item in an array
   */
  andForEach<ITEM, NEW_DATA, MAP_DATA = ITEM>(
    config: WorkflowStepForEachConfig<
      WorkflowInput<INPUT_SCHEMA>,
      CURRENT_DATA,
      ITEM,
      NEW_DATA,
      MAP_DATA
    >,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA[], SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andForEach(config));
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      NEW_DATA[],
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a do-while loop step
   */
  andDoWhile<NEW_DATA>(
    config: WorkflowStepLoopConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andDoWhile(config));
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      NEW_DATA,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a do-until loop step
   */
  andDoUntil<NEW_DATA>(
    config: WorkflowStepLoopConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, NEW_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andDoUntil(config));
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      NEW_DATA,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a mapping step to the workflow
   */
  andMap<
    MAP extends Record<string, WorkflowStepMapEntry<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA>>,
  >(
    config: WorkflowStepMapConfig<WorkflowInput<INPUT_SCHEMA>, CURRENT_DATA, MAP>,
  ): WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    WorkflowStepMapResult<MAP>,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  > {
    this.steps.push(andMap(config));
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      WorkflowStepMapResult<MAP>,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a workflow step to the workflow
   *
   * @example
   * ```ts
   * import { myWorkflow } from "./my-workflow";
   *
   * const workflow = createWorkflowChain(config)
   *   .andThen({
   *     id: "fetch-user",
   *     execute: async ({ data }) => {
   *       const userInfo = await fetchUserInfo(data.userId);
   *       return { userInfo };
   *     }
   *   })
   *   .andWorkflow(myWorkflow)
   * ```
   */
  andWorkflow<NEW_DATA>(
    workflow: InternalWorkflow<INPUT_SCHEMA, CURRENT_DATA, NEW_DATA>,
  ): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA> {
    this.steps.push(
      andWorkflow(workflow) as unknown as WorkflowStep<
        WorkflowInput<INPUT_SCHEMA>,
        CURRENT_DATA,
        NEW_DATA
      >,
    );
    return this as unknown as WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, NEW_DATA>;
  }

  /**
   * Add a parallel execution step that runs multiple steps simultaneously and waits for all to complete
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andAll({
   *     id: "parallel-fetch",
   *     steps: [
   *       {
   *         id: "fetch-user",
   *         execute: async ({ data }) => {
   *           const userInfo = await fetchUserInfo(data.userId);
   *           return { userInfo };
   *         }
   *       },
   *       {
   *         id: "fetch-permissions",
   *         execute: async ({ data }) => {
   *           const permissions = await fetchPermissions(data.userId);
   *           return { permissions };
   *         }
   *       },
   *       {
   *         id: "generate-recommendations",
   *         execute: async ({ data }) => {
   *           const result = await agent.generateText(
   *             `Generate recommendations for user ${data.userId}`,
   *             { output: Output.object({ schema: z.object({ recommendations: z.array(z.string()) }) }) }
   *           );
   *           return result.output;
   *         }
   *       }
   *     ]
   *   })
   *   .andThen({
   *     id: "combine-results",
   *     execute: async ({ data }) => {
   *       // data is now an array: [{ userInfo }, { permissions }, { recommendations }]
   *       return { combined: data.flat() };
   *     }
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
  }: WorkflowStepParallelAllConfig<
    WorkflowInput<INPUT_SCHEMA>,
    CURRENT_DATA,
    NEW_DATA,
    STEPS
  >): WorkflowChain<INPUT_SCHEMA, RESULT_SCHEMA, INFERRED_RESULT, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    this.steps.push(andAll({ steps, ...config }));
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      INFERRED_RESULT,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Add a race execution step that runs multiple steps simultaneously and returns the first completed result
   *
   * @example
   * ```ts
   * const workflow = createWorkflowChain(config)
   *   .andRace({
   *     id: "race-data-sources",
   *     steps: [
   *       {
   *         id: "check-cache",
   *         execute: async ({ data }) => {
   *           // Fast operation
   *           const cacheResult = await checkCache(data.query);
   *           return { source: "cache", result: cacheResult };
   *         }
   *       },
   *       {
   *         id: "query-database",
   *         execute: async ({ data }) => {
   *           // Slower operation
   *           const dbResult = await queryDatabase(data.query);
   *           return { source: "database", result: dbResult };
   *         }
   *       },
   *       {
   *         id: "ai-fallback",
   *         execute: async ({ data }) => {
   *           const result = await agent.generateText(
   *             `Generate fallback response for: ${data.query}`,
   *             {
   *               output: Output.object({
   *                 schema: z.object({ source: z.literal("ai"), result: z.string() }),
   *               }),
   *             }
   *           );
   *           return result.output;
   *         }
   *       }
   *     ]
   *   })
   *   .andThen({
   *     id: "process-result",
   *     execute: async ({ data }) => {
   *       // data is the result from whichever step completed first
   *       return { finalResult: data.result, source: data.source };
   *     }
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
    INFERRED_RESULT,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
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
    return this as unknown as WorkflowChain<
      INPUT_SCHEMA,
      RESULT_SCHEMA,
      INFERRED_RESULT,
      SUSPEND_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Convert the current chain to a runnable workflow
   */
  public toWorkflow(): Workflow<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA> {
    // @ts-expect-error - upstream types work and this is nature of how the createWorkflow function is typed using variadic args
    return createWorkflow<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>(
      this.config,
      // @ts-expect-error - upstream types work and this is nature of how the createWorkflow function is typed using variadic args
      ...this.steps,
    );
  }

  /**
   * Execute the workflow with the given input
   */
  async run(
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
  ): Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>> {
    const workflow = createWorkflow<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>(
      this.config,
      // @ts-expect-error - upstream types work and this is nature of how the createWorkflow function is typed using variadic args
      ...this.steps,
    );
    return (await workflow.run(input, options)) as unknown as WorkflowExecutionResult<
      RESULT_SCHEMA,
      RESUME_SCHEMA
    >;
  }

  /**
   * Execute the workflow with streaming support
   */
  stream(
    input: WorkflowInput<INPUT_SCHEMA>,
    options?: WorkflowRunOptions,
  ): WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA> {
    const workflow = createWorkflow<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>(
      this.config,
      // @ts-expect-error - upstream types work and this is nature of how the createWorkflow function is typed using variadic args
      ...this.steps,
    );
    return workflow.stream(input, options) as unknown as WorkflowStreamResult<
      RESULT_SCHEMA,
      RESUME_SCHEMA
    >;
  }
}

/**
 * Creates a new workflow chain with the given configuration
 */
export function createWorkflowChain<
  INPUT_SCHEMA extends InternalBaseWorkflowInputSchema,
  RESULT_SCHEMA extends z.ZodTypeAny,
  SUSPEND_SCHEMA extends z.ZodTypeAny = z.ZodAny,
  RESUME_SCHEMA extends z.ZodTypeAny = z.ZodAny,
>(config: WorkflowConfig<INPUT_SCHEMA, RESULT_SCHEMA, SUSPEND_SCHEMA, RESUME_SCHEMA>) {
  return new WorkflowChain<
    INPUT_SCHEMA,
    RESULT_SCHEMA,
    WorkflowInput<INPUT_SCHEMA>,
    SUSPEND_SCHEMA,
    RESUME_SCHEMA
  >(config);
}
