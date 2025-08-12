import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Import the retrieval tool
import { retriever } from "./retriever/index.js";

// Create logger
const logger = createPinoLogger({
  name: "with-retrieval",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

// Create the agent with retrieval tool
const agent = new Agent({
  name: "Assistant with Retrieval",
  description:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  retriever: retriever,
  memory: storage,
});

// Create the agent with retrieval tool
const agentWithTools = new Agent({
  name: "Assistant with Retrieval and Tools",
  description:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
  memory: storage,
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
    agentWithTools,
  },
  logger,
});
