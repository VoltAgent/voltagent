import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, LibSQLStorage } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Configure Turso/LibSQL Memory
const memoryStorage = new LibSQLStorage({
  // Read connection details from environment variables
  url: process.env.TURSO_DB_URL || "file:./voltagent-memory.db", // Fallback to local file if URL not set
  authToken: process.env.TURSO_DB_AUTH_TOKEN, // Auth token for Turso (optional for local SQLite)
  // Optional: Customize table names
  // tablePrefix: "my_agent_memory",
  // Optional: Enable debug logging for storage
  // debug: true,
});

const agent = new Agent({
  name: "Turso Memory Agent",
  description: "A helpful assistant that remembers conversations using Turso/LibSQL.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: memoryStorage, // Use the configured LibSQL storage
});

// Create logger
const logger = createPinoLogger({
  name: "with-turso",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
