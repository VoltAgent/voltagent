import { createTool } from "@voltagent/core";
import { z } from "zod";

export const tavilySearchTool = createTool({
  name: "tavilySearch",
  description:
    "Search the web for real-time information using Tavily's advanced search API. This tool provides comprehensive web search results with content extraction and AI-powered answers. IMPORTANT: This tool should ONLY be used when the user explicitly requests web search or when you need to verify information from your database. Do NOT use this tool automatically - always ask the user first if they want you to search the web for additional information.",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query for any topic (e.g., 'latest AI news', 'weather in New York', 'best restaurants in Paris', 'stock market trends')",
      ),
    numResults: z.number().optional().describe("Number of results to return (default: 5, max: 10)"),
    searchDepth: z
      .enum(["basic", "advanced"])
      .optional()
      .describe(
        "Search depth - basic for quick results, advanced for comprehensive search (default: basic)",
      ),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe("Specific domains to search (e.g., ['cnn.com', 'wikipedia.org', 'github.com'])"),
    excludeDomains: z.array(z.string()).optional().describe("Domains to exclude from search"),
    maxResults: z.number().optional().describe("Maximum number of results to return (default: 5)"),
  }),
  execute: async ({
    query,
    numResults = 5,
    searchDepth = "basic",
    includeDomains = [],
    excludeDomains = [],
    maxResults = 5,
  }) => {
    try {
      console.log("🔍 Tavily searching for:", query);

      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: "Tavily API key not configured",
          message: "Tavily API key is required. Please set TAVILY_API_KEY environment variable.",
        };
      }

      // Prepare search request
      const searchRequest = {
        query: query,
        search_depth: searchDepth,
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: Math.min(maxResults, 10),
        include_domains: includeDomains.length > 0 ? includeDomains : undefined,
        exclude_domains: excludeDomains.length > 0 ? excludeDomains : undefined,
        category: "general",
      };

      console.log("📊 Tavily search request:", searchRequest);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(searchRequest),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Tavily response:", data);

      // Process results
      const results = [];

      // Add answer if available
      if (data.answer) {
        results.push({
          title: "Tavily Answer",
          link: "",
          snippet: data.answer,
          source: "Tavily AI Answer",
        });
      }

      // Add search results
      if (data.results && data.results.length > 0) {
        const searchResults = data.results.slice(0, numResults).map((item: any) => ({
          title: item.title || "No Title",
          link: item.url || "",
          snippet: item.content || item.snippet || "",
          source: "Tavily Search",
          publishedDate: item.published_date || null,
          score: item.score || null,
        }));
        results.push(...searchResults);
      }

      // If no results, provide helpful guidance
      if (results.length === 0) {
        results.push({
          title: "No Results Found",
          link: "",
          snippet: `No web search results found for "${query}". Please try a different search query or check the source websites directly.`,
          source: "System Notice",
        });
      }

      console.log("✅ Tavily search completed:", results.length, "results");

      return {
        success: true,
        results: results.slice(0, numResults),
        totalResults: results.length,
        query: query,
        searchDepth: searchDepth,
        message: `Found ${results.length} web search results for "${query}" using Tavily's advanced search. Use this information to supplement your local data.`,
      };
    } catch (error) {
      console.error("❌ Tavily search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tavily search failed",
        message: `Tavily search failed: ${error instanceof Error ? error.message : "Unknown error"}. Please try a different approach or check your local data sources.`,
      };
    }
  },
});

export const tavilyExtractTool = createTool({
  name: "tavilyExtract",
  description:
    "Extract content from a specific URL using Tavily's content extraction API. Useful for getting detailed information from any website, news articles, or documents.",
  parameters: z.object({
    url: z.string().describe("URL to extract content from"),
    includeRawContent: z.boolean().optional().describe("Include raw HTML content (default: false)"),
  }),
  execute: async ({ url, includeRawContent = false }) => {
    try {
      console.log("📄 Tavily extracting from:", url);

      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: "Tavily API key not configured",
          message: "Tavily API key is required. Please set TAVILY_API_KEY environment variable.",
        };
      }

      const extractRequest = {
        urls: [url],
        include_raw_content: includeRawContent,
      };

      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(extractRequest),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📄 Tavily extract response:", data);

      if (data.results && data.results.length > 0) {
        const extractedContent = data.results[0];
        return {
          success: true,
          url: url,
          title: extractedContent.title || "No Title",
          content: extractedContent.content || "",
          rawContent: extractedContent.raw_content || "",
          message: `Successfully extracted content from ${url}`,
        };
      }

      return {
        success: false,
        error: "No content extracted",
        message: `No content could be extracted from ${url}`,
      };
    } catch (error) {
      console.error("❌ Tavily extract error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tavily extract failed",
        message: `Tavily extract failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
