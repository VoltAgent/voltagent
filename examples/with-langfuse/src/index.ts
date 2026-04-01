import { Agent, Memory, VoltAgent, VoltAgentObservability } from "@voltagent/core";
import { createLangfuseSpanProcessor } from "@voltagent/langfuse-exporter";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

// Create logger
const logger = createPinoLogger({
  name: "with-langfuse",
  level: "info",
});

const agent = new Agent({
  name: "Base Agent",
  instructions: "You are a helpful assistant",
  model: "openai/gpt-4o-mini",
  tools: [weatherTool, searchTool, checkCalendarTool, addCalendarEventTool],
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

// Configure Observability with Langfuse
const observability = new VoltAgentObservability({
  spanProcessors: [
    createLangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
      debug: true,
    }),
  ],
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
  observability,
});
