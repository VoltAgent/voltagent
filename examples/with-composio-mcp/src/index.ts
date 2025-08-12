import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

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
      description: "A helpful assistant using a lightweight provider",
      tools: await mcpConfig.getTools(),
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
      memory: new LibSQLStorage({
        url: "file:./.voltagent/memory.db",
        logger: logger.child({ component: "libsql" }),
      }),
    });

    new VoltAgent({
      agents: {
        agent,
      },
      logger,
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
})();
