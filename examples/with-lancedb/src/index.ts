import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { retriever } from "./retriever/index.js";

// Create logger
const logger = createPinoLogger({
  name: "with-lancedb",
  level: "info",
});

// Create LibSQL storage for persistent memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
  }),
});

// Agent 1: Automatic Retrieval
const agentWithRetriever = new Agent({
  name: "Assistant with Retriever",
  instructions:
    "You are a helpful assistant. You have access to a knowledge base about VoltAgent and LanceDB. You automatically retrieve relevant information to answer user questions.",
  model: openai("gpt-4o-mini"),
  retriever: retriever,
  memory,
});

// Agent 2: Tool-based Retrieval
const agentWithTools = new Agent({
  name: "Assistant with Tools",
  instructions:
    "You represent a helpful assistant that can search the knowledge base using tools. Decide when to search based on the user's question.",
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
  memory,
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    agentWithRetriever,
    agentWithTools,
  },
  logger,
  server: honoServer({ port: 3000 }),
});

console.log("🚀 VoltAgent with LanceDB is running!");
console.log("Try asking: 'What is VoltAgent?' or 'Tell me about LanceDB'");
