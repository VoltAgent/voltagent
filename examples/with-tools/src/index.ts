import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Import all the tools
import { weatherTool, checkCalendarTool, addCalendarEventTool, searchTool } from "./tools";

// Create the agent with tools
const agent = new Agent({
  name: "Assistant with Tools",
  description: "A helpful assistant that can use tools to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, checkCalendarTool, addCalendarEventTool, searchTool],
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
});
