import { createTool } from "@voltagent/core";
import { z } from "zod";

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

export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("City or location to get weather for (e.g., San Francisco)"),
  }),
  outputSchema: weatherOutputSchema,
  execute: async ({ location }) => {
    // Mocked weather data for demo purposes; replace with a real API if desired.
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
