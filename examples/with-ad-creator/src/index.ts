import "dotenv/config";
import { serveStatic } from "@hono/node-server/serve-static";
import { Memory, VoltAgent, VoltAgentObservability } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { createSupervisorAgent } from "./agents/supervisor.agent";

// Create a logger instance
const logger = createPinoLogger({
  name: "ai-ad-generator",
  level: "info",
});

// Configure persistent memory (LibSQL / SQLite)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

// Create the supervisor agent with all subagents
const supervisorAgent = createSupervisorAgent(memory);

// Initialize VoltAgent with Instagram ad generation system using Gemini AI
new VoltAgent({
  agents: {
    InstagramAdSupervisor: supervisorAgent,
  },
  server: honoServer({
    configureApp: (app) => {
      app.use("/output/*", serveStatic({ root: "./" }));
    },
  }),
  logger,
  observability: new VoltAgentObservability({
    storage: new LibSQLObservabilityAdapter({
      url: "file:./.voltagent/observability.db",
    }),
  }),
});
