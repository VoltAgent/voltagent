import { vertex } from "@ai-sdk/google-vertex";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "Google Vertex AI Agent",
  description: "A helpful assistant powered by Google Gemini and Vertex AI",
  llm: new VercelAIProvider(),
  model: vertex("gemini-2.0-flash"),
});

// Create logger
const logger = createPinoLogger({
  name: "with-google-vertex-ai",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
