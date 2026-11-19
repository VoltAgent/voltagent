import { Agent, MCPConfiguration, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-battle-training-mcp",
  level: "info",
});

const mcpConfig = new MCPConfiguration({
  servers: {
    battleTraining: {
      type: "streamable-http",
      url: "https://api.battle.training/mcp",
    },
  },
});

const arenaTools = await mcpConfig.getTools();
if (arenaTools.length === 0) {
  logger.error("No tools loaded from battle.training MCP server");
  throw new Error("Failed to discover tools from https://api.battle.training/mcp");
}

const agent = new Agent({
  name: "Battle Training Advisor Agent",
  instructions:
    "You are an AI game analyst for battle.training. " +
    "Use the battleTraining MCP tools to query ladders, analyze bot performance, inspect match results, and explain Season 2 rules.",
  model: "openai/gpt-4o-mini",
  tools: arenaTools,
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
  server: honoServer({ port: 3142 }),
});
