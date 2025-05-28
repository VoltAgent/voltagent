import { VoltAgent, Agent } from "@voltagent/core";
import { GoogleGenAIProvider } from "@voltagent/google-ai";

const agent = new Agent({
  name: "Google Assistant",
  description: "A helpful assistant powered by Google Gemini",
  llm: new GoogleGenAIProvider({
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  model: "gemini-2.0-flash",
});

new VoltAgent({
  agents: {
    agent,
  },
});
