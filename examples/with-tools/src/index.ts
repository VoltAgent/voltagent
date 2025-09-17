import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Import all the tools
import { addCalendarEventTool, checkCalendarTool, searchTool, weatherTool } from "./tools";

// Create logger
const logger = createPinoLogger({
  name: "with-tools",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    storageLimit: 100, // Keep last 100 messages per conversation
  }),
  embedding: new AiSdkEmbeddingAdapter(openai.textEmbeddingModel("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter(),
});

// Create the agent with tools (no observability here - will use global)
const agent = new Agent({
  name: "Assistant with Tools",
  instructions: "A helpful assistant that can use tools to provide better answers",
  model: openai("gpt-4o-mini"),
  tools: [addCalendarEventTool, checkCalendarTool, searchTool],
  memory,
});

// Test dynamic tool addition
agent.addTools([weatherTool]);

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
