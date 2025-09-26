import { anthropic } from "@ai-sdk/anthropic";
import { Agent, Memory, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-anthropic",
  level: "info",
});

const weatherTool = createTool({
  name: "get_current_weather",
  description: "Get the current weather in a location",
  // Use Zod schema instead of JSON Schema
  parameters: z.object({
    location: z.string().describe("The location to get weather for"),
  }),
  execute: async (input) => {
    return {
      location: input.location,
    };
  },
});

/**
 * Jina MCP Server Tool for Testing VoltAgent Tool Result Bug
 *
 * This tool simulates the exact behavior of the Jina MCP server
 * that was causing issues in production where tool_result blocks
 * were not being generated.
 */
export const jinaMCPTool = createTool({
  name: "jina-mcp-server_search_web",
  description: "Search the web using Jina MCP server - reproduces the tool_result bug",
  parameters: z.object({
    query: z.string().describe("The search query"),
    num: z.number().default(8).describe("Number of results to return"),
  }),
  execute: async ({ query, num = 8 }) => {
    // Simulate the exact behavior from production
    if (query === "empty_content_test") {
      // This simulates the second call that returns empty content
      // This is the scenario that triggers the bug
      return {
        content: [],
      };
    }

    // This simulates successful calls
    return {
      content: [
        {
          text: `Search results for: ${query}`,
          type: "text",
        },
        {
          text: `Found ${num} results for your query`,
          type: "text",
        },
      ],
    };
  },
});

const agent = new Agent({
  name: "weather-agent",
  instructions:
    "A helpful assistant that can search the web and get weather information. This agent is specifically designed to test the VoltAgent tool_result bug with MCP tools.",
  model: anthropic("claude-opus-4-1"),
  tools: [weatherTool, jinaMCPTool],
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
