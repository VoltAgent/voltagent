import { Agent, MCPConfiguration, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

(async () => {
  try {
    const logger = createPinoLogger({
      name: "with-composio-mcp",
      level: "info",
    });

    const mcpConfig = new MCPConfiguration({
      servers: {
        composio: {
          type: "http",
          url: "https://mcp.composio.dev/composio/server/YOUR-SERVER-ID",
        },
      },
    });

    const agent = new Agent({
      name: "Composio MCP Agent",
      instructions: "A helpful assistant using a lightweight provider",
      tools: await mcpConfig.getTools(),
      model: "openai/gpt-4o-mini",
      memory: new Memory({
        storage: new LibSQLMemoryAdapter({
          url: "file:./.voltagent/memory.db",
        }),
      }),
    });

    new VoltAgent({
      agents: {
        agent,
      },
      logger,
      server: honoServer({ port: 3141 }),
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
})();
