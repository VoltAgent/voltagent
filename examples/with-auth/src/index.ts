import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { authNext, honoServer, jwtAuth } from "@voltagent/server-hono";

// Import tools
import { weatherTool } from "./tools/index.js";

// Create logger
const logger = createPinoLogger({
  name: "base",
  level: "info",
});

// Create Memory instance with vector support for semantic search and working memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: "openai/text-embedding-3-small",
  vector: new LibSQLVectorAdapter(),
});

const agent = new Agent({
  name: "Base Agent",
  instructions: "You are a helpful assistant that can provide weather information",
  model: "openai/gpt-4o-mini",
  memory: memory,
  tools: [weatherTool],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({
    authNext: {
      provider: jwtAuth({
        secret: "super-secret",
      }),
      publicRoutes: ["/api/health"],
    },
    configureApp: (app) => {
      app.get("/api/health", (c) => c.json({ status: "ok" }));
      app.get("/api/protected", (c) => c.json({ message: "This is protected" }));
    },
  }),
  logger,
});
