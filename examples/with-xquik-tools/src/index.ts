import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { xquikTools } from "./tools";

const logger = createPinoLogger({
  name: "xquik-tools-agent",
  level: "info",
});

const xquikResearchAgent = new Agent({
  name: "xquik-research-agent",
  instructions: `You help developers research public X/Twitter activity with Xquik tools.

Use the tools for post search, post lookup, user lookup, user posts, and trends.
Prefer concise answers with source IDs, usernames, timestamps, and relevant metrics.
If a tool reports a missing API key or HTTP error, explain the setup or retry path clearly.`,
  model: "openai/gpt-4o-mini",
  tools: xquikTools,
});

new VoltAgent({
  agents: {
    xquikResearchAgent,
  },
  logger,
  server: honoServer(),
});
