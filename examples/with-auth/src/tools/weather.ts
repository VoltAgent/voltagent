import { createTool } from "@voltagent/core";
import { z } from "zod";

// Define the output schema for weather data
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
  execute: async ({ location }) => {
    // In a real implementation, this would call a weather API
    // This is a mock implementation for demonstration purposes

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
