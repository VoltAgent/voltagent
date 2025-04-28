import { VoltAgent, Agent, Tool } from "@voltagent/core";
import { AnthropicProvider } from "@voltagent/anthropic-ai";
import { z } from "zod";

const weatherTool = new Tool({
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
  llm: new AnthropicProvider(),
  model: "claude-3-sonnet-20240229",
  tools: [weatherTool],
});

new VoltAgent({
  agents: {
    agent,
  },
});
