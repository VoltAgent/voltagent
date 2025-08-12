import { google } from "@ai-sdk/google";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create logger
const logger = createPinoLogger({
  name: "with-google-ai",
  level: "info",
});

const agent = new Agent({
  name: "Google Assistant",
  description: "A helpful assistant powered by Google Gemini",
  llm: new VercelAIProvider(),
  model: google("gemini-2.0-flash"),
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
});
