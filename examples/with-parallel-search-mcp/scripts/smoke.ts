import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MCPConfiguration } from "@voltagent/core";
import { getParallelTools, parallelServer } from "../src/parallel.js";

// A separate hosted check: no model credentials or Parallel API key required.
const mcpConfig = new MCPConfiguration({ servers: { parallel: parallelServer } });
const sessionId = randomUUID();

try {
  const tools = await getParallelTools(mcpConfig);
  const search = tools.find((tool) => tool.name === "parallel_web_search");
  const fetch = tools.find((tool) => tool.name === "parallel_web_fetch");
  assert(search?.execute && fetch?.execute);

  const searchResult = await search.execute({
    objective: "Find the official VoltAgent documentation about MCP tools.",
    search_queries: ["VoltAgent MCP tools documentation"],
    session_id: sessionId,
  });
  assert(searchResult && typeof searchResult === "object" && "results" in searchResult);
  assert(searchResult.results.some((page) => page.url && page.excerpts.length > 0));

  const fetchResult = await fetch.execute({
    urls: ["https://docs.parallel.ai/integrations/mcp/search-mcp"],
    objective: "Explain anonymous access and the available search and fetch tools.",
    full_content: false,
    session_id: sessionId,
  });
  assert(fetchResult && typeof fetchResult === "object" && "results" in fetchResult);
  assert(fetchResult.results.some((page) => page.excerpts.length > 0));
  assert("errors" in fetchResult && Array.isArray(fetchResult.errors));
  assert.equal(fetchResult.errors.length, 0);
  console.log(`Search: ${searchResult.results.length} sources with excerpts.`);
  console.log(`Fetch: ${fetchResult.results.length} pages with excerpts, no URL errors.`);
} finally {
  await mcpConfig.disconnect();
}
