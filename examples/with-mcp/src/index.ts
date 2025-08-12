import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create logger
const logger = createPinoLogger({
  name: "with-mcp",
  level: "info",
});

const mcpConfig = new MCPConfiguration({
  servers: {
    filesystem: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", path.resolve("./data")],
    },
  },
});

const agent = new Agent({
  name: "MCP Example Agent",
  description: "You help users read and write files",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: await mcpConfig.getTools(),
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
