import type { VercelAIProvider } from "@voltagent/vercel-ai";
import type { z } from "zod";
import type { Agent } from "../../agents";
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
  agent: BaseAgent,
  config: AgentConfig<SCHEMA>,
) {
  return {
    type: "agent",
    agent,
    execute: async (data) => {
      return await executeAgent(agent, config, data);
    },
  } satisfies WorkflowStepAgent<DATA, z.infer<SCHEMA>>;
}

/*
|------------------
| Internals
|------------------
*/

type BaseAgent = Agent<{ llm: VercelAIProvider }>;

/**
 * Executes an agent with the given data and prompt
 * @param agent - The agent to execute
 * @param data - The data to process
 * @param customInput - Optional custom input to include
 * @returns The agent's result merged with the input data
 */
async function executeAgent<DATA, RESULT, SCHEMA extends z.ZodTypeAny>(
  agent: BaseAgent,
  config: AgentConfig<SCHEMA>,
  data: DATA,
): Promise<RESULT> {
  const result = await agent.generateObject(
    `
# Input Data

Based on your assigned task, use the following input in the <input> tag to generate a response:

<input>
  ${JSON.stringify(data, null, 2)}
</input>
    `.trim(),
    config.schema,
  );
  return result.object as z.infer<SCHEMA>;
}
