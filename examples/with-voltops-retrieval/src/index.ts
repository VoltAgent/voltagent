import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { retriever } from "./retriever/index.js";

const logger = createPinoLogger({
  name: "with-voltops-retrieval",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});

const agent = new Agent({
  name: "Assistant with VoltOps Retrieval",
  instructions:
    "A helpful assistant that can search a VoltOps Knowledge Base and use relevant context to answer.",
  model: openai("gpt-4o-mini"),
  retriever,
  memory,
});

const agentWithTools = new Agent({
  name: "Assistant with VoltOps Retrieval Tool",
  instructions:
    "A helpful assistant that can search a VoltOps Knowledge Base via the provided tool when needed.",
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
  memory,
});

new VoltAgent({
  agents: {
    agent,
    agentWithTools,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
