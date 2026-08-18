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
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of search results to return (default: 10, max: 20)"),
    offset: z.number().int().min(0).max(9).optional().describe("Offset for pagination (default: 0, max: 9)"),
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
      console.log("🔍 You.com search initiated");

      // Check for API key - required for You.com
      const apiKey = process.env.YDC_API_KEY;
      if (!apiKey) {
        throw new Error("YDC_API_KEY is required for You.com API access");
      }

      // Prepare search request body
      const requestBody = {
        query,
        num_web_results: count,
        offset,
        safesearch: safeSearch,
        country,
      };

      // Remove undefined properties
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key] === undefined) {
          delete requestBody[key];
        }
      });

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "VoltAgent/2.0 (+https://github.com/VoltAgent/voltagent)",
      };

      console.log("📊 You.com search request prepared");

      // Setup timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("https://api.you.com/search", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`You.com API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 You.com response received");

      // Define response schema
      const youcomResponseSchema = z.object({
        data: z.object({
          results: z.object({
            web: z.array(z.object({
              title: z.string(),
              url: z.string(),
              snippet: z.string(),
              favicon: z.string().optional(),
            })).optional(),
          }),
        }).optional(),
      });

      const parsedResponse = youcomResponseSchema.safeParse(data);
      if (!parsedResponse.success) {
        throw new Error("Invalid You.com API response format");
      }

      // Process search results
      const results = [];
      const webResults = parsedResponse.data.data?.results?.web || [];

      if (webResults.length > 0) {
        const searchResults = webResults.slice(0, count).map((item) => ({
          title: item.title || "No Title",
          url: item.url || "",
          snippet: item.snippet || "",
          source: "You.com Search",
          favicon: item.favicon || null,
        }));
        results.push(...searchResults);
      }

      // Don't add synthetic "No Results Found" entries
      const actualResultCount = results.length;

      console.log("✅ You.com search completed:", actualResultCount, "results");

      return {
        success: true,
        results,
        totalResults: actualResultCount,
        query,
        count,
        offset,
        message: `Found ${actualResultCount} search results using You.com's search API.`,
      };
    } catch (error) {
      console.error("❌ You.com search error:", error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "Request timeout",
          message: "You.com search request timed out. Please try again.",
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "You.com search failed",
        message: `You.com search failed: ${error instanceof Error ? error.message : "Unknown error"}. Please check your API key and try again.`,
      };
    }
  },
});

export const youContentsTool = createTool({
  name: "youContents",
  description:
    "Extract and read content from specific URLs using You.com's content extraction API. Useful for getting detailed information from web pages, articles, or documents beyond search snippets.",
  parameters: z.object({
    url: z.string().url().describe("URL to extract content from"),
  }),
  execute: async ({ url }) => {
    try {
      console.log("📄 You.com content extraction initiated");

      // Check for API key - required for You.com
      const apiKey = process.env.YDC_API_KEY;
      if (!apiKey) {
        throw new Error("YDC_API_KEY is required for You.com API access");
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "User-Agent": "VoltAgent/2.0 (+https://github.com/VoltAgent/voltagent)",
      };

      const requestBody = {
        urls: [url],
      };

      // Setup timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("https://api.you.com/contents", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`You.com API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📄 You.com content extraction completed");

      // Define content response schema
      const contentResponseSchema = z.object({
        pages: z.array(z.object({
          html: z.string().optional(),
          markdown: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          author: z.string().optional(),
          published_date: z.string().optional(),
          language: z.string().optional(),
        })).optional(),
      });

      const parsedResponse = contentResponseSchema.safeParse(data);
      if (!parsedResponse.success) {
        throw new Error("Invalid You.com content API response format");
      }

      const pages = parsedResponse.data.pages || [];
      if (pages.length > 0 && pages[0]) {
        const page = pages[0];
        const content = page.html || page.markdown || "";
        
        if (content) {
          return {
            success: true,
            url,
            title: page.title || "Extracted Content",
            content,
            markdown: page.markdown || null,
            metadata: {
              description: page.description || null,
              author: page.author || null,
              publishedDate: page.published_date || null,
              language: page.language || null,
            },
            message: `Successfully extracted content from ${url}`,
          };
        }
      }

      return {
        success: false,
        error: "No content extracted",
        message: `No content could be extracted from ${url}. The page may be inaccessible or contain no readable content.`,
      };
    } catch (error) {
      console.error("❌ You.com content extraction error:", error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: "Request timeout",
          message: "You.com content extraction request timed out. Please try again.",
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content extraction failed",
        message: `Content extraction failed: ${error instanceof Error ? error.message : "Unknown error"}. Please verify the URL is accessible and your API key is valid.`,
      };
    }
  },
});
