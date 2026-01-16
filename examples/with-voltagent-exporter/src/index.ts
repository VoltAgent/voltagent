import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

const logger = createPinoLogger({
  name: "with-voltagent-exporter",
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

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
  }),
});
