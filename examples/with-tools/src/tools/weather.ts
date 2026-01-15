import { createTool } from "@voltagent/core";
import { z } from "zod";

// Define the output schema for weather data (supports preliminary updates)
const weatherOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("loading"),
    text: z.string(),
    weather: z.undefined().optional(),
  }),
  z.object({
    status: z.literal("success"),
    text: z.string(),
    weather: z.object({
      location: z.string(),
      temperature: z.number(),
      condition: z.string(),
      humidity: z.number(),
      windSpeed: z.number(),
    }),
  }),
]);

/**
 * A tool for fetching weather information for a given location
 * Now with output schema validation to ensure consistent response format
 */
export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
  }),
  outputSchema: weatherOutputSchema,
  /* needsApproval: true, */

  async *execute({ location }) {
    yield {
      status: "loading" as const,
      text: `Getting weather for ${location}`,
      weather: undefined,
    };

    // In a real implementation, this would call a weather API
    // This is a mock implementation for demonstration purposes
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const mockWeatherData = {
      location,
      temperature: Math.floor(Math.random() * 30) + 5, // Random temp between 5-35°C
      condition: ["Sunny", "Cloudy", "Rainy", "Snowy", "Partly Cloudy"][
        Math.floor(Math.random() * 5)
      ],
      humidity: Math.floor(Math.random() * 60) + 30, // Random humidity between 30-90%
      windSpeed: Math.floor(Math.random() * 30), // Random wind speed between 0-30 km/h
    };

    yield {
      status: "success" as const,
      text: `Current weather in ${location}: ${mockWeatherData.temperature}°C and ${mockWeatherData.condition.toLowerCase()} with ${mockWeatherData.humidity}% humidity and wind speed of ${mockWeatherData.windSpeed} km/h.`,
      weather: mockWeatherData,
    };
  },
});
