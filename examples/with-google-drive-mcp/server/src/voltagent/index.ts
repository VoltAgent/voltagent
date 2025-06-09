import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

export const agent = new Agent({
  name: "Base Agent",
  description: "You are a helpful assistant that can search Google Drive.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  markdown: true,
});

new VoltAgent({
  agents: {
    agent,
  },
});
