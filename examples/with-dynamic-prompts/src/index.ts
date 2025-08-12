import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const logger = createPinoLogger({
  name: "with-dynamic-prompts",
  level: "info",
});

// Create LibSQL storage for persistent memory
const storage = new LibSQLStorage({
  logger: logger.child({ component: "libsql" }),
});

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
  memory: storage,
});

new VoltAgent({
  agents: {
    supportAgent,
  },
  logger,
  voltOpsClient: voltOpsClient,
});
