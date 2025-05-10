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
      publicKey: "pk_a5c7813c857c490d385db87686e851a6",
      secretKey: "sk_live_b92e01d6e255d06093a737d49385fb4384882e610f5300e282f89987078de421",
      edgeFunctionBaseUrl: "https://server.voltagent.dev/functions/v1",
    }),
  ],
});
