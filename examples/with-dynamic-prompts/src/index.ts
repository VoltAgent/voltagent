import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltAgentExporter, VoltOpsClient } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create VoltOps client for prompt management
const voltOpsClient = new VoltOpsClient({
  baseUrl: process.env.VOLTOPS_BASE_URL || "http://localhost:3003",
  publicKey: process.env.VOLTOPS_PUBLIC_KEY || "pk_3078221058f9ba8ce79d28095038a01a",
  secretKey:
    process.env.VOLTOPS_SECRET_KEY ||
    "sk_live_aab8c9b476201f1d52a55a6e379e0107ba84fe8b4bbc7c50028b880b0a6549d2",
  telemetry: true,
  prompts: true,
});

const longNamePromptAgent = new Agent({
  name: "LongNamePromptAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini") as any,
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "bu uzun isimli bir prompt",
    });
  },
});

// Create agent with dynamic prompts
const customerSupportAgent = new Agent({
  name: "CustomerSupport",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini") as any,
  instructions: async ({ prompts, userContext }) => {
    const prompt = await prompts.getPrompt({
      promptName: "bu uzun isimli bir prompt",
      label: "staging",
      variables: {
        companyName: "VoltAgent Corp",
        supportLevel: userContext.get("tier") || "standard",
        language: userContext.get("language") || "en",
        hede: "hede değeri",
      },
    });

    return prompt;
  },
  subAgents: [longNamePromptAgent],
});

// Create agent with dynamic prompts
const weatherAgent = new Agent({
  name: "WeatherAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini") as any,
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "chat-test",
    });
  },
});

const assistantAgent = new Agent({
  name: "AssistantAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini") as any,
  instructions: "You are a helpful assistant.",
});

// Initialize VoltAgent with VoltOps client
new VoltAgent({
  agents: {
    customerSupportAgent,
    weatherAgent,
    assistantAgent,
  },
  voltOpsClient: voltOpsClient,
});
