import { createTool } from "@voltagent/core";
import { z } from "zod";

export const youSearchTool = createTool({
  name: "youSearch",
  description:
    "Search the web for real-time information using You.com's advanced search API. Provides comprehensive web search results with content snippets and source URLs. Use this for current events, factual information, and web research tasks.",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query for any topic (e.g., 'latest AI developments', 'climate change news', 'TypeScript best practices')",
      ),
    count: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of search results to return (default: 10, max: 20)"),
    offset: z.number().min(0).optional().describe("Offset for pagination (default: 0)"),
    country: z
      .string()
      .optional()
      .describe("Country code for localized results (e.g., 'US', 'UK', 'CA')"),
    safeSearch: z
      .enum(["strict", "moderate", "off"])
      .optional()
      .describe("Safe search filter level (default: 'moderate')"),
  }),
  execute: async ({ query, count = 10, offset = 0, country, safeSearch = "moderate" }) => {
    try {
      console.log("🔍 You.com searching for:", query);

      // Check for API key - optional for You.com
      const apiKey = process.env.YDC_API_KEY;

      // Prepare search parameters
      const searchParams = new URLSearchParams({
        query,
        count: count.toString(),
        offset: offset.toString(),
        safeSearch,
      });

      if (country) {
        searchParams.append("country", country);
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "VoltAgent/2.0 (+https://github.com/VoltAgent/voltagent)",
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      console.log("📊 You.com search request:", { query, count, offset, country, safeSearch });

      const response = await fetch(`https://api.you.com/search?${searchParams}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`You.com API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 You.com response received");

      // Process search results
      const results = [];

      // Process web search results
      if (data.hits && Array.isArray(data.hits)) {
        const searchResults = data.hits.slice(0, count).map((item: any) => ({
          title: item.title || "No Title",
          url: item.url || "",
          snippet: item.snippets && item.snippets.length > 0 ? item.snippets.join(" ") : "",
          source: "You.com Search",
          favicon: item.favicon_url || null,
        }));
        results.push(...searchResults);
      }

      // If no results, provide helpful guidance
      if (results.length === 0) {
        results.push({
          title: "No Results Found",
          url: "",
          snippet: `No web search results found for "${query}". Please try a different search query or check the spelling.`,
          source: "System Notice",
          favicon: null,
        });
      }

      console.log("✅ You.com search completed:", results.length, "results");

      return {
        success: true,
        results,
        totalResults: results.length,
        query,
        count,
        offset,
        message: `Found ${results.length} search results for "${query}" using You.com's search API. ${apiKey ? "Using authenticated API access." : "Using public API access (consider setting YDC_API_KEY for enhanced features)."}`,
      };
    } catch (error) {
      console.error("❌ You.com search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "You.com search failed",
        message: `You.com search failed: ${error instanceof Error ? error.message : "Unknown error"}. Please check your internet connection and try again.`,
      };
    }
  },
});

export const youContentssTool = createTool({
  name: "youContents",
  description:
    "Extract and read content from specific URLs using You.com's content extraction API. Useful for getting detailed information from web pages, articles, or documents beyond search snippets.",
  parameters: z.object({
    url: z.string().url().describe("URL to extract content from"),
  }),
  execute: async ({ url }) => {
    try {
      console.log("📄 You.com extracting content from:", url);

      // Check for API key - optional for You.com
      const apiKey = process.env.YDC_API_KEY;

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "VoltAgent/2.0 (+https://github.com/VoltAgent/voltagent)",
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const requestBody = {
        url,
      };

      const response = await fetch("https://api.you.com/contents", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`You.com API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📄 You.com content extraction completed");

      if (data.content || data.text) {
        return {
          success: true,
          url,
          title: data.title || "Extracted Content",
          content: data.content || data.text || "",
          markdown: data.markdown || null,
          metadata: {
            description: data.description || null,
            author: data.author || null,
            publishedDate: data.published_date || null,
            language: data.language || null,
          },
          message: `Successfully extracted content from ${url}`,
        };
      }

      return {
        success: false,
        error: "No content extracted",
        message: `No content could be extracted from ${url}. The page may be inaccessible or contain no readable content.`,
      };
    } catch (error) {
      console.error("❌ You.com content extraction error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content extraction failed",
        message: `Content extraction failed: ${error instanceof Error ? error.message : "Unknown error"}. Please verify the URL is accessible and try again.`,
      };
    }
  },
});
