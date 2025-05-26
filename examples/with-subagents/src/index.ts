import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { VoltAgentSDK } from "@voltagent/sdk";

const uppercaseTool = createTool({
  name: "uppercase",
  description: "Converts text to uppercase",
  parameters: z.object({
    text: z.string().describe("The text to convert to uppercase"),
  }),
  execute: async ({ text }: { text: string }) => {
    return { result: text.toUpperCase() };
  },
});

/* // Create two simple specialized subagents
const contentCreatorAgent = new Agent({
  name: "ContentCreator",
  description: "Creates short text content on requested topics",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
 */
const formatterAgent = new Agent({
  name: "Formatter",
  description: "write story and uppercases the text",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [uppercaseTool],
});

// Create a simple supervisor agent
const supervisorAgent = new Agent({
  name: "Supervisor",
  description: `
  1. create content
  2. Then Formatter agent will format the content.
  `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [/* contentCreatorAgent, */ formatterAgent],
  tools: [],
});

// Initialize the VoltAgent with the agent hierarchy
new VoltAgent({
  agents: {
    main: supervisorAgent,
  },
});

(async () => {
  const sdk = new VoltAgentSDK({
    publicKey: "pk_3078221058f9ba8ce79d28095038a01a",
    secretKey: "sk_live_aab8c9b476201f1d52a55a6e379e0107ba84fe8b4bbc7c50028b880b0a6549d2",
    baseUrl: "http://localhost:3003",
    autoFlush: true, // Automatically sends queued events
    flushInterval: 5000, // Flush every 5 seconds
  });

  const history = await sdk.createHistory({
    agent_id: "my-agent",
    input: { input: "Hello, how are you?" },
    metadata: { source: "web-app" },
    userId: "123",
    conversationId: "456",
    status: "running",
    startTime: new Date().toISOString(),
    version: "1.0.0",
  });

  history.addEvent({
    name: "agent:start",
    type: "agent",
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {
      displayName: "My Agent",
      id: "my-agent",
      instructions: "instructions",
    },
    input: {
      input: "Hello, how are you?",
    },
  });
  history.addEvent({
    name: "tool:start",
    type: "tool",
    startTime: new Date().toISOString(),
    status: "running",
    input: { test: "test input" },
    metadata: {
      displayName: "uppercase",
      id: "uppercase_id",
      agentId: "my-agent",
    },
  });
  history.addEvent({
    name: "tool:success",
    type: "tool",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    output: { test: "test output" },
    status: "completed",
    metadata: {
      displayName: "uppercase",
      id: "uppercase_id",
      agentId: "my-agent",
      description: "my uppercase tool",
    },
  });

  history.addEvent({
    name: "tool:start",
    type: "tool",
    startTime: new Date().toISOString(),
    status: "running",
    input: { test: "test sql" },
    metadata: {
      displayName: "db-call",
      id: "db-call_id",
      agentId: "my-agent",
    },
  });

  history.addEvent({
    name: "tool:start",
    type: "tool",
    startTime: new Date().toISOString(),
    status: "running",
    input: { test: "rag sql 3" },
    metadata: {
      displayName: "rag-call-3",
      id: "rag-call-3_id",
      agentId: "my-agent",
    },
  });

  history.addEvent({
    name: "retriever:start",
    type: "retriever",
    startTime: new Date().toISOString(),
    input: { test: "test input" },
    status: "running",
    metadata: {
      displayName: "my-retriever",
      id: "retriever_id",
      agentId: "my-agent",
      description: "my retriever",
    },
  });
  history.addEvent({
    name: "retriever:success",
    type: "retriever",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    output: { test: "test output" },
    status: "completed",
    metadata: {
      displayName: "my-retriever",
      id: "retriever_id",
      agentId: "my-agent",
    },
  });
  history.addEvent({
    name: "memory:read_start",
    type: "memory",
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {
      displayName: "my-memory",
      id: "memory_id",
      agentId: "my-agent",
    },
  });
  history.addEvent({
    name: "agent:start",
    type: "agent",
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {
      displayName: "SubAgent",
      id: "subagent_id",
      agentId: "my-agent",
      instructions: "instructions",
    },
    input: {
      input: "Hello, how are you? I am a subagent",
    },
  });

  history.addEvent({
    name: "tool:start",
    type: "tool",
    startTime: new Date().toISOString(),
    status: "running",
    input: { test: "test input subagent" },
    metadata: {
      displayName: "uppercase-subagent",
      id: "uppercase_subagent_id",
      agentId: "subagent_id",
    },
  });

  history.addEvent({
    name: "agent:start",
    type: "agent",
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {
      displayName: "SubAgent 2",
      id: "subagent_2_id",
      agentId: "my-agent",
      instructions: "instructions",
    },
    input: {
      input: "Hello, how are you? I am a subagent",
    },
  });

  history.addEvent({
    name: "agent:start",
    type: "agent",
    startTime: new Date().toISOString(),
    status: "running",
    metadata: {
      displayName: "SubAgent 3",
      id: "subagent_3_id",
      agentId: "my-agent",
      instructions: "instructions",
    },
    input: {
      input: "Hello, how are you? I am a subagent",
    },
  });

  history.addEvent({
    name: "tool:start",
    type: "tool",
    startTime: new Date().toISOString(),
    status: "running",
    input: { test: "rag sql 2" },
    metadata: {
      displayName: "rag-call-2",
      id: "rag-call-2_id",
      agentId: "my-agent",
    },
  });

  history.addEvent({
    name: "tool:start",
    type: "tool",
    startTime: new Date().toISOString(),
    status: "running",
    input: { test: "rag sql" },
    metadata: {
      displayName: "rag-call",
      id: "rag-call_id",
      agentId: "my-agent",
    },
  });

  history.addEvent({
    name: "agent:success",
    type: "agent",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    status: "completed",
    metadata: {
      displayName: "My Agent",
      id: "my-agent",
      instructions: "instructions",
      usage: {
        promptTokens: 100,
        completionTokens: 100,
        totalTokens: 200,
      },
    },
    output: {
      text: "Hello, how are you?",
    },
  });

  history.end({
    output: { output: "fine" },
  });
})();
