import { vertex } from "@ai-sdk/google-vertex";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;

const agent = new Agent({
  name: "Google Vertex AI Agent",
  description: "A helpful assistant powered by Google Gemini and Vertex AI",
  llm: new VercelAIProvider(),
  model: vertex("gemini-2.0-flash", {
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
  }),
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
