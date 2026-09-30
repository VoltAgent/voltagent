import { createTool } from "@voltagent/core";
import { z } from "zod";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v2";
const REQUEST_TIMEOUT_MS = 120_000;

// Keep page content small enough for the model's context window
const MAX_SEARCH_MARKDOWN_LENGTH = 5_000;
const MAX_SCRAPE_MARKDOWN_LENGTH = 20_000;

const missingApiKeyResult = {
  success: false,
  error: "Firecrawl API key not configured",
  message: "Firecrawl API key is required. Please set FIRECRAWL_API_KEY environment variable.",
};

const truncateMarkdown = (markdown: string, maxLength: number) =>
  markdown.length > maxLength ? `${markdown.slice(0, maxLength)}\n\n[Content truncated]` : markdown;

const callFirecrawl = async (path: string, apiKey: string, body: Record<string, unknown>) => {
  const response = await fetch(`${FIRECRAWL_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, origin: "voltagent" }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // Keep the HTTP status error for failed responses, but surface invalid JSON on success
  const data = await response.json().catch((error) => {
    if (response.ok) throw error;
    return {};
  });

  if (!response.ok) {
    const detail = typeof data.error === "string" ? `: ${data.error}` : "";
    throw new Error(`Firecrawl API error ${response.status}${detail}`);
  }

  return data;
};

export const firecrawlSearchTool = createTool({
  name: "firecrawlSearch",
  description:
    "Search the web with Firecrawl and return titles, URLs and descriptions, optionally with the page content as Markdown.",
  parameters: z.object({
    query: z.string().describe("Search query (e.g., 'latest TypeScript release notes')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results to return (default: 5, max: 10)"),
    scrapeContent: z
      .boolean()
      .optional()
      .describe("Also return each result's page content as Markdown (default: false)"),
  }),
  execute: async ({ query, limit = 5, scrapeContent = false }) => {
    try {
      console.log("Firecrawl search:", query);

      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        return missingApiKeyResult;
      }

      const data = await callFirecrawl("/search", apiKey, {
        query,
        limit,
        ...(scrapeContent ? { scrapeOptions: { formats: ["markdown"] } } : {}),
      });

      const results = (data.data?.web ?? []).map((item: any) => ({
        title: item.title || "No Title",
        url: item.url || "",
        description: item.description || "",
        ...(item.markdown
          ? { markdown: truncateMarkdown(item.markdown, MAX_SEARCH_MARKDOWN_LENGTH) }
          : {}),
      }));

      return {
        success: true,
        query,
        results,
        totalResults: results.length,
        message:
          results.length > 0
            ? `Found ${results.length} web results for "${query}".`
            : `No web results found for "${query}". Try a different search query.`,
      };
    } catch (error) {
      console.error("Firecrawl search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Firecrawl search failed",
        message: `Firecrawl search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

export const firecrawlScrapeTool = createTool({
  name: "firecrawlScrape",
  description: "Fetch a URL with Firecrawl and return the page as clean Markdown.",
  parameters: z.object({
    url: z.string().describe("URL of the page to fetch"),
    onlyMainContent: z
      .boolean()
      .optional()
      .describe("Drop navigation, headers and footers (default: true)"),
  }),
  execute: async ({ url, onlyMainContent = true }) => {
    try {
      console.log("Firecrawl scrape:", url);

      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        return missingApiKeyResult;
      }

      const data = await callFirecrawl("/scrape", apiKey, {
        url,
        formats: ["markdown"],
        onlyMainContent,
      });

      const markdown = data.data?.markdown;
      if (!markdown) {
        return {
          success: false,
          error: "No content returned",
          message: `No content could be fetched from ${url}`,
        };
      }

      return {
        success: true,
        url,
        title: data.data.metadata?.title || "No Title",
        markdown: truncateMarkdown(markdown, MAX_SCRAPE_MARKDOWN_LENGTH),
        message: `Fetched ${url} as Markdown.`,
      };
    } catch (error) {
      console.error("Firecrawl scrape error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Firecrawl scrape failed",
        message: `Firecrawl scrape failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
