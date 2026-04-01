import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import {
  createResumableStreamAdapter,
  createResumableStreamVoltOpsStore,
} from "@voltagent/resumable-streams";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "voltops-resumable-streams-example",
  level: "info",
});

async function start() {
  const streamStore = await createResumableStreamVoltOpsStore();
  const resumableStreamAdapter = await createResumableStreamAdapter({ streamStore });

  const agent = new Agent({
    id: "assistant",
    name: "Resumable Stream Agent",
    instructions: "You are a helpful assistant.",
    model: "openai/gpt-4o-mini",
  });

  new VoltAgent({
    agents: { assistant: agent },
    logger,
    server: honoServer({
      resumableStream: { adapter: resumableStreamAdapter },
    }),
  });
}

start().catch((error) => {
  logger.error("Failed to start server", { error });
  process.exit(1);
});
