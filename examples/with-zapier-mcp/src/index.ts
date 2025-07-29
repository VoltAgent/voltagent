import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const bedrock = createAmazonBedrock({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

async function main() {
  try {
    const zapierMcpConfig = new MCPConfiguration({
      servers: {
        zapier: {
          type: "http",
          url: process.env.ZAPIER_MCP_URL!,
        },
      },
    });

    const zapierTools = await zapierMcpConfig.getTools();

    const agent = new Agent({
      id: "zapier-mcp",
      name: "Zapier MCP Agent",
      description: "A helpful assistant using a lightweight provider",
      tools: zapierTools,
      llm: new VercelAIProvider(),
      model: bedrock("amazon.nova-lite-v1:0"),
      markdown: true,
    });

    // Create logger
    const logger = createPinoLogger({
      name: "with-zapier-mcp",
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
}

main();
