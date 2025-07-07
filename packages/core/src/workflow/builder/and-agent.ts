import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { z } from "zod";
import type { Agent } from "../../agent/index";
import type { WorkflowStepAgent } from "../types";

export type AgentConfig<SCHEMA extends z.ZodTypeAny> = {
  schema: SCHEMA;
};

/**
 * Creates an agent step for the workflow
 * @param agent - The agent to execute
 * @returns A workflow step that executes the agent
 */
export function andAgent<DATA, SCHEMA extends z.ZodTypeAny>(
  task: string | ((data: DATA) => string),
  agent: BaseAgent,
  config: AgentConfig<SCHEMA>,
) {
  return {
    type: "agent",
    agent,
    execute: async (data) => {
      const finalTask = typeof task === "function" ? task(data) : task;

      const result = await agent.generateObject(finalTask, config.schema, {
        // TODO: Add context natively
      });
      return {
        ...result.object,
        // TODO: Add a better way to maintain the initial input data
        _input: data,
      };
    },
  } satisfies WorkflowStepAgent<DATA, z.infer<SCHEMA>>;
}

type BaseAgent = Agent<{ llm: DangerouslyAllowAny }>;
