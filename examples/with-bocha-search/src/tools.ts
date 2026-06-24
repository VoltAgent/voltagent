import { createTool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { z } from "zod";
import { type BochaSearchResponse, buildBochaSearchRequest, mapBochaSearchResponse } from "./bocha";

const DEFAULT_BOCHA_SEARCH_API_URL = "https://api.bochaai.com/v1/web-search";
const MAX_RESULT_COUNT = 10;

const bochaSearchResultSchema = z.object({
  title: z.string(),
  link: z.string(),
  snippet: z.string(),
  source: z.string(),
  publishedDate: z.string().nullable(),
});

const bochaSearchOutputSchema = z.object({
  success: z.boolean(),
  results: z.array(bochaSearchResultSchema),
  totalResults: z.number(),
  query: z.string(),
  message: z.string(),
  error: z.string().optional(),
});

const bochaSearchParametersSchema = z.object({
  query: z.string().describe("Search query for current web information."),
  count: z
    .number()
    .int()
    .min(1)
    .max(MAX_RESULT_COUNT)
    .optional()
    .describe("Number of results to return. Defaults to 5, maximum 10."),
  freshness: z
    .string()
    .optional()
    .describe("Freshness filter supported by Bocha, such as noLimit or oneWeek."),
  includeDomains: z
    .array(z.string())
    .optional()
    .describe("Specific domains to include, for example ['github.com', 'voltagent.dev']."),
  excludeDomains: z.array(z.string()).optional().describe("Domains to exclude from search."),
});

export const bochaSearchTool = createTool({
  name: "bochaSearch",
  description:
    "Search the web for current information using Bocha Web Search. Use this when the user needs up-to-date, source-linked web results or asks to verify facts online.",
  parameters: bochaSearchParametersSchema,
  outputSchema: bochaSearchOutputSchema,
  execute: async (input, options) => {
    const apiKey = process.env.BOCHA_SEARCH_API_KEY;
    const apiUrl = process.env.BOCHA_SEARCH_API_URL ?? DEFAULT_BOCHA_SEARCH_API_URL;

    if (!apiKey) {
      return {
        success: false,
        results: [],
        totalResults: 0,
        query: input.query,
        error: "Bocha Search API key not configured",
        message:
          "Bocha Search API key is required. Please set the BOCHA_SEARCH_API_KEY environment variable.",
      };
    }

    try {
      options?.logger?.info("Searching with Bocha Web Search", { query: input.query });

      const searchRequest = buildBochaSearchRequest(input);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: safeStringify(searchRequest),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Bocha API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as BochaSearchResponse;
      const results = mapBochaSearchResponse(data).slice(0, searchRequest.count);

      if (results.length === 0) {
        return {
          success: true,
          results: [
            {
              title: "No Results Found",
              link: "",
              snippet: `No Bocha web search results found for "${input.query}". Try a different query or broaden the filters.`,
              source: "System Notice",
              publishedDate: null,
            },
          ],
          totalResults: 0,
          query: input.query,
          message: `No Bocha web search results found for "${input.query}".`,
        };
      }

      return {
        success: true,
        results,
        totalResults: results.length,
        query: input.query,
        message: `Found ${results.length} Bocha web search results for "${input.query}".`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      options?.logger?.error("Bocha search failed", { error: message });

      return {
        success: false,
        results: [],
        totalResults: 0,
        query: input.query,
        error: message,
        message: `Bocha search failed: ${message}. Please check your API key, endpoint, or network connection.`,
      };
    }
  },
});
