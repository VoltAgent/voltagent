import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { z } from "zod";

import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "./memory";

// Create logger
/* const logger = createPinoLogger({
  name: "nextjs-example",
  level: "info",
});
 */
// Define a calculator tool
const calculatorTool = createTool({
  name: "calculate",
  description: "Perform a mathematical calculation",
  parameters: z.object({
    expression: z.string().describe("The mathematical expression to evaluate, e.g. (2 + 2) * 3"),
  }),
  execute: async (args) => {
    try {
      // Using Function is still not ideal for production but safer than direct eval
      const result = new Function(`return ${args.expression}`)();
      return { result };
    } catch (e) {
      // Properly use the error variable
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid expression: ${args.expression}. Error: ${errorMessage}`);
    }
  },
});

// New Agent implementation - uses AI SDK directly
export const agentV2 = new Agent({
  name: "MathAssistantV2",
  instructions:
    "You are a helpful assistant that can answer questions and perform calculations. Use the calculate tool when needed.",
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
  memory: sharedMemory,
  maxSteps: 5,
});

// Sub-agent implementation
export const subAgent = new Agent({
  name: "MathAssistant",
  instructions: "A helpful assistant that can answer questions and perform calculations",
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
  memory: sharedMemory,
});

export const agent = new Agent({
  name: "Boss",
  instructions: "A Supervisor that can delegate tasks to sub-agents",
  model: openai("gpt-4o-mini"),
  subAgents: [subAgent],
  memory: sharedMemory,
});

new VoltAgent({
  agents: {
    agent,
  },
  /* logger, */
});
