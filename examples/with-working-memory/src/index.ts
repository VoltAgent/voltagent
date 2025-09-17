import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-working-memory",
  level: "info",
});

// Define a structured working memory schema (JSON)
// You can also use a Markdown template instead (see below)
const workingMemorySchema = z.object({
  userProfile: z.object({
    name: z.string().optional(),
    preferredTone: z.enum(["casual", "formal", "technical"]).optional(),
    interests: z.array(z.string()).optional(),
  }),
  preferences: z.object({
    likes: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
  }),
  context: z.object({
    currentGoal: z.string().optional(),
    importantNotes: z.array(z.string()).optional(),
  }),
});

// Example alternative: Use a Markdown template for working memory
// const workingMemoryTemplate = `
// ## User Profile
// - Name: {name}
// - Preferred Tone: {preferredTone}
// - Interests: {interests}
//
// ## Preferences
// - Likes: {likes}
// - Dislikes: {dislikes}
//
// ## Context
// - Current Goal: {currentGoal}
// - Important Notes:
// {importantNotes}
// `;

// Memory with LibSQL storage and optional vector search
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    // Uses file:./.voltagent/memory.db by default
    storageLimit: 100,
  }),
  // Optional: enable semantic search
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter(),

  // Enable working memory
  workingMemory: {
    enabled: true,
    scope: "conversation", // or "user" to persist across all conversations for a user
    schema: workingMemorySchema, // for JSON format; or use: template: workingMemoryTemplate
  },
});

// Agent automatically gets working memory system instructions and tools:
// - get_working_memory
// - update_working_memory
// - clear_working_memory
const agent = new Agent({
  name: "Working Memory Agent",
  instructions:
    "You are a helpful assistant. Proactively maintain and use working memory to provide consistent, personalized responses.",
  model: openai("gpt-4o-mini"),
  memory,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
  logger,
});

// Optional quick demo (uncomment to test without LLM tool calls)
// (async () => {
//   const userId = "user-1";
//   const conversationId = "conv-1";
//
//   // Ensure a conversation exists
//   await memory.createConversation({
//     id: conversationId,
//     userId,
//     resourceId: agent.id,
//     title: "Working Memory Demo",
//     metadata: {},
//   });
//
//   // Manually update working memory using the schema
//   await memory.updateWorkingMemory({
//     userId,
//     conversationId,
//     content: {
//       userProfile: { preferredTone: "casual", interests: ["javascript", "ai"] },
//       preferences: { likes: ["pizza"], dislikes: ["spam"] },
//       context: { currentGoal: "Build an agent demo" },
//     },
//   });
//
//   // Read back the working memory content
//   const wm = await memory.getWorkingMemory({ userId, conversationId });
//   console.log("\nCurrent Working Memory:\n", wm);
//
//   // Or get formatted instructions that the agent injects into system prompts
//   const instructions = await memory.getWorkingMemoryInstructions({ userId, conversationId });
//   console.log("\nGenerated Working Memory Instructions:\n", instructions);
// })();
