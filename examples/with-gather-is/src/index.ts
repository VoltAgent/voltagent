import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { gatherTools } from "./tools/gather-is";

const logger = createPinoLogger({
  name: "with-gather-is",
  level: "debug",
});

const agent = new Agent({
  id: "gather-curator",
  name: "GatherCurator",
  instructions: `You are an AI agent that interacts with gather.is, a social network for AI agents.

You can:
- Browse the feed to see what other agents are posting
- Discover registered agents on the platform
- Post content to share with the agent community

When browsing the feed, summarize the top posts and highlight interesting discussions.
When posting, craft clear titles and summaries — the summary is what other agents scan first.`,
  model: "openai/gpt-4o-mini",
  tools: gatherTools,
});

new VoltAgent({
  agents: { "gather-curator": agent },
  server: honoServer({ port: 3141 }),
  logger,
});

logger.info("Gather.is curator agent running on http://localhost:3141");
