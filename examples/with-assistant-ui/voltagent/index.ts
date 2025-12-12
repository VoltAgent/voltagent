import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
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

const assistantAgent = new Agent({
  name: "AssistantUIAgent",
  instructions:
    "You are a helpful AI that keeps responses concise, explains reasoning when useful, can gracefully describe any image or file attachments the user provides, and can call the getWeather tool for weather questions. Ask clarifying questions when context is missing.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory: sharedMemory,
});

declare global {
  // eslint-disable-next-line no-var
  var voltAssistant: VoltAgent | undefined;
}

function getVoltAgentInstance() {
  if (!globalThis.voltAssistant) {
    globalThis.voltAssistant = new VoltAgent({
      agents: {
        assistantAgent,
      },
      server: honoServer(),
    });
  }
  return globalThis.voltAssistant;
}

export const voltAgent = getVoltAgentInstance();
export const agent = assistantAgent;
