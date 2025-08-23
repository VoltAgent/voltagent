import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { VercelAIProvider } from "@voltagent/vercel-ai";

async function main() {
  try {
    const logger = createPinoLogger({
      name: "with-hugging-face-mcp",
      level: "info",
    });

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
      server: honoServer({ port: 3141 }),
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
}

main();
