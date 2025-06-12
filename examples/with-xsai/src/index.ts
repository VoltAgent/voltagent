import { VoltAgent, Agent } from "@voltagent/core";
import { XSAIProvider } from "@voltagent/xsai";

const agent = new Agent({
  name: "Asistant",
  description: "A helpful assistant that answers questions without using tools",
  llm: new XSAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
  model: "gpt-4o-mini",
});

new VoltAgent({
  agents: {
    agent,
  },
});
