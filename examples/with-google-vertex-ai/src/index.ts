import { Agent, VoltAgent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";
import { createPinoLogger } from "@voltagent/logger";

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;

const agent = new Agent({
  name: "Google Vertex AI Agent",
  description: "A helpful assistant powered by Google Gemini and Vertex AI",
  llm: new GoogleGenAIProvider({
    vertexai: true,
    project: GOOGLE_CLOUD_PROJECT,
    location: GOOGLE_CLOUD_LOCATION,
  }),
  model: "gemini-2.0-flash",
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
