import { openai } from "@ai-sdk/openai";
import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import path from "node:path";

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
});

// Create logger
const logger = createPinoLogger({
  name: "with-mcp",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
