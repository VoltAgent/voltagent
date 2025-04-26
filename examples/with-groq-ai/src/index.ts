import { VoltAgent, Agent } from "@voltagent/core";
import { GroqProvider } from "@voltagent/groq-ai";

const agent = new Agent({
  name: "finance",
  description: "A helpful assistant that answers questions without using tools",
  llm: new GroqProvider({
    apiKey: process.env.GROQ_API_KEY,
  }),
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
});

new VoltAgent({
  agents: {
    agent,
  },
});
