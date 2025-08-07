import { google } from "@ai-sdk/google";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "Google Assistant",
  description: "A helpful assistant powered by Google Gemini",
  llm: new VercelAIProvider(),
  model: google("gemini-2.0-flash"),
});

// Create logger
const logger = createPinoLogger({
  name: "with-google-ai",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
