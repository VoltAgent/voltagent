import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltAgentExporter } from "@voltagent/core";
import { LangfuseExporter } from "@voltagent/langfuse-exporter";
import { VercelAIProvider } from "@voltagent/vercel-ai";
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
  telemetryExporter: [
    new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    }),
    new VoltAgentExporter({
      publicKey: "pk_c31c8836c8c3576b9b54396b82f1194e",
      secretKey: "sk_live_33b867d2dc8b9b289975b56d49cfb7bd7733b47981da32d1b59f258833a4aaf0",
      baseUrl: "https://server.voltagent.dev/functions/v1",
    }),
  ],
});
