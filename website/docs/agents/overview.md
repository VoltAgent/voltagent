---
title: Overview
slug: /agents/overview
---

# Agent Overview

An agent in VoltAgent wraps a language model with instructions, tools, memory, and other capabilities. You create an agent instance, then call its methods to generate responses or stream output.

There are two ways to use agents in VoltAgent:

1. **Direct method calls** - Call agent methods (`generateText`, `streamText`) from your application code
2. **REST API** - Use VoltAgent's HTTP server to expose agents as REST endpoints

This document covers both approaches, starting with the basics.

## Creating an Agent

An agent requires three properties: a name, instructions, and a model.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "Answer questions clearly and concisely.",
  model: openai("gpt-4o"),
});
```

The `instructions` property defines the agent's behavior. The `model` comes from [ai-sdk](https://sdk.vercel.ai) and can be any supported provider (OpenAI, Anthropic, Google, etc.).

## Using Agents: Direct Method Calls

Agents have two core methods for generating responses:

### Text Generation

Use these methods when you need text responses.

**generateText** - Returns the complete text response at once.

```ts
const result = await agent.generateText("What is TypeScript?");
console.log(result.text);
```

**streamText** - Streams text chunks as they're generated (for real-time UIs).

```ts
const stream = await agent.streamText("Explain async/await");

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Streaming Features

When using `streamText`, you can access detailed events and final values.

#### fullStream for Detailed Events

Use `fullStream` to receive detailed streaming events including tool calls, reasoning steps, and completion status.

```ts
const response = await agent.streamText("Write a story");

for await (const chunk of response.fullStream) {
  switch (chunk.type) {
    case "text-delta":
      process.stdout.write(chunk.textDelta);
      break;
    case "tool-call":
      console.log(`\nUsing tool: ${chunk.toolName}`);
      break;
    case "tool-result":
      console.log(`Tool completed: ${chunk.toolName}`);
      break;
    case "finish":
      console.log(`\nDone! Tokens: ${chunk.usage?.totalTokens}`);
      break;
  }
}
```

#### Promise-based Properties

Access final values as Promises that resolve when streaming completes.

```ts
const response = await agent.streamText("Explain async/await");

// Process stream
(async () => {
  for await (const chunk of response.textStream) {
    process.stdout.write(chunk);
  }
})();

// Access final values (resolve when stream completes)
const [fullText, usage, finishReason] = await Promise.all([
  response.text, // Promise<string>
  response.usage, // Promise<UsageInfo>
  response.finishReason, // Promise<string>
]);

console.log(`\nTotal: ${fullText.length} chars, ${usage?.totalTokens} tokens`);
```

### Structured Data Generation

Use `output` with `generateText`/`streamText` to get structured data while still using tools and all agent capabilities.
`generateObject` and `streamObject` are deprecated in VoltAgent 2.x.

```ts
import { Output } from "ai";
import { z } from "zod";

const recipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  prepTime: z.number(),
});

// With generateText - supports tool calling
const result = await agent.generateText("Create a pasta recipe", {
  output: Output.object({ schema: recipeSchema }),
});
console.log(result.output); // { name: "...", ingredients: [...], ... }

// With streamText - stream partial objects while using tools
const stream = await agent.streamText("Create a detailed recipe", {
  output: Output.object({ schema: recipeSchema }),
});

for await (const partial of stream.partialOutputStream ?? []) {
  console.log(partial); // Incrementally built object
}

// Constrained text generation
const haiku = await agent.generateText("Write a haiku about coding", {
  output: Output.text(),
});
console.log(haiku.output);
```

### Summarization

Summarization inserts a system summary and keeps the last N non-system messages before each model call. Configure it with the `summarization` option on the agent. See [Summarization](./summarization.md) for configuration and storage details.

### Input Types

All methods accept either a string or an array of messages:

```ts
// String input
await agent.generateText("Hello");

// Message array (for multimodal or conversation history)
await agent.generateText([{ role: "user", content: "What's in this image?" }]);
```

## Using Agents: REST API

VoltAgent can expose agents through HTTP endpoints. This lets you call agents from any client (web, mobile, etc.).

### Server Setup

Create a `VoltAgent` instance with a server provider:

```ts
import { VoltAgent, Agent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "assistant",
  instructions: "Answer questions clearly.",
  model: openai("gpt-4o"),
});

new VoltAgent({
  agents: { assistant: agent },
  server: honoServer(), // Starts on port 3141 by default
});
```

### Available Endpoints

The server exposes the following REST endpoints:

#### Text Generation

- `POST /agents/:id/text` - Generate complete text response (synchronous)
- `POST /agents/:id/stream` - Stream raw fullStream events (SSE)
- `POST /agents/:id/chat` - Stream UI messages for useChat hook (SSE)

