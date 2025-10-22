import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import { honoServer } from "@voltagent/server-hono";

// Create logger
const logger = createPinoLogger({
  name: "memory-rest-api-example",
  level: "info",
});

// Create PostgreSQL memory adapter
const memoryAdapter = new PostgreSQLMemoryAdapter({
  connection:
    process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/voltagent-memory-2",
  debug: true,
});

// Create agent with PostgreSQL memory
const agent = new Agent({
  name: "Memory REST API Agent",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o-mini"),
  memory: new Memory({
    storage: memoryAdapter,
  }),
});

// Create VoltAgent with custom endpoints
new VoltAgent({
  agents: {
    "memory-agent": agent,
  },
  logger,
  server: honoServer({
    port: 3141,
    // Configure app with custom memory endpoints
    configureApp: (app) => {
      logger.info("Registering custom memory endpoints...");

      // ============================================================================
      // CUSTOM ENDPOINTS - Simple examples
      // ============================================================================

      /**
       * List all conversations for a user
       * Example: GET /api/conversations?userId=user-123
       */
      app.get("/api/conversations", async (c) => {
        try {
          const userId = c.req.query("userId");

          if (!userId) {
            return c.json(
              {
                success: false,
                error: "userId query parameter is required",
              },
              400,
            );
          }

          // Get conversations from memory adapter
          const conversations = await memoryAdapter.queryConversations({
            userId,
            orderBy: "updated_at",
            orderDirection: "DESC",
          });

          return c.json({
            success: true,
            data: conversations,
          });
        } catch (error: any) {
          logger.error("Error fetching conversations:", error);
          return c.json(
            {
              success: false,
              error: error.message || "Internal server error",
            },
            500,
          );
        }
      });

      /**
       * Get messages for a specific conversation
       * Example: GET /api/conversations/:conversationId/messages?userId=user-123
       */
      app.get("/api/conversations/:conversationId/messages", async (c) => {
        try {
          const conversationId = c.req.param("conversationId");
          const userId = c.req.query("userId");

          if (!userId) {
            return c.json(
              {
                success: false,
                error: "userId query parameter is required",
              },
              400,
            );
          }

          // Get messages from memory adapter
          const messages = await memoryAdapter.getMessages(userId, conversationId);

          return c.json({
            success: true,
            data: messages,
          });
        } catch (error: any) {
          logger.error("Error fetching messages:", error);
          return c.json(
            {
              success: false,
              error: error.message || "Internal server error",
            },
            500,
          );
        }
      });

      logger.info("Custom memory endpoints registered successfully");
    },
  }),
});
