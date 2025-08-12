import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Import all the tools
import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

// Create logger
const logger = createPinoLogger({
  name: "with-tools",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

// Create the agent with tools
const agent = new Agent({
  name: "Assistant with Tools",
  description: "A helpful assistant that can use tools to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, checkCalendarTool, addCalendarEventTool, searchTool],
  memory: storage,
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
