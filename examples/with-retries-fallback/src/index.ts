import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-retries-fallback",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

const agent = new Agent({
  name: "RetriesFallbackAgent",
  instructions: "Answer support questions with short, direct replies.",
  model: "openai/gpt-4o-mini",
  maxRetries: 1,
  memory,
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
