import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltAgentExporter, VoltOpsClient } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Create VoltOps client for prompt management
const voltOpsClient = new VoltOpsClient({
  baseUrl: process.env.VOLTOPS_BASE_URL || "",
  publicKey: process.env.VOLTOPS_PUBLIC_KEY || "",
  secretKey: process.env.VOLTOPS_SECRET_KEY || "",
  telemetry: true,
  prompts: true,
  promptCache: {
    enabled: true,
  },
});

const longNamePromptAgent = new Agent({
  name: "LongNamePromptAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
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
  model: openai("gpt-4o-mini"),
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
      promptCache: {
        enabled: true,
        ttl: 600,
      },
    });

    return prompt;
  },
  subAgents: [longNamePromptAgent],
});

// Create agent with dynamic prompts and custom cache settings
const weatherAgent = new Agent({
  name: "WeatherAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "weather-prompt",
      label: "staging",
      promptCache: {
        enabled: false,
        ttl: 60,
      },
    });
  },
});

const assistantAgent = new Agent({
  name: "AssistantAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful assistant.",
});

const dynamicInstructionsAgent = new Agent({
  name: "DynamicInstructionsAgent2",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: () => "You are a helpful assistant.",
});

// Initialize VoltAgent with VoltOps client
new VoltAgent({
  agents: {
    customerSupportAgent,
    weatherAgent,
    assistantAgent,
    dynamicInstructionsAgent,
  },
  voltOpsClient: voltOpsClient,
});
