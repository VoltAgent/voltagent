import { anthropic } from "@ai-sdk/anthropic";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-anthropic",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
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

const agent = new Agent({
  name: "weather-agent",
  description: "A helpful weather assistant that answers questions with weather tools",
  llm: new VercelAIProvider(),
  model: anthropic("claude-opus-4-1"),
  tools: [weatherTool],
  memory: storage,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
