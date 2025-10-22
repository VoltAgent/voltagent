import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent, VoltAgentObservability } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Import Memory and TelemetryStore from core
import { AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";

// Create logger
const logger = createPinoLogger({
  name: "base",
  level: "info",
});

// Create Memory instance with vector support for semantic search and working memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter(),
});

const agent = new Agent({
  name: "Base Agent",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4o-mini"),
  memory: memory,
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
