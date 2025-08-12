import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create logger
const logger = createPinoLogger({
  name: "google-drive-mcp-server",
  level: "info",
});

// Create LibSQL storage for persistent memory
const memory = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

export const agent = new Agent({
  name: "Base Agent",
  description: "You are a helpful assistant that can search Google Drive.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  markdown: true,
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
});
