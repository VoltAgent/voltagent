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

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

const agent = new Agent({
  name: "Assistant",
  description: "A helpful assistant that answers questions",
  llm: new VercelAIProvider(),
  model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
  memory: storage,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