If you need clients to reconnect after refresh and continue the same response, enable resumable streaming. See [Resumable Streaming](/docs/agents/resumable-streaming/).

#### Structured Data

- `POST /agents/:id/object` - Generate structured object (synchronous)
- `POST /agents/:id/stream-object` - Stream object generation (SSE)

**Endpoint comparison:**

| Endpoint         | Method | Response Type | Use Case                                                       |
| ---------------- | ------ | ------------- | -------------------------------------------------------------- |
| `/text`          | POST   | JSON          | Complete text response at once                                 |
| `/stream`        | POST   | SSE           | Raw stream events (text-delta, tool-call, tool-result, finish) |
| `/chat`          | POST   | SSE           | UI message stream for ai-sdk's useChat hook                    |
| `/object`        | POST   | JSON          | Complete structured object at once                             |
| `/stream-object` | POST   | SSE           | Streaming partial objects                                      |

### Structured Output via HTTP

You can use `output` with the text endpoints (`/text`, `/stream`, `/chat`) to get structured data while maintaining tool calling capabilities. Add the `output` field to the `options` object in your request:

```typescript
const response = await fetch("http://localhost:3141/agents/assistant/text", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "Create a recipe",
    options: {
      output: {
        type: "object",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            ingredients: { type: "array", items: { type: "string" } },
          },
          required: ["name"],
        },
      },
    },
  }),
});

const data = await response.json();
console.log(data.data.output); // Structured object
```

For detailed API reference and examples, see [Agent Endpoints - output](../api/endpoints/agents.md#using-output-for-structured-generation).

### Calling from Next.js API Route

Example Next.js API route using the SDK (not direct REST calls):

```ts
// app/api/chat/route.ts
import { agent } from "@/voltagent";

export async function POST(req: Request) {
  const { messages, conversationId, userId } = await req.json();

  const result = await agent.streamText(messages, {
    conversationId,
    userId,
  });

  return result.toUIMessageStreamResponse();
}
```

To call the REST API directly from a client:

```ts
// Client-side code
const response = await fetch("http://localhost:3141/agents/assistant/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "Hello" }],
  }),
});

// Stream response (SSE)
const reader = response.body.getReader();
// ... process stream chunks
```

## Constructor Options

You can configure agents with additional options:

```typescript
const agent = new Agent({
  // Required
  name: "MyAgent", // Agent identifier
  instructions: "You are a helpful assistant", // Behavior guidelines
  model: openai("gpt-4o"), // AI model to use (ai-sdk)

  // Optional
  id: "custom-id", // Unique ID (auto-generated if not provided)
  purpose: "Customer support agent", // Agent purpose for supervisor context
  tools: [weatherTool, searchTool], // Available tools
  memory: memoryStorage, // Memory instance (or false to disable)
  context: new Map([
    // Default context for all operations
    ["environment", "production"],
  ]),
  maxSteps: 10, // Maximum tool-use iterations
  temperature: 0.7, // Default creativity (overridable per call)
  maxOutputTokens: 512, // Default token limit (overridable per call)
  subAgents: [researchAgent], // Sub-agents for delegation
  supervisorConfig: {
    // Supervisor behavior config
    systemMessage: "Custom supervisor instructions",
    includeAgentsMemory: true,
  },

  // Additional constructor parameters
  hooks: createHooks({ onStart, onEnd }), // Lifecycle event handlers
  retriever: new PineconeRetriever(), // RAG retriever
  voice: new ElevenLabsVoice(), // Voice configuration
  markdown: true, // Enable markdown formatting
  voltOpsClient: new VoltOpsClient({
    // Observability & prompt management
    publicKey: "...",
    secretKey: "...",
  }),
  maxHistoryEntries: 1000, // Max history entries to store
});
```

## Advanced Features

Agents support additional capabilities through configuration options. Each feature is briefly explained below with a link to detailed documentation.

### Memory

Memory stores conversation history so agents can reference past messages. By default, agents use in-memory storage (non-persistent). You can configure persistent storage adapters.

```ts
import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

const agent = new Agent({
  name: "Agent with Memory",
  model: openai("gpt-4o"),
  memory,
});
```

[Memory documentation](./memory/overview.md)

### Tools

Tools let agents call functions to fetch data, perform actions, or interact with external systems. The LLM decides when to use tools based on the user's input.

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Call weather API
    return { temperature: 72, conditions: "sunny" };
  },
});

const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Answer weather questions using the get_weather tool.",
  model: openai("gpt-4o"),
  tools: [weatherTool],
});
```

[Tools documentation](./tools.md)

#### Using Agents as Tools

Agents can be converted to tools and used by other agents:

```ts
const writerAgent = new Agent({
  id: "writer",
  purpose: "Writes blog posts",
  model: openai("gpt-4o-mini"),
});

