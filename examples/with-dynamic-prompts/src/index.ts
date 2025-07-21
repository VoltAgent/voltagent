import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTOPS_PUBLIC_KEY,
  secretKey: process.env.VOLTOPS_SECRET_KEY,
});

const supportAgent = new Agent({
  name: "SupportAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      variables: {
        companyName: "VoltAgent",
        tone: "friendly and professional",
        supportLevel: "premium",
      },
    });
  },
});

// Initialize VoltAgent with VoltOps client

// Create logger
const logger = createPinoLogger({
  name: "with-dynamic-prompts",
  level: process.env.VOLTAGENT_LOG_LEVEL || "info",
});

new VoltAgent({
  agents: {
    supportAgent,
  },
  logger,
  voltOpsClient: voltOpsClient,
});

console.log(process.env.VOLTOPS_PUBLIC_KEY);
console.log(process.env.NODE_ENV);
