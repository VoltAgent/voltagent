import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

import { retriever } from "./retriever/index.js";

// Create logger
const logger = createPinoLogger({
  name: "with-pinecone",
  level: "info",
});

// Create LibSQL storage for persistent memory
const memory = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

// Agent 1: Using retriever directly
const agentWithRetriever = new Agent({
  name: "Assistant with Retriever",
  description:
    "A helpful assistant that can retrieve information from the Pinecone knowledge base using semantic search to provide better answers. I automatically search for relevant information when needed.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  retriever: retriever,
  memory,
});

// Agent 2: Using retriever as tool
const agentWithTools = new Agent({
  name: "Assistant with Tools",
  description:
    "A helpful assistant that can search the Pinecone knowledge base using tools. The agent will decide when to search for information based on user questions.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
  memory,
});

// Initialize VoltAgent with both agents
new VoltAgent({
  agents: {
    agentWithRetriever,
    agentWithTools,
  },
  logger,
});

console.log("🚀 VoltAgent with Pinecone is running!");
console.log("📚 Two different agents are ready:");
console.log("  1️⃣ Assistant with Retriever - Automatic semantic search on every interaction");
console.log("  2️⃣ Assistant with Tools - LLM decides when to search autonomously");
console.log("");
console.log("🔍 Try asking questions like:");
console.log("  • 'What is VoltAgent?'");
console.log("  • 'Tell me about vector databases'");
console.log("  • 'How does Pinecone work?'");
console.log("  • 'What is RAG?'");
console.log("");
console.log("💡 The Tools Agent will automatically search when needed!");
console.log("");
console.log("📋 Sources tracking: Both agents track which documents were used");
console.log("   Check userContext.get('references') to see sources with IDs and scores");
