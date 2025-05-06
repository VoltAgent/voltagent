import { Agent, VoltAgent } from "@voltagent/core";
import { OllamaProvider } from "@voltagent/ollama";

const ollama = new OllamaProvider({
  baseUrl: "http://localhost:11434",
});

// Create an agent with the Ollama provider
const agent = new Agent({
  name: "LocalLLM",
  description: "A helpful assistant using a local Ollama model",
  llm: ollama,
  model: "gemma3:1b", // Using your installed model
});

new VoltAgent({
  agents: {
    agent,
  },
});
