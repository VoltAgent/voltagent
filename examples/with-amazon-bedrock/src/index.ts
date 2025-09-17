import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Agent, Memory, VoltAgent, createTool } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Example tool to demonstrate capabilities
const weatherTool = createTool({
  name: "get_current_weather",
  description: "Get the current weather in a location",
  parameters: z.object({
    location: z.string().describe("The location to get weather for"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature unit"),
  }),
  execute: async (input) => {
    // Mock weather data
    const temperature = Math.floor(Math.random() * 30) + 10;
    return {
      location: input.location,
      temperature,
      unit: input.unit || "celsius",
      condition: ["sunny", "cloudy", "rainy"][Math.floor(Math.random() * 3)],
    };
  },
});

// Configure Amazon Bedrock provider
// Using AWS SDK Credentials Chain (recommended)
// This automatically checks for credentials in the following order:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. AWS profiles (via AWS_PROFILE environment variable)
// 3. Instance profiles, ECS roles, EKS Service Accounts, etc.
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

// Alternative: Direct credentials (not recommended for production)
// const bedrock = createAmazonBedrock({
//   region: process.env.AWS_REGION || "us-east-1",
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   sessionToken: process.env.AWS_SESSION_TOKEN,
// });

// Create logger
const logger = createPinoLogger({
  name: "with-amazon-bedrock",
  level: "info",
});

// Configure the agent with Amazon Bedrock
// Available models on Bedrock:
// - Claude 3.5: "anthropic.claude-3-5-sonnet-20240620-v1:0", "anthropic.claude-3-5-haiku-20241022-v1:0"
// - Claude 3: "anthropic.claude-3-opus-20240229-v1:0", "anthropic.claude-3-sonnet-20240229-v1:0", "anthropic.claude-3-haiku-20240307-v1:0"
// - Llama 3.2: "meta.llama3-2-1b-instruct-v1:0", "meta.llama3-2-3b-instruct-v1:0"
// - Mistral: "mistral.mistral-large-2407-v1:0", "mistral.mistral-small-2402-v1:0"
// - Titan: "amazon.titan-text-premier-v1:0", "amazon.titan-text-express-v1"
const agent = new Agent({
  name: "bedrock-assistant",
  instructions: "An AI assistant powered by Amazon Bedrock",
  model: bedrock("anthropic.claude-opus-4-1-20250805-v1:0"),
  tools: [weatherTool],
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

// Initialize VoltAgent with server
new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
