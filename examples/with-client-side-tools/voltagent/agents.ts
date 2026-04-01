import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

// Tools definitions - those without execute are automatically client-side
const tools = {
  // Client-side automatic tool (no execute function)
  getLocation: createTool({
    name: "getLocation",
    description: "Get the user's current location",
    parameters: z.object({}),
  }),

  // Client-side interactive tool
  readClipboard: createTool({
    name: "readClipboard",
    description: "Read the content from the user's clipboard (requires permission)",
    parameters: z.object({}),
  }),

  // Server-side tool (has execute function)
  getWeather: createTool({
    name: "getWeather",
    description: "Get current weather for a city",
    parameters: z.object({
      city: z.string().describe("City name"),
    }),
    execute: async ({ city }) => {
      // Simulate weather API
      const temperature = Math.floor(Math.random() * 30) + 10;
      return {
        temperature: `${temperature}°C`,
        condition: "sunny",
        city,
      };
    },
  }),
};

export const agent = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions: "You are a helpful assistant that demonstrates client-side tools in VoltAgent.",
  model: "openai/gpt-4o-mini",
  tools: Object.values(tools),
});
