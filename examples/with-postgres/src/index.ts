import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import { honoServer } from "@voltagent/server-hono";

// Configure PostgreSQL Memory
const memoryStorage = new PostgreSQLMemoryAdapter({
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

  // Optional: Enable debug logging for storage
  debug: process.env.NODE_ENV === "development",
});

const agent = new Agent({
  name: "PostgreSQL Memory Agent",
  instructions: "A helpful assistant that remembers conversations using PostgreSQL.",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: memoryStorage,
  }),
});

// Create logger
const logger = createPinoLogger({
  name: "with-postgres",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
