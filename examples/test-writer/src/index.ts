import "dotenv/config";
import { google } from "@ai-sdk/google";
import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { weatherTool } from "./tools";
import { writeTests } from "./workflows";

// Create a logger instance
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

// Configure persistent memory (LibSQL / SQLite)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

const agent = new Agent({
  name: "my-agent-app",
  instructions: "A helpful assistant that can check weather and help with various tasks",
  model: google("gemini-2.0-flash-exp"),
  tools: [weatherTool],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },
  workflows: {
    writeTests,
  },
  server: honoServer(),
  logger,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});
