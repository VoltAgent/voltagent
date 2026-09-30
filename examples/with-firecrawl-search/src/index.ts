import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { firecrawlScrapeTool, firecrawlSearchTool } from "./tools.js";

// Create logger
const logger = createPinoLogger({
  name: "firecrawl-search-agent",
  level: "info",
});

// Create Memory instance backed by LibSQL
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

// Create the research agent with Firecrawl tools
const researchAgent = new Agent({
  name: "Web Research Agent",
  instructions: `You answer questions with current information from the web.

1. Use firecrawlSearch to find relevant pages.
2. If the search descriptions are not enough to answer, use firecrawlScrape on the one or two most relevant URLs to read the full page.
3. Answer from what you found and cite the URLs you used.

If a tool returns an error, tell the user what went wrong.`,
  model: "openai/gpt-4o-mini",
  tools: [firecrawlSearchTool, firecrawlScrapeTool],
  memory,
});

// Initialize the VoltAgent with the research agent and server
new VoltAgent({
  agents: {
    researchAgent,
  },
  logger,
  server: honoServer(),
});
