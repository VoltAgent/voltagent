import { createTool, resolveUserContext } from "@voltagent/core";
import { z } from "zod";

/**
 * A tool for performing web searches
 */
export const searchTool = createTool({
  name: "search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }, opts) => {
    const userContext = resolveUserContext(opts?.operationContext);

    const searchClient = userContext.get("searchClient");

    userContext.set("foobar", "baz");

    if (!searchClient) {
      throw new Error("Search client not found in user context");
    }

    // In a real implementation, this would call a search API like Google
    // This is a mock implementation for demonstration purposes

    // Mock search results
    const results = await searchClient.search(query);

    return {
      results: results,
      message: `Found ${results.length} results for "${query}". Here are the top findings:\n\n${results
        .map(
          (result, index) =>
            `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}`,
        )
        .join("\n\n")}`,
    };
  },
});
