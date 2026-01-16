import { Agent, MCPConfiguration, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

async function main() {
  try {
    const logger = createPinoLogger({
      name: "with-zapier-mcp",
      level: "info",
    });

    // Memory will be inline in Agent constructor

    const zapierMcpConfig = new MCPConfiguration({
      servers: {
        zapier: {
          type: "http",
          url: process.env.ZAPIER_MCP_URL || "",
        },
      },
    });

    const zapierTools = await zapierMcpConfig.getTools();

    const agent = new Agent({
      id: "zapier-mcp",
      name: "Zapier MCP Agent",
      instructions: "A helpful assistant using a lightweight provider",
      tools: zapierTools,
      model: "amazon-bedrock/amazon.nova-lite-v1:0",
      markdown: true,
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
}

main();
