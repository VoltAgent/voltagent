import { VoltAgent, Agent, createTool } from "@voltagent/core";
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
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${args.expression}`)();
      return { result };
    } catch (e) {
      // Properly use the error variable
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid expression: ${args.expression}. Error: ${errorMessage}`);
    }
  },
});

export const agent = new Agent({
  name: "Assistant",
  description: "A helpful assistant that can answer questions and perform calculations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
});

new VoltAgent({
  agents: {
    agent,
  },
});
