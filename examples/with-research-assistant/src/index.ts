import { Agent, MCPConfiguration, VoltAgent, createWorkflowChain } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

(async () => {
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
    instructions:
      "The user will ask you to help generate some search queries. Respond with only the suggested queries in plain text with no extra formatting, each on its own line. Use exa tools.",
    model: "openai/gpt-4o-mini",
    tools: await mcpConfig.getTools(),
  });

  const writerAgent = new Agent({
    id: "writer",
    name: "Writer",
    instructions: "Write a report according to the user's instructions.",
    model: "openai/gpt-4o",
    tools: await mcpConfig.getTools(),
    markdown: true,
    maxSteps: 50,
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

        const result = await assistantAgent.generateText(
          `
          I'm writing a research report on ${topic} and need help coming up with diverse search queries.
Please generate a list of 3 search queries that would be useful for writing a research report on ${topic}. These queries can be in various formats, from simple keywords to more complex phrases. Do not add any formatting or numbering to the queries. `,
          { provider: { temperature: 1 } },
        );

        return { text: result.text };
      },
    })
    .andThen({
      id: "writing",
      execute: async ({ data, getStepData }) => {
        const { text } = data;
        const stepData = getStepData("research");
        const result = await writerAgent.generateText(
          `
        Input Data: ${text}
        Write a two paragraph research report about ${stepData?.input} based on the provided information. Include as many sources as possible. Provide citations in the text using footnote notation ([#]). First provide the report, followed by a single "References" section that lists all the URLs used, in the format [#] <url>.
      `,
        );

        return { text: result.text };
      },
    });

  // Create logger
  const logger = createPinoLogger({
    name: "with-mcp",
    level: "info",
  });

  // Register with VoltOps
  new VoltAgent({
    agents: {
      assistant: assistantAgent,
      writer: writerAgent,
    },
    workflows: {
      assistant: workflow,
    },
    server: honoServer(),
    logger,
  });
})();
