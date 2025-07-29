import { VoltAgent, Agent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Import the retrieval tool
import { retriever } from "./retriever/index.js";

// Create the agent with retrieval tool
const agent = new Agent({
  name: "Assistant with Retrieval",
  description:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  retriever: retriever,
});

// Create the agent with retrieval tool
const agentWithTools = new Agent({
  name: "Assistant with Retrieval and Tools",
  description:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
});

// Initialize the VoltAgent

// Create logger
const logger = createPinoLogger({
  name: "with-retrieval",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
    agentWithTools,
  },
  logger,
});
