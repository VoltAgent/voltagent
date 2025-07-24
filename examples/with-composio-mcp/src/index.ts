import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

(async () => {
  try {
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
    });

    // Create logger
    const logger = createPinoLogger({
      name: "with-composio-mcp",
      level: "info",
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
