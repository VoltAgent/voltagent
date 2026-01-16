import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { LibSQLMemoryAdapter } from "@voltagent/libsql";
// Import the retrieval tool
import { retriever } from "./retriever/index.js";

// Create logger
const logger = createPinoLogger({
  name: "with-retrieval",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});

// Create the agent with retrieval tool
const agent = new Agent({
  name: "Assistant with Retrieval",
  instructions:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  model: "openai/gpt-4o-mini",
  retriever: retriever,
  memory,
});

// Create the agent with retrieval tool
const agentWithTools = new Agent({
  name: "Assistant with Retrieval and Tools",
  instructions:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  model: "openai/gpt-4o-mini",
  tools: [retriever.tool],
  memory,
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
    agentWithTools,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
