import { openai } from "@ai-sdk/openai";
import { registerCopilotKitRoutes } from "@voltagent/ag-ui";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

/**
 * Base-style VoltAgent server with CopilotKit endpoint.
 * - Hono server on PORT (default 3141)
 * - VoltAgent default routes + /copilotkit for CopilotKit clients
 */
const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
  }),
  outputSchema: z.object({
    weather: z.object({
      location: z.string(),
      temperature: z.number(),
      condition: z.string(),
      humidity: z.number(),
      windSpeed: z.number(),
    }),
    message: z.string(),
  }),
  execute: async ({ location }) => {
    const mockWeatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 5,
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"][
        Math.floor(Math.random() * 5)
      ],
      humidity: Math.floor(Math.random() * 60) + 30,
      windSpeed: Math.floor(Math.random() * 30),
    };

    return {
      weather: mockWeatherData,
      message: `Current weather in ${location}: ${mockWeatherData.temperature}°C and ${mockWeatherData.condition.toLowerCase()} with ${mockWeatherData.humidity}% humidity and wind speed of ${mockWeatherData.windSpeed} km/h.`,
    };
  },
});

const weatherAgent = new Agent({
  name: "WeatherAgent",
  instructions: "You are a friendly weather agent.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

const storyAgent = new Agent({
  name: "StoryAgent",
  instructions: "You are a friendly storyteller. Write short, vivid stories in Turkish.",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { weatherAgent, storyAgent },
  server: honoServer({
    configureApp: async (app) =>
      registerCopilotKitRoutes({ app, resourceIds: ["WeatherAgent", "StoryAgent"] }),
  }),
});
