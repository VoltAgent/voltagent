import { A2AServer } from "@voltagent/a2a-server";
import { VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { assistant } from "./agents/assistant";

const logger = createPinoLogger({
  name: "with-a2a-server",
  level: "debug",
});

const a2aServer = new A2AServer({
  name: "SupportAgent",
  version: "0.1.0",
  description: "Expose VoltAgent over the Agent-to-Agent protocol",
});

new VoltAgent({
  agents: {
    assistant,
  },
  a2aServers: {
    supportAgent: a2aServer,
  },
  server: honoServer({ port: 3141 }),
  logger,
});

logger.info("VoltAgent A2A example is running on http://localhost:3141");
