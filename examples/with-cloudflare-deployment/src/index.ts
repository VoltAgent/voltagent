import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, mergeProcessEnv } from "@voltagent/core";
import { edgeHono } from "@voltagent/edge-hono";
import { z } from "zod";

// Environment types for Cloudflare Workers
export interface Env {
  OPENAI_API_KEY: string;
  VOLTAGENT_PUBLIC_KEY?: string;
  VOLTAGENT_SECRET_KEY?: string;
  VOLTOPS_BASE_URL?: string;
  ENVIRONMENT?: string;
}

// Define a simple tool for demonstration
const weatherTool = createTool({
  id: "get-weather",
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
  }),
  execute: async ({ location }, context) => {
    // In a real implementation, this would call a weather API
    // This is a mock implementation for demonstration purposes

    context?.logger.info(`Fetching weather for ${location}`);
    const mockWeatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 5, // Random temp between 5-35°C
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"][
        Math.floor(Math.random() * 5)
      ],
      humidity: Math.floor(Math.random() * 60) + 30, // Random humidity between 30-90%
      windSpeed: Math.floor(Math.random() * 30), // Random wind speed between 0-30 km/h
    };

    return {
      weather: mockWeatherData,
      message: `Current weather in ${location}: ${mockWeatherData.temperature}°C and ${mockWeatherData.condition.toLowerCase()} with ${mockWeatherData.humidity}% humidity and wind speed of ${mockWeatherData.windSpeed} km/h.`,
    };
  },
});

// Create the agent
const agent = new Agent({
  name: "Cloudflare Agent",
  instructions: `You are a helpful AI assistant deployed on Cloudflare Workers.
    You can help with various tasks and have access to weather information.
    You're running on the edge, providing fast responses from locations worldwide.`,
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

let cachedVoltAgent: VoltAgent | undefined;

function getVoltAgent(env: Env): VoltAgent {
  mergeProcessEnv(env as unknown as Record<string, unknown>);
  if (cachedVoltAgent) {
    return cachedVoltAgent;
  }

  cachedVoltAgent = new VoltAgent({
    agents: { agent },
    edge: edgeHono(),
  });

  return cachedVoltAgent;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const voltAgent = getVoltAgent(env);

    const cloudflareWorker = voltAgent.edge().toCloudflareWorker();
    const runtimeEnv = env as unknown as Record<string, unknown>;
    return cloudflareWorker.fetch(request, runtimeEnv, ctx);
  },
};
