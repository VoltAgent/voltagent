import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * A tool for fetching weather information for a given location
 * This is a mock implementation - replace with real weather API
 */
export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
  }),
  execute: async ({ location }) => {
    // TODO: Replace this mock with a real weather API call
    // For example: OpenWeatherMap, WeatherAPI, or AccuWeather
    
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