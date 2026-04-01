import { Agent, Memory, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const greetingTool = createTool({
  name: "get_greeting",
  description: "Get a personalized greeting",
  parameters: z.object({
    name: z.string().describe("Person's name"),
  }),
  execute: async ({ name }: { name: string }) => {
    return `Hello ${name}! Nice to meet you!`;
  },
});

// Admin-only tool
const adminTool = createTool({
  name: "admin_action",
  description: "Perform admin actions (admin only)",
  parameters: z.object({
    action: z.string().describe("Action to perform"),
  }),
  execute: async ({ action }: { action: string }) => {
    return `Admin action performed: ${action}`;
  },
});

// Create logger
const logger = createPinoLogger({
  name: "with-dynamic-parameters",
  level: "info",
});

const dynamicAgent = new Agent({
  name: "Simple Dynamic Agent",
  instructions: ({ context }) => {
    const role = (context.get("role") as string) || "user";
    const language = (context.get("language") as string) || "English";

    if (role === "admin") {
      return `You are an admin assistant. Respond in ${language}. You have special privileges.`;
    }
    return `You are a helpful assistant. Respond in ${language}. You help with basic questions.`;
  },
  model: ({ context }) => {
    const tier = (context.get("tier") as string) || "free";
    if (tier === "premium") {
      return "openai/gpt-4o-mini";
    }
    return "openai/gpt-3.5-turbo";
  },
  tools: ({ context }) => {
    const role = (context.get("role") as string) || "user";
    if (role === "admin") {
      return [adminTool];
    }
    return [greetingTool];
  },
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

new VoltAgent({
  agents: {
    dynamicAgent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
