import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";

const logger = createPinoLogger({
  name: "with-ollama",
  level: "info",
});

const ollama = createOllama({
  baseURL: process.env.OLLAMA_HOST ?? "http://localhost:11434/api",
});

const getCurrentWeather = createTool({
  name: "get_current_weather",
  description: "Fetch the current weather conditions for a given city",
  parameters: z.object({
    location: z.string().describe("City or location to inspect"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  execute: async ({ location, unit }) => {
    return {
      location,
      temperature: unit === "fahrenheit" ? 72 : 22,
      condition: "Partly cloudy with light winds",
      unit,
    };
  },
});

const agent = new Agent({
  name: "ollama-tool-agent",
  instructions: "You are a helpful assistant",
  model: ollama("llama3.2:latest"),
  tools: [getCurrentWeather],
  logger,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer(),
});
