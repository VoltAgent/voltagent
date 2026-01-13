import { openai } from "@ai-sdk/openai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";
import { sharedMemory } from "./memory";

const weatherOutputSchema = z.object({
  weather: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
    windSpeed: z.number(),
  }),
  message: z.string(),
});

const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
  }),
  outputSchema: weatherOutputSchema,
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

export const assistantAgent = new Agent({
  name: "AssistantUIAgent",
  instructions:
    "You are a helpful AI that keeps responses concise, explains reasoning when useful, can gracefully describe any image or file attachments the user provides, and can call the getWeather tool for weather questions. Ask clarifying questions when context is missing.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory: sharedMemory,
});

export const agent = assistantAgent;
