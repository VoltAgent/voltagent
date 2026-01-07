import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import {
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "resumable-streams-example",
  level: "info",
});

async function start() {
  const streamStore = await createResumableStreamRedisStore();
  const resumableStreamAdapter = await createResumableStreamAdapter({ streamStore });

  const agent = new Agent({
    id: "assistant",
    name: "Resumable Stream Agent",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  const port = Number(process.env.PORT ?? 3141);

  new VoltAgent({
    agents: { assistant: agent },
    logger,
    server: honoServer({
      port,
      resumableStream: { adapter: resumableStreamAdapter },
    }),
  });

  logger.info(`Server running at http://localhost:${port}`);
}

start().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
