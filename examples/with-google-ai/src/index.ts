import { VoltAgent, Agent, VoltAgentExporter } from "@voltagent/core";
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
  telemetryExporter: new VoltAgentExporter({
    publicKey: "pk_99684d8896d389bffd0fa6c864136f66",
    secretKey: "sk_live_f0bcb67326ec1093c8e1b0454b99db4e2167150f2e7e15464b4ea6b54ddf5743",
    baseUrl: "http://localhost:3003",
  }),
});
