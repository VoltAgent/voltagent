import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { GoogleGenAIProvider } from "@voltagent/google-ai";

const agent = new Agent({
  name: "Google Assistant",
  description: "A helpful assistant powered by Google Gemini",
  llm: new GoogleGenAIProvider({
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  model: "gemini-2.0-flash",
});

// Create logger
const logger = createPinoLogger({
  name: "with-google-ai",
  level: process.env.VOLTAGENT_LOG_LEVEL || "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
