import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { tavilyExtractTool, tavilySearchTool } from "./tools";

// Create logger
const logger = createPinoLogger({
  name: "tavily-search-agent",
  level: "info",
});

// Create Memory instance with vector support for semantic search and working memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

// Create the search agent with Tavily tools
const searchAgent = new Agent({
  name: "Web Search Agent",
  instructions: `You are a web search agent powered by Tavily's advanced search API. You can:

1. Search the web for real-time information on any topic
2. Extract content from specific URLs for detailed analysis
3. Provide comprehensive answers based on current web data

When users ask questions that require current information, web search, or verification of facts, use the Tavily search tools to find the most relevant and up-to-date information.

Always be helpful and provide accurate information based on the search results. If you cannot find relevant information, let the user know and suggest alternative approaches.

Example queries you can handle:
- "What's the latest news about AI?"
- "Find information about climate change"
- "Search for the best restaurants in Paris"
- "What's the current weather in New York?"
- "Extract content from this URL: https://example.com/article"`,
  model: openai("gpt-4o-mini"),
  tools: [tavilySearchTool, tavilyExtractTool],
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
