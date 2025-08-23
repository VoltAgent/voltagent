import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

import { openai } from "@ai-sdk/openai";

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

// Define a date/time tool
const dateTimeTool = createTool({
  name: "getDateTime",
  description: "Get current date and time",
  parameters: z.object({
    format: z.string().optional().describe("Date format (e.g., 'short', 'long')"),
  }),
  execute: async (args) => {
    const now = new Date();
    if (args.format === "short") {
      return { datetime: now.toLocaleDateString() };
    }
    return { datetime: now.toLocaleString() };
  },
});

// First subagent - Math specialist
export const mathAgent = new Agent({
  name: "MathAssistant",
  description: "A specialist in mathematical calculations and number operations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
});

// Second subagent - DateTime specialist
export const dateTimeAgent = new Agent({
  name: "DateTimeAssistant",
  description: "A specialist in date and time operations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [dateTimeTool],
});

// Supervisor agent with multiple subagents
export const agent = new Agent({
  name: "Supervisor",
  description: "A Supervisor that can delegate tasks to specialized sub-agents",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [mathAgent, dateTimeAgent],
  // Enable text-delta streaming for subagents
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["text-delta", "tool-call", "tool-result"],
      addSubAgentPrefix: true,
    },
  },
});

// Create logger
/* const logger = createPinoLogger({
  name: "nextjs-example",
  level: "info",
}); */

new VoltAgent({
  agents: {
    agent,
  },
  /* logger, */
});
