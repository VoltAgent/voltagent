import { openai } from "@ai-sdk/openai";
import {
  Agent,
  AiSdkEmbeddingAdapter,
  Memory,
  VoltAgent,
  VoltAgentObservability,
} from "@voltagent/core";
import {
  LibSQLMemoryAdapter,
  LibSQLObservabilityAdapter,
  LibSQLVectorAdapter,
} from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-working-memory",
  level: "info",
});

// ============================================================================
// JSON Agent - Uses Zod Schema for structured working memory
// ============================================================================

// Define a structured working memory schema for JSON agent
const workingMemorySchema = z.object({
  userProfile: z.object({
    name: z.string().optional(),
    preferredTone: z.enum(["casual", "formal", "technical"]).optional(),
    interests: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
  preferences: z.object({
    likes: z.array(z.string()).optional(),
    dislikes: z.array(z.string()).optional(),
    communicationStyle: z.string().optional(),
  }),
  context: z.object({
    currentGoal: z.string().optional(),
    importantNotes: z.array(z.string()).optional(),
    recentTopics: z.array(z.string()).optional(),
  }),
});

// Memory for JSON agent with structured schema
const jsonMemory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/json-memory.db",
  }),
  // Enable working memory with JSON schema
  workingMemory: {
    enabled: true,
    scope: "user",
    schema: workingMemorySchema, // JSON format with deep merge support
  },
});

// JSON agent with structured memory
const jsonAgent = new Agent({
  name: "JSON Memory Agent",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4o-mini"),
  memory: jsonMemory,
});

// ============================================================================
// Markdown Agent - Uses template for free-form working memory
// ============================================================================

// Define a Markdown template for free-form working memory
const workingMemoryTemplate = `
## User Profile
- Name: {name}
- Location: {location}
- Preferred Communication Style: {style}
- Key Interests: {interests}

## Conversation History & Context
{context}

## Important Notes & Preferences
{notes}

## Action Items & Goals
{goals}
`;

// Memory for Markdown agent with template
const markdownMemory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/markdown-memory.db",
  }),
  workingMemory: {
    enabled: true,
    scope: "conversation",
    template: workingMemoryTemplate, // Markdown format with append support
  },
});

// Markdown agent with free-form memory
const markdownAgent = new Agent({
  name: "Markdown Memory Agent",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o-mini"),
  memory: markdownMemory,
});

new VoltAgent({
  agents: {
    jsonAgent,
    markdownAgent,
  },
  server: honoServer({ port: 3141 }),
  logger,
  observability: new VoltAgentObservability({
    logger,
    storage: new LibSQLObservabilityAdapter({
      // Local file (default): creates ./.voltagent/observability.db if not present
      // url: "file:./.voltagent/observability.db",
      // Remote Turso example:
      // url: "libsql://<your-db>.turso.io",
      // authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  }),
});
