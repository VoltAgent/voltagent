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

const userContext = new Map<string | symbol, unknown>();
userContext.set("name", "John Doe");

const response = await agent.generateText("Hello, how are you?", {
  userContext,
});

console.log(response);
