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

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

const agent = new Agent({
  name: "Google Assistant",
  description: "A helpful assistant powered by Google Gemini",
  llm: new VercelAIProvider(),
  model: google("gemini-2.0-flash"),
  memory: storage,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
