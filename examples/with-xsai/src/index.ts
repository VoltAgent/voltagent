import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { XSAIProvider } from "@voltagent/xsai";

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new XSAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  model: "gpt-4o-mini",
});

// Create logger
const logger = createPinoLogger({
  name: "with-xsai",
  level: process.env.VOLTAGENT_LOG_LEVEL || "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
