import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient, createWorkflowChain } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

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
new VoltAgent({
  agents: {
    supportAgent,
  },
  voltOpsClient: voltOpsClient,
});

const workflow = createWorkflowChain({
  id: "support-workflow",
  name: "Support Workflow",
  purpose: "Support workflow",
  result: z.object({
    supportLevel: z.enum(["premium", "standard", "free"]),
  }),
})
  .andAgent({
    task: "Do something",
    agent: supportAgent,
    config: {
      schema: z.object({
        supportLevel: z.enum(["premium", "standard"]),
      }),
    },
  })
  .andThen({
    execute: async (data) => {
      if (data.supportLevel === "premium") {
        return {
          supportLevel: "premium",
        };
      }
      // force the result to be standard
      return {
        supportLevel: "standard",
      };
    },
  });

const result = await workflow.run("Do something");

console.log(result);
