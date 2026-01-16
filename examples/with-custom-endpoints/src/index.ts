import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Create logger
const logger = createPinoLogger({
  name: "with-custom-endpoints",
  level: "info",
});

// Create the agent
const agent = new Agent({
  name: "Simple Custom Endpoints Agent",
  instructions:
    "You are a helpful assistant with access to simple custom endpoints: /api/health, /api/hello/:name, /api/calculate, and /api/delete-all",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

// Create VoltAgent with custom endpoints using configureApp
// This gives you full access to the Hono app instance
new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({
    port: 3141,
    // Configure the app with custom routes
    configureApp: (app) => {
      // Health check endpoint
      app.get("/api/health", async (c) => {
        return c.json({
          success: true,
          data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Personalized greeting endpoint with parameter
      app.get("/api/hello/:name", async (c) => {
        const name = c.req.param("name");
        return c.json({
          success: true,
          data: {
            message: `Hello ${name}!`,
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Simple calculator endpoint
      app.post("/api/calculate", async (c) => {
        try {
          const { a, b, operation } = await c.req.json();

          let result: number | string;
          switch (operation) {
            case "add":
              result = a + b;
              break;
            case "subtract":
              result = a - b;
              break;
            case "multiply":
              result = a * b;
              break;
            case "divide":
              result = b !== 0 ? a / b : "Cannot divide by zero";
              break;
            default:
              throw new Error("Invalid operation");
          }

          return c.json({
            success: true,
            data: {
              a,
              b,
              operation,
              result,
            },
          });
        } catch {
          return c.json(
            {
              success: false,
              error: "Invalid input",
            },
            400,
          );
        }
      });

      // Delete all data endpoint
      app.delete("/api/delete-all", async (c) => {
        return c.json({
          success: true,
          data: { message: "All data deleted successfully" },
        });
      });

      // Example of using middleware for a specific route group
      app.use("/api/admin/*", async (c, next) => {
        // Add custom authentication or logging here
        console.log(`Admin route accessed: ${c.req.path}`);
        await next();
      });

      // Example of an admin endpoint
      app.get("/api/admin/stats", async (c) => {
        return c.json({
          success: true,
          data: {
            totalRequests: 1000,
            activeUsers: 42,
            timestamp: new Date().toISOString(),
          },
        });
      });
    },
  }),
});
