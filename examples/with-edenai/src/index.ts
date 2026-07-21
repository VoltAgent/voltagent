import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

if (!process.env.EDENAI_API_KEY) {
  throw new Error("EDENAI_API_KEY is required");
}

const logger = createPinoLogger({
  name: "with-edenai",
  level: "info",
});

// Eden AI is registered as a built-in provider, so a plain "edenai/<vendor>/<model>"
// model string is resolved through the model registry (reads EDENAI_API_KEY and
// defaults to https://api.edenai.run/v3). Set EDENAI_BASE_URL=https://api.eu.edenai.run/v3
// for EU data residency. Eden AI model ids are vendor-prefixed, e.g.
// "openai/gpt-4o-mini", "anthropic/claude-haiku-4-5" or "mistral/mistral-small-latest".
const agent = new Agent({
  name: "Eden AI Assistant",
  instructions: "You are a helpful assistant powered by Eden AI.",
  model: "edenai/openai/gpt-4o-mini",
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

  logger.info("Eden AI example request completed", {
    text: result.text,
    usage: result.usage,
  });
})();
