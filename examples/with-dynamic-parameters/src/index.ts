import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
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
  instructions: ({ userContext }) => {
    const role = (userContext.get("role") as string) || "user";
    const language = (userContext.get("language") as string) || "English";

    if (role === "admin") {
      return `You are an admin assistant. Respond in ${language}. You have special privileges.`;
    }
    return `You are a helpful assistant. Respond in ${language}. You help with basic questions.`;
  },
  model: ({ userContext }) => {
    const tier = (userContext.get("tier") as string) || "free";
    if (tier === "premium") {
      return openai("gpt-4o-mini");
    }
    return openai("gpt-3.5-turbo");
  },
  tools: ({ userContext }) => {
    const role = (userContext.get("role") as string) || "user";
    if (role === "admin") {
      return [adminTool];
    }
    return [greetingTool];
  },
  llm: new VercelAIProvider(),
  memory: new LibSQLStorage({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

new VoltAgent({
  agents: {
    dynamicAgent,
  },
  logger,
});
