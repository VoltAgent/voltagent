import { Agent, VoltAgent } from "@voltagent/core";
import { serverlessHono } from "@voltagent/serverless-hono";

import { weatherTool } from "./tools";

const assistant = new Agent({
  name: "serverless-assistant",
  instructions: "You are a helpful assistant.",
  model: "openai/gpt-4o-mini",
  tools: [weatherTool],
});

const voltAgent = new VoltAgent({
  agents: { assistant },
  serverless: serverlessHono(),
});

export default voltAgent.serverless().toCloudflareWorker();
