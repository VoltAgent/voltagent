import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const uppercaseTool = createTool({
  name: "uppercase",
  description: "Converts text to uppercase",
  parameters: z.object({
    text: z.string().describe("The text to convert to uppercase"),
  }),
  execute: async ({ text }: { text: string }) => {
    return { result: text.toUpperCase() };
  },
});

// Create two simple specialized subagents
const contentCreatorAgent = new Agent({
  name: "ContentCreator",
  description: "Creates short text content on requested topics",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const formatterAgent = new Agent({
  name: "Formatter",
  description: "Formats and styles text content",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [uppercaseTool],
});

// Create a simple supervisor agent
const supervisorAgent = new Agent({
  name: "Supervisor",
  description: "Coordinates between content creation and formatting agents",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [contentCreatorAgent, formatterAgent],
});

// Initialize the VoltAgent with the agent hierarchy
new VoltAgent({
  agents: {
    main: supervisorAgent,
  },
});
