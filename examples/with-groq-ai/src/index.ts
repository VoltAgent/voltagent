import { groq } from "@ai-sdk/groq";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create logger
const logger = createPinoLogger({
  name: "with-groq-ai",
  level: "info",
});

const agent = new Agent({
  name: "Assistant",
  description: "A helpful assistant that answers questions",
  llm: new VercelAIProvider(),
  model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
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
