import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Agent, VoltAgent, Memory, InMemoryStorageAdapter } from "@voltagent/core";
import { serverlessHono } from "@voltagent/serverless-hono";
import { weatherTool } from "./tools";

// Configure Amazon Bedrock provider
// Using AWS SDK Credentials Chain for Lambda (recommended)
// Lambda automatically provides IAM role credentials
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

// Memory configuration for Lambda
const memory = new Memory({
  storage: new InMemoryStorageAdapter({
    storageLimit: 50,
  }),
});

const agent = new Agent({
  name: "lambda-assistant",
  instructions: "Help the user quickly and call tools when needed. You are powered by Amazon Bedrock.",
  model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0"),
  tools: [weatherTool],
  memory,
});

const voltAgent = new VoltAgent({
  agents: { agent },
  serverless: serverlessHono(),
});

export function getVoltAgent(): VoltAgent {
  return voltAgent;
}