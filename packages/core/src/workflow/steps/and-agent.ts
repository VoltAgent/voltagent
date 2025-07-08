import type { z } from "zod";
import type { PublicGenerateOptions } from "../../agent/types";
import { defaultStepConfig } from "../internal/utils";
import type { WorkflowStepAgent, WorkflowStepAgentConfig } from "./types";

export type AgentConfig<SCHEMA extends z.ZodTypeAny> = PublicGenerateOptions & {
  schema: SCHEMA;
};

/**
 * Creates an agent step for a workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andAgent(
 *     (data) => `Generate a greeting for the user ${data.name}`,
 *     agent,
 *    { schema: z.object({ greeting: z.string() }) }
 *   ),
 *   andThen(async (data) => data.greeting)
 * );
 * ```
 *
 * @param task - The task (prompt) to execute for the agent, can be a string or a function that returns a string
 * @param agent - The agent to execute the task using `generateObject`
 * @param config - The config for the agent (schema) `generateObject` call
 * @returns A workflow step that executes the agent with the task
 */
export function andAgent<INPUT, DATA, SCHEMA extends z.ZodTypeAny>({
  task,
  agent,
  config,
}: WorkflowStepAgentConfig<INPUT, DATA, SCHEMA>) {
  return {
    ...defaultStepConfig(config),
    type: "agent",
    agent,
    execute: async (data, state) => {
      const { schema, ...restConfig } = config;
      const finalTask = typeof task === "function" ? await task(data, state) : task;
      const result = await agent.generateObject(finalTask, config.schema, {
        ...restConfig,
        userContext: restConfig.userContext ?? state.userContext,
        conversationId: restConfig.conversationId ?? state.conversationId,
        userId: restConfig.userId ?? state.userId,
      });
      return result.object;
    },
  } satisfies WorkflowStepAgent<INPUT, DATA, z.infer<SCHEMA>>;
}
