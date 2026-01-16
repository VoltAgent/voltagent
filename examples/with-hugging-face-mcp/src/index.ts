import { Agent, MCPConfiguration, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

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
}

main();
