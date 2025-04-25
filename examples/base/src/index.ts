import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const mcpConfig = new MCPConfiguration({
  servers: {
    github: {
      type: "http",
      url: "https://mcp.composio.dev/github/mealy-few-wire-UfUhSQ?agent=cursor",
    },
  },
});

const agent = new Agent({
  name: "GitHub Starrer Agent",
  description: "You help users star GitHub repositories",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: await mcpConfig.getTools(),
});

const result = await agent.streamText("Please star the repository 'composiohq/composio'");

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
