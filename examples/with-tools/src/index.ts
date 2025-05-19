import { VoltAgent, Agent, VoltAgentExporter } from "@voltagent/core";
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
  telemetryExporter: new VoltAgentExporter({
    publicKey: "pk_3078221058f9ba8ce79d28095038a01a",
    secretKey: "sk_live_aab8c9b476201f1d52a55a6e379e0107ba84fe8b4bbc7c50028b880b0a6549d2",
    baseUrl: "https://server.voltagent.dev",
  }),
});
