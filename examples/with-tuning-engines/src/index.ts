import { createOpenAI } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

if (!process.env.TUNING_ENGINES_API_KEY) {
  throw new Error("TUNING_ENGINES_API_KEY is required");
}

const tuningEngines = createOpenAI({
  apiKey: process.env.TUNING_ENGINES_API_KEY,
  baseURL: "https://api.tuningengines.com/v1",
});

const logger = createPinoLogger({
  name: "with-tuning-engines",
  level: "info",
});

const agent = new Agent({
  name: "Tuning Engines Assistant",
  instructions:
    "You are a helpful assistant running through a governed OpenAI-compatible endpoint.",
  model: tuningEngines(process.env.TUNING_ENGINES_MODEL ?? "gpt-4o"),
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
  try {
    const result = await agent.generateText(
      "Explain how policy, traces, and usage reporting help production AI agents.",
    );

    logger.info("Tuning Engines example request completed", {
      text: result.text,
      usage: result.usage,
    });
  } catch (error) {
    logger.error("Tuning Engines example request failed", { error });
    process.exitCode = 1;
  }
})();
