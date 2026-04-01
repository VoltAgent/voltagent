import { Agent, VoltAgent } from "@voltagent/core";
import { serverlessHono } from "@voltagent/serverless-hono";
import { weatherTool } from "./tools";

const agent = new Agent({
  name: "netlify-function-agent",
  instructions: "Help the user quickly and call tools when needed.",
  model: "openai/gpt-4o-mini",
  tools: [weatherTool],
});

const voltAgent = new VoltAgent({
  agents: { agent },
  serverless: serverlessHono(),
});

export function getVoltAgent(): VoltAgent {
  return voltAgent;
}
