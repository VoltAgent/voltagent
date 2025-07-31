import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import type { Agent } from "../../agent/agent";
import type { BaseMessage } from "../../agent/providers";
import type { PublicGenerateOptions } from "../../agent/types";
import {
  createWorkflowStepStartEvent,
  createWorkflowStepSuccessEvent,
  createWorkflowStepErrorEvent,
  publishWorkflowEvent,
  createStepContext,
} from "../event-utils";
import type { WorkflowStepAgent } from "./types";
import type { InternalWorkflowFunc } from "../internal/types";
import { getGlobalLogger } from "../../logger";

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
    | BaseMessage[]
    | string
    | InternalWorkflowFunc<INPUT, DATA, BaseMessage[] | string, any, any>,
  agent: Agent<{ llm: DangerouslyAllowAny }>,
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
          userContext: restConfig.userContext ?? state.userContext,
          conversationId: restConfig.conversationId ?? state.conversationId,
          userId: restConfig.userId ?? state.userId,
        });
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
          userContext: state.workflowContext.userContext,
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
          userContext: restConfig.userContext ?? state.userContext,
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
            userContext: state.workflowContext.userContext,
          },
        );

        try {
          await publishWorkflowEvent(stepSuccessEvent, state.workflowContext);
        } catch (eventError) {
          getGlobalLogger()
            .child({ component: "workflow", stepType: "agent" })
            .warn("Failed to publish workflow step success event:", { error: eventError });
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
            userContext: state.workflowContext.userContext,
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
