import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { MongoDBMemoryAdapter } from "@voltagent/mongodb";
import { honoServer } from "@voltagent/server-hono";

// Configure MongoDB Memory
const memoryStorage = new MongoDBMemoryAdapter({
  // MongoDB connection URI
  connection: process.env.MONGO_URI || "mongodb://localhost:27017",

  // Optional: Database name (default: "voltagent")
  database: "voltagent",

  // Optional: Customize collection name prefix
  collectionPrefix: "voltagent_memory",

  // Optional: Enable debug logging for storage
  debug: process.env.NODE_ENV === "development",
});

const agent = new Agent({
  name: "MongoDB Memory Agent",
  instructions: "A helpful assistant that remembers conversations using MongoDB.",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: memoryStorage,
  }),
});

// Create logger
const logger = createPinoLogger({
  name: "with-mongodb",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
