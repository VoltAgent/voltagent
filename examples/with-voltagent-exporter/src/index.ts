import { Agent, VoltAgent, VoltAgentExporter } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

import { weatherTool, searchTool, checkCalendarTool, addCalendarEventTool } from "./tools";

const agent = new Agent({
  name: "Base Agent",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, searchTool, checkCalendarTool, addCalendarEventTool],
});

new VoltAgent({
  agents: {
    agent,
  },
});
