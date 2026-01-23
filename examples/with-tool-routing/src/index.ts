import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({
    location: z.string().describe("City name, e.g. Berlin"),
  }),
  tags: ["weather", "forecast"],
  execute: async ({ location }) => {
    return {
      location,
      temperatureC: 22,
      condition: "sunny",
      humidityPercent: 45,
    };
  },
});

const convertCurrencyTool = createTool({
  name: "convert_currency",
  description: "Convert money between currencies using a sample rate table",
  parameters: z.object({
    amount: z.number().describe("Amount to convert"),
    from: z.string().describe("Source currency code, e.g. USD"),
    to: z.string().describe("Target currency code, e.g. EUR"),
  }),
  tags: ["finance", "currency"],
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

const timeZoneTool = createTool({
  name: "get_time_zone",
  description: "Get the time zone offset for a city",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  tags: ["time", "timezone"],
  execute: async ({ location }) => {
    return {
      location,
      timeZone: "UTC+1",
    };
  },
});

const weatherPool = [weatherTool, timeZoneTool];
const financePool = [convertCurrencyTool];
const toolPool = [...weatherPool, ...financePool];

const logger = createPinoLogger({
  name: "with-tool-routing",
  level: "info",
});

const agent = new Agent({
  name: "Tool Routing Agent",
  instructions:
    "You are a helpful assistant. Use tool_router when you need tools, and pass the user request as the query.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    pool: toolPool,
    topK: 2,
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
