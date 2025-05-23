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
    publicKey: "pk_99684d8896d389bffd0fa6c864136f66",
    secretKey: "sk_live_f0bcb67326ec1093c8e1b0454b99db4e2167150f2e7e15464b4ea6b54ddf5743",
    baseUrl: "http://localhost:3003",
  }),
});