const editorAgent = new Agent({
  id: "editor",
  purpose: "Edits content",
  model: openai("gpt-4o-mini"),
});

// Coordinator uses them as tools
const coordinator = new Agent({
  tools: [writerAgent.toTool(), editorAgent.toTool()],
  model: openai("gpt-4o-mini"),
});
```

This is useful when the LLM should decide which agents to call based on the request.

### Guardrails

Guardrails run before and after the model call to validate inputs or adjust outputs. Input guardrails receive the request text, while output guardrails can rewrite or block the response before it reaches the caller.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Guarded Assistant",
  instructions: "Answer briefly.",
  model: openai("gpt-4o-mini"),
  inputGuardrails: [
    {
      id: "reject-empty",
      name: "Reject Empty Prompts",
      handler: async ({ inputText }) => {
        if (inputText.trim().length === 0) {
          return {
            pass: false,
            action: "block",
            message: "Prompt cannot be empty.",
          };
        }
        return { pass: true };
      },
    },
  ],
  outputGuardrails: [
    {
      id: "trim-output",
      name: "Trim Whitespace",
      handler: async ({ output }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: typeof output === "string" ? output.trim() : output,
      }),
    },
  ],
});

const response = await agent.generateText("  Give me one fact about Mars.  ");
console.log(response.text); // "Give me one fact about Mars." (trimmed)
```

[Learn more about Guardrails](../guardrails/built-in.md)

### Sub-Agents

Sub-agents let you delegate tasks to specialized agents. The parent agent can call sub-agents through an automatically generated `delegate_task` tool.

```ts
const researchAgent = new Agent({
  name: "Researcher",
  instructions: "Research topics thoroughly.",
  model: openai("gpt-4o"),
});

const writerAgent = new Agent({
  name: "Writer",
  instructions: "Write clear, concise content.",
  model: openai("gpt-4o"),
});

const coordinator = new Agent({
  name: "Coordinator",
  instructions: "Delegate research to Researcher and writing to Writer.",
  model: openai("gpt-4o"),
  subAgents: [researchAgent, writerAgent],
});
```

#### Event Filtering

When streaming with sub-agents, by default only `tool-call` and `tool-result` events are forwarded from sub-agents to reduce noise.

**Enable all event types:**

```ts
const coordinator = new Agent({
  name: "Coordinator",
  instructions: "Coordinate between agents.",
  model: openai("gpt-4o"),
  subAgents: [researchAgent, writerAgent],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["tool-call", "tool-result", "text-delta", "reasoning", "source", "error", "finish"],
    },
  },
});

// Now receive all sub-agent events
const response = await coordinator.streamText("Research and write about AI");
for await (const chunk of response.fullStream) {
  if (chunk.subAgentId && chunk.subAgentName) {
    console.log(`[${chunk.agentPath?.join(" > ") ?? chunk.subAgentName}] ${chunk.type}`);
  }
}
```

[Sub-Agents documentation](./subagents.md)

### Hooks

Hooks let you run code at specific points in the agent lifecycle: before/after operations, before/after tool calls, etc. Use hooks for logging, monitoring, or custom logic.

```ts
import { createHooks } from "@voltagent/core";

const hooks = createHooks({
  onStart: async ({ agent, context }) => {
    console.log(`${agent.name} started`);
  },
  onEnd: async ({ agent, output, error }) => {
    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Completed:", output);
    }
  },
});

const agent = new Agent({
  name: "Agent",
  instructions: "Answer questions.",
  model: openai("gpt-4o"),
  hooks,
});
```

[Hooks documentation](./hooks.md)

### Prompt Management

Instructions can be static strings, dynamic functions, or managed remotely via VoltOps. Dynamic instructions let you change agent behavior based on runtime context.

```ts
// Static instructions
const agent1 = new Agent({
  name: "Assistant",
  instructions: "Answer questions.",
  model: openai("gpt-4o"),
});

// Dynamic instructions
const agent2 = new Agent({
  name: "Assistant",
  instructions: ({ context }) => {
    const tier = context.get("tier") || "free";
    return tier === "premium" ? "Provide detailed answers." : "Provide concise answers.";
  },
  model: openai("gpt-4o"),
});
```

[Prompt Management documentation](./prompts.md)

### Dynamic Agents

Agent properties (instructions, model, tools) can be functions that evaluate at runtime based on context. This enables multi-tenant apps, role-based access, or per-user model selection.

```ts
const agent = new Agent({
  name: "Agent",
  instructions: ({ context }) => {
    const role = context.get("role");
    return role === "admin" ? "Admin instructions." : "User instructions.";
  },
  model: ({ context }) => {
    const tier = context.get("tier");
    return tier === "premium" ? openai("gpt-4o") : openai("gpt-4o-mini");
  },
});

await agent.generateText("Hello", {
  context: new Map([
    ["role", "admin"],
    ["tier", "premium"],
  ]),
});
```

