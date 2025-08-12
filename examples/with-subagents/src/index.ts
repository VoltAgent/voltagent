import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-subagents",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

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
  memory: storage,
});

const formatterAgent = new Agent({
  name: "Formatter",
  description: "Formats and styles text content",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [uppercaseTool],
  memory: storage,
});

// Create a simple supervisor agent
const supervisorAgent = new Agent({
  name: "Supervisor",
  description: "Coordinates between content creation and formatting agents",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [contentCreatorAgent, formatterAgent],
  memory: storage,
});

new VoltAgent({
  agents: {
    supervisorAgent,
  },
  logger,
});

logger.error("VoltAgent initialized with subagents");
