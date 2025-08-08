import { groq } from "@ai-sdk/groq";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "Assistant",
  description: "A helpful assistant that answers questions",
  llm: new VercelAIProvider(),
  model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
});

// Create logger
const logger = createPinoLogger({
  name: "with-groq-ai",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
