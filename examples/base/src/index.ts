import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create logger
const logger = createPinoLogger({
  name: "base",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

const agent = new Agent({
  name: "Base Agent",
  description: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: storage, // Use LibSQL for persistent memory
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
