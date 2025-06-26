import VoltAgent, { Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

async function main() {
  try {
    const mcpConfig = new MCPConfiguration({
      servers: {
        "hf-mcp-server": {
          url: "https://huggingface.co/mcp",
          requestInit: {
            headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}` },
          },
          type: "http",
        },
      },
    });

    const agent = new Agent({
      name: "Hugging Face MCP Agent",
      instructions: "You are a helpful assistant with access to Hugging Face MCP tools.",
      tools: await mcpConfig.getTools(),
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });

    new VoltAgent({
      agents: {
        agent,
      },
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
}

main();
