import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { PostgresStorage } from "@voltagent/postgres";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Configure PostgreSQL Memory
const memoryStorage = new PostgresStorage({
  // Read connection details from environment variables
  connection: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "voltagent",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "password",
    ssl: process.env.POSTGRES_SSL === "true",
  },
  // Alternative: Use connection string
  // connection: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/voltagent",

  // Optional: Customize table names
  tablePrefix: "voltagent_memory",

  // Optional: Configure connection pool
  maxConnections: 10,

  // Optional: Set storage limit for messages
  storageLimit: 100,

  // Optional: Enable debug logging for storage
  debug: process.env.NODE_ENV === "development",
});

const agent = new Agent({
  name: "PostgreSQL Memory Agent",
  description: "A helpful assistant that remembers conversations using PostgreSQL.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: memoryStorage, // Use the configured PostgreSQL storage
});

new VoltAgent({
  agents: {
    agent,
  },
});