[Dynamic Agents documentation](./dynamic-agents.md)

### Operation Context

Pass request-specific data (like request IDs, user info) between hooks and tools using the operation context `Map`. Context is scoped to a single operation.

```ts
const hooks = createHooks({
  onStart: async ({ context }) => {
    context.context.set("requestId", `req-${Date.now()}`);
  },
});

const tool = createTool({
  name: "logger",
  parameters: z.object({ message: z.string() }),
  execute: async (params, oc) => {
    const requestId = oc?.context?.get("requestId");
    console.log(`[${requestId}] ${params.message}`);
  },
});
```

[Context documentation](./context.md)

### Retriever (RAG)

Retrievers fetch relevant context from external knowledge bases before calling the LLM. Implement the `BaseRetriever` interface to connect vector databases or document stores.

```ts
class SimpleRetriever extends BaseRetriever {
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    // Fetch relevant documents from vector DB or knowledge base
    return "Retrieved context goes here";
  }
}

const agent = new Agent({
  name: "Assistant",
  instructions: "Answer using retrieved context.",
  model: openai("gpt-4o"),
  retriever: new SimpleRetriever(),
});
```

[Retriever documentation](../rag/overview.md)

### Models and Providers

VoltAgent uses [ai-sdk](https://sdk.vercel.ai) models directly. Switch providers by changing the model import.

```ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const agent1 = new Agent({
  name: "OpenAI Agent",
  model: openai("gpt-4o"),
  instructions: "Answer questions.",
});

const agent2 = new Agent({
  name: "Anthropic Agent",
  model: anthropic("claude-3-5-sonnet"),
  instructions: "Answer questions.",
});
```

[Providers and Models documentation](../getting-started/providers-models.md)

### Call Settings

Configure generation behavior per-call with parameters like `temperature`, `maxOutputTokens`, `topP`, etc.

```ts
await agent.generateText("Write a story", {
  temperature: 0.8,
  maxOutputTokens: 500,
  topP: 0.9,
  seed: 12345,
  // Provider-specific options
  providerOptions: {
    someProviderSpecificOption: {
      foo: "bar",
    },
  },
});
```

### Markdown Formatting

Enable automatic markdown formatting in text responses by setting `markdown: true`. The agent will use markdown syntax (headings, lists, bold text, etc.) in its responses.

```ts
const agent = new Agent({
  name: "Assistant",
  instructions: "Answer questions clearly.",
  model: openai("gpt-4o"),
  markdown: true,
});

const result = await agent.generateText("Explain how to make tea.");
// Response will be formatted with markdown
```

### Step Control (maxSteps)

`maxSteps` limits how many LLM calls (steps) an agent can make in a single operation. Each tool call consumes a step. Default is 5.

```ts
// Set maxSteps at agent level
const agent = new Agent({
  name: "Agent",
  model: openai("gpt-4o"),
  maxSteps: 5, // Default for all operations
});

// Or override per-call
await agent.generateText("Question", { maxSteps: 3 });
```

### Cancellation (AbortController)

Cancel long-running operations using `AbortController`. Pass the signal to agent methods.

```ts
const abortController = new AbortController();

setTimeout(() => abortController.abort(), 5000); // Cancel after 5s

try {
  const response = await agent.generateText("Long task...", {
    abortSignal: abortController.signal,
  });
} catch (error) {
  if (isAbortError(error)) {
    console.log("Cancelled");
  }
}
```

[Cancellation documentation](./cancellation.md)

### MCP (Model Context Protocol)

Connect to external MCP servers to use their tools as if they were local tools.

```ts
import { MCPConfiguration } from "@voltagent/core";

const mcpConfig = new MCPConfiguration({
  servers: {
    myServer: {
      type: "http",
      url: "https://mcp-server.example.com",
    },
  },
});

const mcpTools = await mcpConfig.getTools();

const agent = new Agent({
  name: "Agent",
  model: openai("gpt-4o"),
  tools: mcpTools,
});
```

[MCP documentation](./mcp/mcp.md)

### Voice

Add speech-to-text and text-to-speech capabilities using voice providers.

```ts
import { OpenAIVoiceProvider } from "@voltagent/voice";

const voice = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  ttsModel: "tts-1",
  voice: "alloy",
});

const agent = new Agent({
  name: "Voice Assistant",
  model: openai("gpt-4o"),
  voice,
});

const result = await agent.generateText("Tell a story");
const audioStream = await agent.voice.speak(result.text);
```

[Voice documentation](./voice.md)

## Error Handling

Wrap agent calls in try-catch blocks. Errors during streaming are recorded in history and can be observed via the `onError` callback.

## Next Steps

See the links above for detailed documentation on each feature. For working examples, visit the [examples repository](https://github.com/voltagent/voltagent/tree/main/examples).
