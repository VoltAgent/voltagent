import { createTool } from "@voltagent/core";
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
  execute: async ({ query }) => {
    // In a real implementation, this would call a search API like Google
    // This is a mock implementation for demonstration purposes

    // Mock search results
    const mockResults = [
      {
        title: `Information about "${query}"`,
        snippet: `This is the first search result about "${query}". It contains some relevant information that might be useful.`,
        url: `https://example.com/result1`,
      },
      {
        title: `More details on "${query}"`,
        snippet: `Another search result with additional details about "${query}". This source discusses related topics and provides deeper insights.`,
        url: `https://example.org/result2`,
      },
      {
        title: `"${query}" explained`,
        snippet: `An explanation of "${query}" with examples and illustrations to help understand the concept better.`,
        url: `https://knowledge.com/result3`,
      },
    ];

    return {
      results: mockResults,
      message: `Found ${mockResults.length} results for "${query}". Here are the top findings:\n\n${mockResults
        .map(
          (result, index) =>
            `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}`,
        )
        .join("\n\n")}`,
    };
  },
});
