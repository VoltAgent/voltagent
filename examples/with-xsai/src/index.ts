import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { XSAIProvider } from "@voltagent/xsai";

// Create logger
const logger = createPinoLogger({
  name: "with-xsai",
  level: "info",
});

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new XSAIProvider({
    apiKey: process.env.OPENAI_API_KEY || "",
  }),
  model: "gpt-4o-mini",
  memory: new LibSQLStorage({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
