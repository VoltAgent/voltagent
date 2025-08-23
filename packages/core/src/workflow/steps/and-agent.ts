import type { UIMessage } from "ai";
import type { z } from "zod";
import type { Agent, BaseGenerationOptions } from "../../agent/agent";
import { getGlobalLogger } from "../../logger";
import { convertUsage } from "../../utils/usage-converter";
import {
  createStepContext,
  createWorkflowStepErrorEvent,
  createWorkflowStepStartEvent,
  createWorkflowStepSuccessEvent,
  publishWorkflowEvent,
} from "../event-utils";
import type { InternalWorkflowFunc } from "../internal/types";
import type { WorkflowStepAgent } from "./types";

export type AgentConfig<SCHEMA extends z.ZodTypeAny> = BaseGenerationOptions & {
  schema: SCHEMA;
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
  task: UIMessage[] | string | InternalWorkflowFunc<INPUT, DATA, UIMessage[] | string, any, any>,
  agent: Agent,
  config: AgentConfig<SCHEMA>,
) {
  return {
    type: "agent",
    id: agent.id,
    name: agent.name || agent.id,
    purpose: agent.purpose ?? null,
    agent,
    execute: async (context) => {
      const { data, state } = context;
      const { schema, ...restConfig } = config;
      const finalTask = typeof task === "function" ? await task(context) : task;

      // Create step context and publish start event
      if (!state.workflowContext) {
        // No workflow context, execute without events
        const result = await agent.generateObject(finalTask, config.schema, {
          ...restConfig,
          context: restConfig.context ?? state.context,
          conversationId: restConfig.conversationId ?? state.conversationId,
          userId: restConfig.userId ?? state.userId,
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

      // ✅ Serialize task function or task string for event tracking
      const stepFunction = typeof task === "function" ? task.toString() : undefined;
      const taskString = typeof task === "string" ? task : undefined;

      const stepContext = createStepContext(
        state.workflowContext,
        "agent",
        agent.name || agent.id || "Agent",
      ); // ✅ FIX: Use agent.id as fallback
      const stepStartEvent = createWorkflowStepStartEvent(
        stepContext,
        state.workflowContext,
        { data, task: finalTask }, // ✅ Pass input data with task
        {
          agentId: agent.id,
          stepFunction,
          taskString,
          context: state.workflowContext.context,
        },
      );

      try {
        await publishWorkflowEvent(stepStartEvent, state.workflowContext);
      } catch (eventError) {
        getGlobalLogger()
          .child({ component: "workflow", stepType: "agent" })
          .warn("Failed to publish workflow step start event:", { error: eventError });
      }

      try {
        const result = await agent.generateObject(finalTask, config.schema, {
          ...restConfig,
          context: restConfig.context ?? state.context,
          conversationId: restConfig.conversationId ?? state.conversationId,
          userId: restConfig.userId ?? state.userId,
          // TODO: Pass workflow context as parent to agent for proper event hierarchy
          // This requires extending PublicGenerateOptions to support parent context
        });

        // Publish step success event
        const stepSuccessEvent = createWorkflowStepSuccessEvent(
          stepContext,
          state.workflowContext,
          result.object,
          stepStartEvent.id,
          {
            agentId: agent.id,
            stepFunction,
            taskString,
            context: state.workflowContext.context,
          },
        );

        try {
          await publishWorkflowEvent(stepSuccessEvent, state.workflowContext);
        } catch (eventError) {
          getGlobalLogger()
            .child({ component: "workflow", stepType: "agent" })
            .warn("Failed to publish workflow step success event:", { error: eventError });
        }

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
        if (error instanceof Error && error.message === "WORKFLOW_SUSPENDED") {
          // For suspension, we don't publish an error event
          // The workflow core will handle publishing the suspend event
          throw error;
        }

        // Publish step error event for actual errors
        const stepErrorEvent = createWorkflowStepErrorEvent(
          stepContext,
          state.workflowContext,
          error,
          stepStartEvent.id,
          {
            agentId: agent.id,
            stepFunction,
            taskString,
            context: state.workflowContext.context,
          },
        );

        try {
          await publishWorkflowEvent(stepErrorEvent, state.workflowContext);
        } catch (eventError) {
          getGlobalLogger()
            .child({ component: "workflow", stepType: "agent" })
            .warn("Failed to publish workflow step error event:", { error: eventError });
        }

        throw error;
      }
    },
  } satisfies WorkflowStepAgent<INPUT, DATA, z.infer<SCHEMA>>;
}
