import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { getLocationTool, weatherTool } from "./tools";

// Create logger
const logger = createPinoLogger({
  name: "with-use-chat",
  level: "info",
});

// Basic memory setup (LibSQL adapters with defaults)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
  embedding: new AiSdkEmbeddingAdapter(openai.textEmbeddingModel("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter(),
});

// Create Agent: cerbai
const agent = new Agent({
  name: "ai-agent",
  instructions: "A helpful assistant that can check weather and help with various tasks.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, getLocationTool],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
