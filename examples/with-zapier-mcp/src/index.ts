import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const bedrock = createAmazonBedrock({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

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
      model: bedrock("amazon.nova-lite-v1:0"),
      markdown: true,
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
      server: honoServer({ port: 3141 }),
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
}

main();
