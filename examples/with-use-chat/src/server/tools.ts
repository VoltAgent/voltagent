import { createTool } from "@voltagent/core";
import { z } from "zod";

// Client-side only tool: define parameters, no execute function.
export const getLocationTool = createTool({
  name: "getLocation",
  description: "Get the user's current location",
  parameters: z.object({}),
  // No execute = client-side
});

// Simple mock weather tool reused across examples
export const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city or location to get weather for"),
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
