import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

async function main() {
  try {
    const mcpConfig = new MCPConfiguration({
      servers: {
        "hf-mcp-server": {
          url: "https://huggingface.co/mcp",
          requestInit: {
            headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}` },
          },
          type: "http",
        },
      },
    });

    const agent = new Agent({
      name: "Hugging Face MCP Agent",
      instructions: "You are a helpful assistant with access to Hugging Face MCP tools.",
      tools: await mcpConfig.getTools(),
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });

    // Create logger
    const logger = createPinoLogger({
      name: "with-hugging-face-mcp",
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
