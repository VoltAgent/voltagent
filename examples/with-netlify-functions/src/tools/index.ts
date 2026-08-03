import { tool } from "@voltagent/core";
import z from "zod";

export const weatherTool = tool({
  description: "Return a mock weather report for the requested location",
  inputSchema: z.object({
    location: z.string().describe("City or location to look up"),
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
