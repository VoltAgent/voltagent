import { openai } from "@ai-sdk/openai";
import {
  Agent,
  AiSdkEmbeddingAdapter,
  InMemoryVectorAdapter,
  Memory,
  VoltAgent,
  VoltAgentObservability,
  createTool,
} from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create logger
const logger = createPinoLogger({
  name: "with-subagents",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: new AiSdkEmbeddingAdapter(openai.embeddingModel("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
});

const uppercaseTool = createTool({
  name: "uppercase",
  description: "Converts text to uppercase",
  parameters: z.object({
    text: z.string().describe("The text to convert to uppercase"),
  }),
  execute: async ({ text }: { text: string }, _oc) => {
    return { result: text.toUpperCase() };
  },
});

// Create two simple specialized subagents
const contentCreatorAgent = new Agent({
  name: "ContentCreator",
  purpose: "Drafts short content",
  instructions: "Creates short text content on requested topics",
  model: "openai/gpt-4o-mini",
  memory,
});

const formatterAgent = new Agent({
  name: "Formatter",
  purpose: "Cleans and formats text",
  instructions: "Formats and styles text content",
  model: "openai/gpt-4o-mini",
  tools: [uppercaseTool],
  memory,
});

// Create a simple supervisor agent
const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: "Coordinates between content creation and formatting agents",
  model: "openai/gpt-4o-mini",
  memory,
  subAgents: [contentCreatorAgent, formatterAgent],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["tool-call", "tool-result", "text-delta"],
    },
  },
});

// Create VoltAgent with the new server provider pattern
new VoltAgent({
  agents: {
    supervisorAgent,
    formatterAgent,
    contentCreatorAgent,
  },
  logger,
  // Use the new honoServer factory with configuration
  server: honoServer(),
  observability: new VoltAgentObservability({
    storage: new LibSQLObservabilityAdapter(),
  }),
});
