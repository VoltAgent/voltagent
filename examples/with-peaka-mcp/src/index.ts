import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

import { openai } from "@ai-sdk/openai";

const mcp = new MCPConfiguration({
  servers: {
    peaka: {
      type: "stdio",
      command: "npx",
      args: ["-y", "@peaka/mcp-server-peaka@latest"],
      env: { PEAKA_API_KEY: process.env.PEAKA_API_KEY || "" },
    },
  },
});

(async () => {
  const tools = await mcp.getTools();
  const agent = new Agent({
    name: "Peaka Data Assistant",
    description: "An assistant that can query Peaka's sample data.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    tools: [...tools],
    markdown: true,
  });

  new VoltAgent({
    agents: {
      agent,
    },
  });
})();
