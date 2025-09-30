import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-dynamic-prompts",
  level: "info",
});

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const supportAgent = new Agent({
  name: "SupportAgent",
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
  memory: new Memory({
    storage: new LibSQLMemoryAdapter(),
  }),
});

new VoltAgent({
  agents: {
    supportAgent,
  },
  logger,
  server: honoServer({ port: 3141 }),
  voltOpsClient: voltOpsClient,
});
