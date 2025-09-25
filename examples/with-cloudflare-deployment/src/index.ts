import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent, createTool } from "@voltagent/core";
import { edgeHono } from "@voltagent/edge-hono";
import { weatherTool } from "./tools";

// Environment types for Cloudflare Workers
export interface Env {
  OPENAI_API_KEY: string;
  VOLTAGENT_PUBLIC_KEY?: string;
  VOLTAGENT_SECRET_KEY?: string;
  VOLTOPS_BASE_URL?: string;
  ENVIRONMENT?: string;
}

// Create the agent
const agent = new Agent({
  name: "Cloudflare Agent",
  instructions: `You are a helpful AI assistant deployed on Cloudflare Workers.
    You can help with various tasks and have access to weather information.
    You're running on the edge, providing fast responses from locations worldwide.`,
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

let cachedVoltAgent: VoltAgent | undefined;

function getVoltAgent(): VoltAgent {
  if (cachedVoltAgent) {
    return cachedVoltAgent;
  }

  cachedVoltAgent = new VoltAgent({
    agents: { agent },
    edge: edgeHono(),
  });

  return cachedVoltAgent;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const voltAgent = getVoltAgent();

    const cloudflareWorker = voltAgent.edge().toCloudflareWorker();
    const runtimeEnv = env as unknown as Record<string, unknown>;
    return cloudflareWorker.fetch(request, runtimeEnv, ctx);
  },
};
