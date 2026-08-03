import { Agent, VoltAgent, tool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const weatherTool = tool({
  description: "Get the current weather for a city",
  inputSchema: z.object({
    location: z.string().describe("City name, e.g. Berlin"),
  }),
  voltagent: {
    tags: ["weather", "forecast"],
  },
  execute: async ({ location }) => {
    return {
      location,
      temperatureC: 22,
      condition: "sunny",
      humidityPercent: 45,
    };
  },
});

const convertCurrencyTool = tool({
  description: "Convert money between currencies using a sample rate table",
  inputSchema: z.object({
    amount: z.number().describe("Amount to convert"),
    from: z.string().describe("Source currency code, e.g. USD"),
    to: z.string().describe("Target currency code, e.g. EUR"),
  }),
  voltagent: {
    tags: ["finance", "currency"],
  },
  execute: async ({ amount, from, to }) => {
    const rates: Record<string, number> = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      TRY: 32.5,
    };
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();
    const fromRate = rates[fromCode] ?? 1;
    const toRate = rates[toCode] ?? 1;
    const rate = toRate / fromRate;

    return {
      amount,
      from: fromCode,
      to: toCode,
      rate,
      converted: Math.round(amount * rate * 100) / 100,
    };
  },
});

const timeZoneTool = tool({
  description: "Get the time zone offset for a city",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  voltagent: {
    tags: ["time", "timezone"],
  },
  execute: async ({ location }) => {
    return {
      location,
      timeZone: "UTC+1",
    };
  },
});

const logger = createPinoLogger({
  name: "with-tool-routing",
  level: "info",
});

const agent = new Agent({
  name: "Tool Routing Agent",
  instructions:
    "You are a helpful assistant. When you need a tool, call searchTools with the user request, then call callTool with the exact tool name and schema-compliant arguments.",
  model: "openai/gpt-4o-mini",
  tools: {
    get_weather: weatherTool,
    convert_currency: convertCurrencyTool,
    get_time_zone: timeZoneTool,
  },
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    topK: 2,
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
