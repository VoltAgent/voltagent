import { Agent, VoltAgent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";
import { createPinoLogger } from "@voltagent/logger";

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
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
