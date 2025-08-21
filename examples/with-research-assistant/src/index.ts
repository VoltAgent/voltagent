import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent, createWorkflowChain } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

const mcpConfig = new MCPConfiguration({
  servers: {
    exa: {
      type: "stdio",
      command: "npx",
      args: ["-y", "mcp-remote", `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`],
    },
  },
});

const assistantAgent = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions: "You are a helpful assistant.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: await mcpConfig.getTools(),
});

const writerAgent = new Agent({
  id: "writer",
  name: "Writer",
  instructions: "Write a report according to the user's instructions.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: await mcpConfig.getTools(),
});

// Define the workflow's shape: its inputs and final output
const workflow = createWorkflowChain({
  id: "research-assistant",
  name: "Research Assistant Workflow",
  // A detailed description for VoltOps or team clarity
  purpose: "A simple workflow to assist with research on a given topic.",
  input: z.object({ topic: z.string() }),
  result: z.object({ text: z.string() }),
})

  .andThen({
    id: "research",
    execute: async ({ data }) => {
      const { topic } = data;

      const result =
        await assistantAgent.generateText(`I need to conduct comprehensive research about ${topic} and require assistance with formulating effective search terms.
Could you provide 3 distinct search queries that would help gather relevant information for an in-depth analysis of ${topic}? Feel free to vary the query styles, ranging from basic terms to detailed search phrases. Please provide the queries as plain text without any bullets or numbers.`);

      return { text: result.text };
    },
  })
  .andThen({
    id: "writing",
    execute: async ({ data, getStepData }) => {
      const { text } = data;
      const stepData = getStepData("research");
      const result = await writerAgent.generateText(
        `Research Materials: ${text} Please compose a comprehensive analysis consisting of two paragraphs that explores ${stepData?.input.topic} using the supplied research findings.`,
      );

      return { text: result.text };
    },
  });

// Create logger
const logger = createPinoLogger({
  name: "with-mcp",
  level: "info",
});

//voltops a register eden kısmı
new VoltAgent({
  agents: {
    assistant: assistantAgent,
    writer: writerAgent,
  },
  workflows: {
    assistant: workflow,
  },
  logger,
});
