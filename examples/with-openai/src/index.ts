import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { OpenAIProvider } from "@voltagent/openai-ai";
import { z } from "zod";

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
  llm: new OpenAIProvider(process.env.OPENAI_API_KEY || ""),
  model: "gpt-4o",
  tools: [weatherTool],
  validate: () => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Please set it in your .env file.");
    }
  },
});

new VoltAgent({
  agents: {
    agent,
  },
});
