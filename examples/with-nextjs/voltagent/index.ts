import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

import { openai } from "@ai-sdk/openai";

// Create logger
const logger = createPinoLogger({
  name: "nextjs-example",
  level: "info",
});

// Create LibSQL storage for persistent memory
const memory = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

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

export const subAgent = new Agent({
  name: "MathAssistant",
  description: "A helpful assistant that can answer questions and perform calculations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4.1-mini"),
  tools: [calculatorTool],
  memory,
});

export const agent = new Agent({
  name: "Boss",
  description: "A Supervisor that can delegate tasks to sub-agents",
  llm: new VercelAIProvider(),
  model: openai("gpt-4.1-mini"),
  subAgents: [subAgent],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
