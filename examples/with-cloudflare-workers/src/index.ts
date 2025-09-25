import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { edgeHono } from "@voltagent/edge-hono";

import { weatherTool } from "./tools";

const assistant = new Agent({
  name: "edge-assistant",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

const voltAgent = new VoltAgent({
  agents: { assistant },
  edge: edgeHono(),
});

export default voltAgent.edge().toCloudflareWorker();
