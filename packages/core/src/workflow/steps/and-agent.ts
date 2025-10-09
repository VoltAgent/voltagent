import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { UIMessage } from "ai";
import type { z } from "zod";
import type { Agent, BaseGenerationOptions } from "../../agent/agent";
import { convertUsage } from "../../utils/usage-converter";
import type { InternalWorkflowFunc, WorkflowExecuteContext } from "../internal/types";
import type { WorkflowStepAgent } from "./types";

export type AgentConfig<SCHEMA extends z.ZodTypeAny, INPUT, DATA> = BaseGenerationOptions & {
  schema:
    | SCHEMA
    | ((
        context: Omit<WorkflowExecuteContext<INPUT, DATA, any, any>, "suspend" | "writer">,
      ) => SCHEMA | Promise<SCHEMA>);
};

/**
 * Creates an agent step for a workflow
 *
 * @example
 * ```ts
 * const w = createWorkflow(
 *   andAgent(
 *     ({ data }) => `Generate a greeting for the user ${data.name}`,
 *     agent,
 *     { schema: z.object({ greeting: z.string() }) }
 *   ),
 *   andThen({
 *     id: "extract-greeting",
 *     execute: async ({ data }) => data.greeting
 *   })
 * );
 * ```
 *
 * @param task - The task (prompt) to execute for the agent, can be a string or a function that returns a string
 * @param agent - The agent to execute the task using `generateObject`
 * @param config - The config for the agent (schema) `generateObject` call
 * @returns A workflow step that executes the agent with the task
 */
export function andAgent<INPUT, DATA, SCHEMA extends z.ZodTypeAny>(
  task:
    | UIMessage[]
    | ModelMessage[]
    | string
    | InternalWorkflowFunc<INPUT, DATA, UIMessage[] | ModelMessage[] | string, any, any>,
  agent: Agent,
  config: AgentConfig<SCHEMA, INPUT, DATA>,
) {
  return {
    type: "agent",
    id: agent.id,
    name: agent.name || agent.id,
    purpose: agent.purpose ?? null,
    agent,
    execute: async (context) => {
      const { state } = context;
      const { schema, ...restConfig } = config;
      const finalTask = typeof task === "function" ? await task(context) : task;
      const finalSchema = typeof schema === "function" ? await schema(context) : schema;

      // Create step context and publish start event
      if (!state.workflowContext) {
        // No workflow context, execute without events
        const result = await agent.generateObject(finalTask, finalSchema, {
          ...restConfig,
          context: restConfig.context ?? state.context,
          conversationId: restConfig.conversationId ?? state.conversationId,
          userId: restConfig.userId ?? state.userId,
          // No parentSpan when there's no workflow context
        });
        // Accumulate usage if available (no workflow context)
        if (result.usage && state.usage) {
          const convertedUsage = convertUsage(result.usage);
          state.usage.promptTokens += convertedUsage?.promptTokens || 0;
          state.usage.completionTokens += convertedUsage?.completionTokens || 0;
          if (typeof state.usage.cachedInputTokens === "number") {
            state.usage.cachedInputTokens += convertedUsage?.cachedInputTokens || 0;
          }
          if (typeof state.usage.reasoningTokens === "number") {
            state.usage.reasoningTokens += convertedUsage?.reasoningTokens || 0;
          }
          state.usage.totalTokens += convertedUsage?.totalTokens || 0;
        }
        return result.object;
      }

      // Step start event removed - now handled by OpenTelemetry spans

      try {
        const result = await agent.generateObject(finalTask, finalSchema, {
          ...restConfig,
          context: restConfig.context ?? state.context,
          conversationId: restConfig.conversationId ?? state.conversationId,
          userId: restConfig.userId ?? state.userId,
          // Pass the current step span as parent for proper span hierarchy
          parentSpan: state.workflowContext?.currentStepSpan,
        });

        // Step success event removed - now handled by OpenTelemetry spans

        // Accumulate usage if available
        if (result.usage && state.usage) {
          const convertedUsage = convertUsage(result.usage);
          state.usage.promptTokens += convertedUsage?.promptTokens || 0;
          state.usage.completionTokens += convertedUsage?.completionTokens || 0;
          if (typeof state.usage.cachedInputTokens === "number") {
            state.usage.cachedInputTokens += convertedUsage?.cachedInputTokens || 0;
          }
          if (typeof state.usage.reasoningTokens === "number") {
            state.usage.reasoningTokens += convertedUsage?.reasoningTokens || 0;
          }
          state.usage.totalTokens += convertedUsage?.totalTokens || 0;
        }

        return result.object;
      } catch (error) {
        // Check if this is a suspension, not an error
        if (
          error instanceof Error &&
          (error.message === "WORKFLOW_SUSPENDED" || error.message === "WORKFLOW_CANCELLED")
        ) {
          // For suspension, we don't publish an error event
          // The workflow core will handle publishing the suspend event
          throw error;
        }

        // Step error event removed - now handled by OpenTelemetry spans

        throw error;
      }
    },
  } satisfies WorkflowStepAgent<INPUT, DATA, z.infer<SCHEMA>>;
}
