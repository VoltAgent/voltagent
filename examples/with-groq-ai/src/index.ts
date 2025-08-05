import { Agent, VoltAgent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";
import { createPinoLogger } from "@voltagent/logger";

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
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
