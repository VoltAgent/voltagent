import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "Base Agent",
  description: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: {
    agent,
  },
});

agent.streamText("Hello", {
  provider: {
    experimental_activeTools: true,
  },
});
