import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { bochaSearchTool } from "./tools";

const logger = createPinoLogger({
  name: "bocha-search-agent",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

const searchAgent = new Agent({
  name: "Bocha Web Search Agent",
  instructions: `You are a web search agent powered by Bocha Web Search.

Use the Bocha search tool when users ask for current information, source-linked web results, recent news, or fact verification.
Summarize findings clearly and include source links from the tool results.
If Bocha returns no relevant results, say so and suggest a more specific query.`,
  model: "openai/gpt-4o-mini",
  tools: [bochaSearchTool],
  memory,
});

new VoltAgent({
  agents: {
    searchAgent,
  },
  logger,
  server: honoServer(),
});
