import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

const logger = createPinoLogger({
  name: "with-voltagent-exporter",
  level: "info",
});

const memory = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

const agent = new Agent({
  name: "Base Agent",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, searchTool, checkCalendarTool, addCalendarEventTool],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
  }),
});
