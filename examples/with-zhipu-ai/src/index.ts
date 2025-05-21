import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { ZhipuProvider } from "@voltagent/zhipu-ai";
import { z } from "zod";


const zhipuProvider = new ZhipuProvider({
  apiKey: process.env.ZHIPU_API_KEY ?? (() => {
    throw new Error("ZHIPU_API_KEY environment variable is not set.");
  })(),
});

// Weather tool
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe('location'),
    time: z.string().optional().describe('time')
  }),
  execute: async (args) => {
    const { location, time } = args;
    return {
      time,
      location,
      temperature: 22,
      conditions: "sunny",
    };
  },
});

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: zhipuProvider,
  model: {
    id: "glm-4-air",
    provider: "zhipu",
    modelId: "glm-4-air",
  } as any,
  tools: [weatherTool],
});

new VoltAgent({
  agents: {
    agent,
  },
});
