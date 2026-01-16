import { Agent, MCPConfiguration, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const mcp = new MCPConfiguration({
  servers: {
    peaka: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@peaka/mcp-server-peaka@latest"],
      env: { PEAKA_API_KEY: process.env.PEAKA_API_KEY || "" },
    },
  },
});

(async () => {
  const logger = createPinoLogger({
    name: "with-peaka-mcp",
    level: "info",
  });

  const tools = await mcp.getTools();
  const agent = new Agent({
    name: "Peaka Data Assistant",
    instructions: "An assistant that can query Peaka's sample data.",
    model: "openai/gpt-4o-mini",
    tools: [...tools],
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
})();
