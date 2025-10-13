import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Logger
const logger = createPinoLogger({ name: "with-vector-search", level: "info" });

// Memory configured with embeddings + vector DB
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(), // default: file:./.voltagent/memory.db
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small"), {
    // Optional caching/normalization settings
    normalize: false,
  }),
  vector: new LibSQLVectorAdapter(),
  enableCache: true,
  cacheSize: 1000,
  cacheTTL: 60 * 60 * 1000,
});

// Agent: semantic memory is auto-enabled when vector support exists
const agent = new Agent({
  name: "Semantic Memory Agent",
  instructions:
    "You are a helpful assistant. Use semantic memory to recall relevant past messages when answering.",
  model: openai("gpt-4o-mini"),
  memory,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3142 }),
  logger,
});

// Optional: quick demo to seed messages and test semantic recall
// Uncomment to run locally once
// (async () => {
//   const userId = "user-vec-1";
//   const conversationId = "conv-vec-1";
//
//   // Ensure conversation exists
//   await memory.createConversation({
//     id: conversationId,
//     userId,
//     resourceId: agent.id,
//     title: "Vector Search Demo",
//     metadata: {},
//   });
//
//   // Seed prior messages (these will be embedded and stored)
//   await memory.addMessages(
//     [
//       { id: "m1", role: "user", parts: [{ type: "text", text: "We decided to use Stripe as the payment provider." }] },
//       { id: "m2", role: "assistant", parts: [{ type: "text", text: "Got it, Stripe for payments." }] },
//       { id: "m3", role: "user", parts: [{ type: "text", text: "Frontend stack will be Next.js with Tailwind CSS." }] },
//       { id: "m4", role: "assistant", parts: [{ type: "text", text: "Understood, Next.js + Tailwind CSS." }] },
//     ],
//     userId,
//     conversationId,
//   );
//
//   // Now ask a related question; semantic search should recall the earlier decision
//   const res = await agent.generateText("What payment processor did we choose?", {
//     userId,
//     conversationId,
//     // Optional tuning of semantic memory
//     semanticMemory: {
//       enabled: true,
//       semanticLimit: 5,
//       semanticThreshold: 0.2,
//       mergeStrategy: "prepend",
//     },
//   });
//   console.log("Answer:", res.text);
//
//   // You can also run a raw vector search (without LLM):
//   const results = await memory.searchSimilar("payment provider", { limit: 3 });
//   console.log("\nTop vector hits:", results);
// })();
