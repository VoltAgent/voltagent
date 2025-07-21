import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "Base Agent",
  description: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create logger
const logger = createPinoLogger({
  name: "base",
  level: process.env.VOLTAGENT_LOG_LEVEL || "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
