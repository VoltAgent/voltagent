import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required");
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const logger = createPinoLogger({
  name: "with-openrouter",
  level: "info",
});

const agent = new Agent({
  name: "OpenRouter Assistant",
  instructions: "You are a helpful assistant powered by OpenRouter.",
  model: openrouter("openai/gpt-4o-mini", {
    usage: {
      include: true,
    },
  }),
  memory: new Memory({
    storage: new LibSQLMemoryAdapter(),
  }),
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer(),
});

(async () => {
  const result = await agent.generateText("Explain how observability helps with AI cost control.");

  logger.info("OpenRouter example request completed", {
    text: result.text,
    usage: result.usage,
  });
})();
