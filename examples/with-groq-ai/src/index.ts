import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { GroqProvider } from "@voltagent/groq-ai";

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions",
  llm: new GroqProvider({
    apiKey: process.env.GROQ_API_KEY,
  }),
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
});

// Create logger
const logger = createPinoLogger({
  name: "with-groq-ai",
  level: process.env.VOLTAGENT_LOG_LEVEL || "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
