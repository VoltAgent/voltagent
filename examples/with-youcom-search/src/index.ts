import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { youContentsTool, youSearchTool } from "./tools/you-search-tool.js";

// Create logger
const logger = createPinoLogger({
  name: "youcom-search-agent",
  level: "info",
});

// Create Memory instance with vector support for semantic search and working memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

// Create the search agent with You.com tools
const searchAgent = new Agent({
  name: "You.com Search Agent",
  instructions: `You are a web search agent powered by You.com's advanced search API. You can:

1. Search the web for real-time information on any topic using You.com's search engine
2. Extract detailed content from specific URLs for in-depth analysis
3. Provide comprehensive, up-to-date answers based on current web data

When users ask questions that require current information, web search, or verification of facts, use the You.com search tools to find the most relevant and accurate information.

Key capabilities:
- Real-time web search with comprehensive results  
- Content extraction from any accessible URL
- Safe search filtering and localization options
- Requires YDC_API_KEY for access

Always be helpful and provide accurate information based on the search results. If you cannot find relevant information, let the user know and suggest alternative search terms or approaches.

Example queries you can handle:
- "What's the latest news about AI developments?"
- "Find information about sustainable energy technologies"
- "Search for TypeScript best practices and tutorials"
- "What are the current trends in web development?"
- "Extract content from this URL: https://example.com/article"`,
  model: "openai/gpt-4o-mini",
  tools: [youSearchTool, youContentsTool],
  memory,
});

// Initialize the VoltAgent with the search agent and server
new VoltAgent({
  agents: {
    searchAgent,
  },
  logger,
  server: honoServer(),
});
