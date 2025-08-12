import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create logger
const logger = createPinoLogger({
  name: "with-vercel-ai",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: storage,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
