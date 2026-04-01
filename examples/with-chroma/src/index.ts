import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { retriever } from "./retriever/index.js";

// Create logger
const logger = createPinoLogger({
  name: "with-chroma",
  level: "info",
});

// Create LibSQL storage for persistent memory (shared between agents)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
  }),
});

// Agent 1: Using retriever directly
const agentWithRetriever = new Agent({
  name: "Assistant with Retriever",
  instructions:
    "A helpful assistant that can retrieve information from the Chroma knowledge base using semantic search to provide better answers. I automatically search for relevant information when needed.",
  model: "openai/gpt-4o-mini",
  retriever: retriever,
  memory,
});

// Agent 2: Using retriever as tool
const agentWithTools = new Agent({
  name: "Assistant with Tools",
  instructions:
    "A helpful assistant that can search the Chroma knowledge base using tools. The agent will decide when to search for information based on user questions.",
  model: "openai/gpt-4o-mini",
  tools: [retriever.tool],
  memory,
});

// Initialize VoltAgent with both agents and server
new VoltAgent({
  agents: {
    agentWithRetriever,
    agentWithTools,
  },
  logger,
  server: honoServer({ port: 3141 }),
});

console.log("🚀 VoltAgent with Chroma is running!");
console.log("📚 Two different agents are ready:");
console.log("  1️⃣ Assistant with Retriever - Automatic semantic search on every interaction");
console.log("  2️⃣ Assistant with Tools - LLM decides when to search autonomously");
console.log("");
console.log("🔍 Try asking questions like:");
console.log("  • 'What is VoltAgent?'");
console.log("  • 'Tell me about vector databases'");
console.log("  • 'How does Chroma work with TypeScript?'");
console.log("");
console.log("💡 The Tools Agent will automatically search when needed!");
console.log("");
console.log("📋 Sources tracking: Both agents track which documents were used");
console.log("   Check context.get('references') to see sources with IDs and distances");
