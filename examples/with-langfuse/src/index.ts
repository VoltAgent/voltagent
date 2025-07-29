import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { LangfuseExporter } from "@voltagent/langfuse-exporter";
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

// Create logger
const logger = createPinoLogger({
  name: "with-langfuse",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  telemetryExporter: [
    new LangfuseExporter({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    }),
  ],
});
