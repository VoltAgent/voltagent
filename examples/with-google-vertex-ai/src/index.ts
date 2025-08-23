import { vertex } from "@ai-sdk/google-vertex";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const logger = createPinoLogger({
  name: "with-google-vertex-ai",
  level: "info",
});

const agent = new Agent({
  name: "Google Vertex AI Agent",
  instructions: "A helpful assistant powered by Google Gemini and Vertex AI",
  model: vertex("gemini-2.0-flash"),
  memory: new LibSQLStorage({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
