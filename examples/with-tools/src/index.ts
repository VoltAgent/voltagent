import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Import all the tools
import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

// Create the agent with tools
const agent = new Agent({
  name: "Assistant with Tools",
  description: "A helpful assistant that can use tools to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, checkCalendarTool, addCalendarEventTool, searchTool],
});

// Create logger
const logger = createPinoLogger({
  name: "with-tools",
  level: "info",
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
