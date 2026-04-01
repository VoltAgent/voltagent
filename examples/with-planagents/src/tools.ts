import { tavily } from "@tavily/core";
import { createTool } from "@voltagent/core";
import { z } from "zod";

export const internetSearch = createTool({
  name: "internet_search",
  description: "Run a web search",
  parameters: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().default(5).describe("Maximum number of results to return"),
    topic: z
      .enum(["general", "news", "finance"])
      .optional()
      .default("general")
      .describe("Search topic category"),
    includeRawContent: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to include raw content"),
  }),
  execute: async ({ query, maxResults, topic, includeRawContent }) => {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return {
        error: "Missing TAVILY_API_KEY. Set it in your environment to enable search.",
      };
    }

    const tavilyClient = tavily({ apiKey: tavilyApiKey });

    return await tavilyClient.search(query, {
      maxResults,
      topic,
      includeRawContent: includeRawContent ? "markdown" : false,
    });
  },
});
