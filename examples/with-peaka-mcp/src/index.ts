import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

import { openai } from "@ai-sdk/openai";

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

  const memory = new LibSQLStorage({
    logger: logger.child({ component: "libsql" }),
  });

  const tools = await mcp.getTools();
  const agent = new Agent({
    name: "Peaka Data Assistant",
    description: "An assistant that can query Peaka's sample data.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    tools: [...tools],
    markdown: true,
    memory,
  });

  new VoltAgent({
    agents: {
      agent,
    },
    logger,
  });
})();
