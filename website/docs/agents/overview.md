---
title: Overview
slug: /agents/overview
---

# Agent Overview

The `Agent` class is the fundamental building block of VoltAgent. It acts as the central orchestrator, allowing you to create AI agents that interact with Large Language Models (LLMs), use tools to interact with the outside world, maintain conversational memory, and embody specific personalities or instructions.

## Creating an Agent

At its core, an agent needs a name, instructions (which guide its behavior), and an ai-sdk model.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai"; // Choose your ai-sdk provider

const agent = new Agent({
  name: "My Assistant",
  instructions: "A helpful and friendly assistant that can answer questions clearly and concisely.",
  // Choose any ai-sdk model
  model: openai("gpt-4o"),
});
```

## Constructor Options

The `Agent` constructor accepts an options object with these properties:

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

## Core Interaction Methods

The primary ways to interact with an agent are through the `generate*` and `stream*` methods. These methods handle sending your input to the configured LLM, processing the response, and potentially orchestrating tool usage or memory retrieval based on the agent's configuration and the LLM's decisions.

:::info Result Shape (ai-sdk v5)
`generateText`, `streamText`, `generateObject`, and `streamObject` return the ai-sdk v5 result objects directly. VoltAgent only adds one extra property: `context: Map<string | symbol, unknown>`. All other fields and methods (including `fullStream`, `text`, `usage`, and response helpers) are identical to ai-sdk.
:::

### Text Generation (`generateText`/`streamText`)

Use these methods when you expect a primarily text-based response. The agent might still decide to use tools based on the prompt and its capabilities.

- `generateText`: Returns the complete text response after the LLM and any necessary tool calls are finished.
- `streamText`: Returns a stream that yields chunks of the response (text, tool calls, tool results) as they become available, providing a more interactive experience.

```ts
import { Agent, createTool } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Example Tool (see Tools section for details)
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a specific location",
  parameters: z.object({ location: z.string().describe("City and state") }),
  execute: async ({ location }) => {
    console.log(`Tool: Getting weather for ${location}`);
    // Call API... return mock data
    return { temperature: 72, conditions: "sunny" };
  },
});

const agent = new Agent({
  name: "Chat Assistant",
  instructions: "A helpful assistant that can check the weather.",
  model: openai("gpt-4o"),
  tools: [weatherTool],
});

// Example using streamText for a chat-like interaction
async function chat(input: string) {
  console.log(`User: ${input}`);
  // Use streamText for interactive responses
  const stream = await agent.streamText(input);

  for await (const chunk of stream.textStream) {
    console.log(chunk);
  }
}

// Example usage that might trigger the weather tool
await chat("What's the weather like in London?");

// Example using generateText for a complete response (string input)
const completeResponse = await agent.generateText("Explain machine learning briefly.");
console.log("Complete Response:", completeResponse.text);
// Additional metadata available (provider-dependent):
// completeResponse.reasoning - Model's reasoning process (if available)
// completeResponse.warnings - Any provider warnings

// You can also pass ai-sdk v5 ModelMessage[] or UIMessage[] for multimodal inputs
await agent.generateText([
  {
    role: "user",
    content: [
      {
        type: "image",
        image: "https://example.com/cat.jpg",
        mediaType: "image/jpeg",
      },
      {
        type: "text",
        text: "What's in this image?",
      },
    ],
  },
]);
```

#### Structured Output (Experimental)

VoltAgent supports ai-sdk's experimental structured output features for type-safe responses:

```ts
import { Output } from "ai";
import { z } from "zod";

// Define your schema
const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  prepTime: z.number(),
});

// generateText returns the final structured output
const result = await agent.generateText("Create a pasta recipe", {
  experimental_output: Output.object({
    schema: RecipeSchema,
  }),
});

// Access the structured output
console.log(result.experimental_output);

// streamText uses experimental_partialOutputStream for streaming partial objects
const stream = await agent.streamText("Create a detailed recipe", {
  experimental_output: Output.object({
    schema: RecipeSchema,
  }),
});

// Stream partial objects as they're generated
for await (const partial of stream.experimental_partialOutputStream ?? []) {
  console.log(partial); // Partial recipe object that builds up over time
}
```

You can also use `Output.text()` for constrained text generation:

```ts
// Generate text with specific constraints
const result = await agent.generateText("Write a haiku about coding", {
  experimental_output: Output.text({
    maxLength: 100,
    description: "A traditional haiku poem about programming",
  }),
});

console.log(result.experimental_output); // The generated haiku text
```

> **Note:** `generateText` provides `experimental_output` with the final object, while `streamText` provides `experimental_partialOutputStream` for streaming partial objects.

#### Enhanced Streaming with `fullStream`

For more detailed streaming information including tool calls, reasoning steps, and completion status, you can use the `fullStream` property available in the response:

```ts
// Example using fullStream for detailed streaming events (ai-sdk v5)
const response = await agent.streamText("Write a short story about a cat and format it nicely");

for await (const chunk of response.fullStream) {
  if (chunk.type === "text-delta") {
    process.stdout.write(chunk.text);
  } else if (chunk.type === "tool-call") {
    console.log(`\n🔧 Using tool: ${chunk.toolName}`);
  } else if (chunk.type === "tool-result") {
    console.log(`✅ Tool completed: ${chunk.toolName}`);
  } else if (chunk.type === "finish") {
    console.log(`\n✨ Done! Tokens used: ${chunk.totalUsage.totalTokens}`);
  }
}
```

#### Promise-based Properties in Streaming Responses

For more convenient access to final values when streaming, VoltAgent provides Promise-based properties that resolve when the stream completes:

```ts
// Example using Promise properties with streamText
async function streamWithPromises(input: string) {
  const response = await agent.streamText(input);

  // Start processing the stream
  const streamProcessing = (async () => {
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
    }
  })();

  // Access final values via Promises (these resolve when streaming completes)
  const [fullText, usage, finishReason] = await Promise.all([
    response.text, // Promise<string> - Full generated text
    response.usage, // Promise<UsageInfo> - Token usage statistics
    response.finishReason, // Promise<string> - Why generation stopped
  ]);

  console.log("\n\nGeneration complete!");
  console.log(`Total text: ${fullText.length} characters`);
  console.log(`Tokens used: ${usage?.totalTokens}`);
  console.log(`Finish reason: ${finishReason}`);
}

// Example using Promise properties with streamObject
async function streamObjectWithPromises() {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    skills: z.array(z.string()),
  });

  const response = await agent.streamObject("Generate a developer profile", schema);

  // Process partial updates
  console.log("Building object...");
  for await (const partial of response.partialObjectStream) {
    console.log("Partial:", partial);
  }

  // Get the final complete object and metadata
  const finalObject = await response.object; // Promise<T> - Final validated object
  const usage = await response.usage; // Promise<UsageInfo> - Token usage

  console.log("\nFinal object:", finalObject);
  console.log("Generation used", usage?.totalTokens, "tokens");
}
```

:::info Promise Properties

The ai-sdk streaming result exposes promise-based convenience properties:

- streamText: `text`, `finishReason`, `usage`
- streamObject: `object`, `warnings`, `usage`

These resolve when the stream completes, so you can process the stream and then await the final values.

:::

### SubAgent Event Filtering

When using `fullStream` with sub-agents, by default only `tool-call` and `tool-result` events are forwarded from sub-agents to the parent stream. This keeps the stream focused on meaningful actions while reducing noise.

#### Default Behavior

```ts
// By default, only tool-call and tool-result events are forwarded
const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: "You coordinate between agents",
  subAgents: [writerAgent, editorAgent],
  // No configuration needed - defaults to ['tool-call', 'tool-result']
});

const response = await supervisorAgent.streamText("Write and edit a story");

if (response.fullStream) {
  for await (const chunk of response.fullStream) {
    // You'll only see tool events from sub-agents by default
    if (chunk.subAgentId && chunk.subAgentName) {
      console.log(`[${chunk.subAgentName}] Tool: ${chunk.toolName}`);
    }
  }
}
```

#### Enabling All Event Types

To receive all sub-agent events (text deltas, reasoning, sources, etc.), configure the supervisor:

```ts
const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: "You coordinate between agents",
  subAgents: [writerAgent, editorAgent],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["tool-call", "tool-result", "text-delta", "reasoning", "source", "error", "finish"],
    },
  },
});

// Now you'll receive all event types
if (response.fullStream) {
  for await (const chunk of response.fullStream) {
    const isSubAgentEvent = chunk.subAgentId && chunk.subAgentName;

    if (isSubAgentEvent) {
      switch (chunk.type) {
        case "text-delta":
          process.stdout.write(chunk.textDelta); // Stream sub-agent text
          break;
        case "reasoning":
          console.log(`[${chunk.subAgentName}] Thinking: ${chunk.reasoning}`);
          break;
        case "tool-call":
          // Tool names include agent prefix: "WriterAgent: search_tool"
          console.log(`[${chunk.subAgentName}] Using: ${chunk.toolName}`);
          break;
      }
    }
  }
}
```

#### Custom Event Filtering

You can selectively enable specific event types:

```ts
supervisorConfig: {
  fullStreamEventForwarding: {
    // Only forward text and tool events, no reasoning or sources
    types: ['tool-call', 'tool-result', 'text-delta'],
  }
}
```

**Available SubAgent Event Types:**

- `text-delta`: SubAgent text output (character by character)
- `reasoning`: SubAgent internal reasoning steps
- `source`: SubAgent context retrieval results
- `tool-call`: SubAgent tool execution starts
- `tool-result`: SubAgent tool execution completes
- `error`: SubAgent errors
- `finish`: SubAgent completion events

Tip: If you prefer prefixed labels (e.g., `WriterAgent: search_tool`), use the stream metadata instead of a config flag:

```ts
for await (const chunk of response.fullStream!) {
  if (chunk.subAgentName && chunk.type === "tool-call") {
    console.log(`[${chunk.subAgentName}] Using: ${chunk.toolName}`);
  }
}
```

This configuration approach provides fine-grained control over which sub-agent events reach your application, allowing you to balance between information richness and stream performance.

#### Markdown Formatting

**Why?** To have the agent automatically format its text responses using Markdown for better readability and presentation.

By setting the `markdown` property to `true` in the agent's configuration, you instruct the LLM to use Markdown syntax (like headings, lists, bold text, etc.) when generating text responses. VoltAgent adds a corresponding instruction to the system prompt automatically.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Markdown Assistant",
  instructions: "A helpful assistant that formats answers clearly.",
  model: openai("gpt-4o"),
  markdown: true, // Enable automatic Markdown formatting
});

// Now, when you call generateText or streamText,
// the agent will attempt to format its response using Markdown.
const response = await agent.generateText("Explain the steps to make a cup of tea.");
console.log(response.text);
```

This is particularly useful when displaying agent responses in UIs that support Markdown rendering.

### Structured Data Generation (`generateObject`/`streamObject`)

Use these methods when you need the LLM to generate output conforming to a specific structure (defined by a Zod schema). This is ideal for data extraction, function calling based on schema, or generating predictable JSON.

- `generateObject`: Returns the complete structured object once generation is finished.
- `streamObject`: Returns a stream that yields partial updates to the object as it's being constructed by the LLM.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const agent = new Agent({
  name: "Data Extractor",
  instructions: "Extracts structured data.",
  model: openai("gpt-4o"), // Ensure model supports structured output/function calling
});

// Define a simple schema with Zod
const personSchema = z.object({
  name: z.string().describe("Full name"), // Descriptions help the LLM
  age: z.number(),
  occupation: z.string(),
  skills: z.array(z.string()),
});

// Example using generateObject
const objectResponse = await agent.generateObject(
  "Create a profile for a talented software developer named Alex.",
  personSchema
);
console.log("Complete object:", objectResponse.object);

// Example using streamObject
const streamObjectResponse = await agent.streamObject(
  "Generate details for a data scientist named Jamie.",
  personSchema
);

for await (const partial of streamObjectResponse.partialObjectStream) {
  console.log("Received update:", partial); // Shows the object being built incrementally
}

// Get the final object (if supported by provider)
if (streamObjectResponse.object) {
  const finalObject = await streamObjectResponse.object;
  console.log("Final object:", finalObject);
}
```

## Advanced Features

Enhance your agents with these powerful capabilities, which are integrated into the core `generate*`/`stream*` methods:

### Memory

**Why?** To give your agent context of past interactions, enabling more natural, coherent, and personalized conversations.

- Storage: pluggable adapters (default is in-memory, no persistence)
- Embedding + Vector: optional semantic search over past messages
- Working Memory: optional structured context (via schema or template)

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql"; // persistence (optional)
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Optional: structured working memory
const workingMemorySchema = z.object({ goals: z.array(z.string()).optional() });

// Configure persistent memory with semantic search (optional)
const memory = new Memory({
  // Remove this to use default in-memory storage
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  // Optional: enable semantic search
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
  // Optional: working memory
  workingMemory: { enabled: true, scope: "conversation", schema: workingMemorySchema },
});

const agent = new Agent({
  name: "Assistant with Memory",
  model: openai("gpt-4o-mini"),
  memory, // defaults to in-memory if omitted
});
```

Notes:

- Default storage: in-memory (good for dev/tests, non-persistent)
- Persistence options: `LibSQLMemoryAdapter` (@voltagent/libsql), `PostgreSQLMemoryAdapter` (@voltagent/postgres), `SupabaseMemoryAdapter` (@voltagent/supabase)
- Embeddings: use `AiSdkEmbeddingAdapter` with your ai-sdk embedding model

**[Learn more in Memory docs](./memory/overview.md)**

### Tools

**Why?** To allow your agent to interact with the outside world, access real-time information, or perform actions via APIs, databases, or other systems.

When you call `generateText` or `streamText`, the LLM can decide to use one of the provided tools. VoltAgent handles the execution and feeds the result back to the LLM to continue generation.

```ts
import { Agent, createTool } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create a weather tool using the helper function
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a specific location",
  parameters: z.object({
    location: z.string().describe("The city and state, e.g., San Francisco, CA"),
  }),
  // The function the agent executes when using the tool
  execute: async ({ location }) => {
    console.log(`Tool: Getting weather for ${location}`);
    // In a real scenario, call a weather API here
    // Returning mock data for demonstration
    if (location.toLowerCase().includes("london")) {
      return { temperature: 55, conditions: "cloudy" };
    }
    return { temperature: 72, conditions: "sunny" };
  },
});

const agent = new Agent({
  name: "Weather Assistant",
  instructions: "An assistant that can check the weather using available tools.",
  model: openai("gpt-4o"), // Models supporting tool use are required
  tools: [weatherTool], // Provide the list of tools to the agent
});

// Example: Call streamText and the agent might use the tool
const response = await agent.generateText("What's the weather in London?");
console.log(response.text);
// The agent should call the 'get_weather' tool during the generation.
```

[Learn more about Tools](./tools.md)

### Sub-Agents

**Why?** To break down complex tasks into smaller, manageable parts handled by specialized agents, promoting modularity and focused expertise (similar to a team of specialists).

A coordinator agent uses a special `delegate_task` tool (added automatically when sub-agents are present) to pass control to a sub-agent during a `generate*`/`stream*` call.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Assume researchAgent and writingAgent are configured Agents
const researchAgent = new Agent({ name: "Researcher" /* ... */ });
const writingAgent = new Agent({ name: "Writer" /* ... */ });

// Create a coordinator agent that uses the others
const mainAgent = new Agent({
  name: "Coordinator",
  instructions: "Coordinates research and writing tasks by delegating to specialized sub-agents.",
  model: openai("gpt-4o"),
  // List the agents this one can delegate tasks to
  subAgents: [researchAgent, writingAgent],
});

// Example: Call streamText on the main agent
const response = await mainAgent.generateText("Write a blog post about quantum computing.");
console.log(response.text);
// The Coordinator might decide to use the delegate_task tool to involve researchAgent and writingAgent.
```

[Learn more about Sub-Agents](./subagents.md)

### Hooks

**Why?** To observe and potentially intercept or modify the agent's behavior at various lifecycle stages (start, end, tool calls, etc.) for logging, debugging, or custom logic.

Hooks are triggered at specific points during the execution of `generate*`/`stream*` methods. Each hook receives a single argument object containing relevant information like the agent instance and operation context.

```ts
import {
  Agent,
  createHooks,
  type OnStartHookArgs,
  type OnEndHookArgs,
  type OnToolStartHookArgs,
  type OnToolEndHookArgs,
} from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const hooks = createHooks({
  // Called when any agent interaction starts (generateText, streamText, etc.)
  onStart: async ({ agent, context }: OnStartHookArgs) => {
    console.log(`Agent ${agent.name} starting interaction... Context:`, context);
  },
  // Called when the interaction finishes (successfully or with an error)
  onEnd: async ({ agent, output, error, context }: OnEndHookArgs) => {
    if (error) {
      console.error(`Agent ${agent.name} finished with error:`, error);
    }

    if (!output) return; // operation failed or was aborted

    // Log usage if available
    if (output.usage) {
      console.log(`Total tokens: ${output.usage.totalTokens}`);
    }

    // Handle text results
    if ("text" in output && output.text) {
      console.log("Final text:", output.text);
      return;
    }

    // Handle object results
    if ("object" in output && output.object) {
      console.log("Final object keys:", Object.keys(output.object));
    }
  },
  // Called before a tool is executed
  onToolStart: async ({ agent, tool, context }: OnToolStartHookArgs) => {
    console.log(`Agent ${agent.name} starting tool: ${tool.name}. Context:`, context);
  },
  // Called after a tool finishes execution (successfully or with an error)
  onToolEnd: async ({ agent, tool, output, error, context }: OnToolEndHookArgs) => {
    if (error) {
      console.error(`Agent ${agent.name} failed tool: ${tool.name}. Error:`, error);
    } else {
      console.log(
        `Agent ${agent.name} finished tool: ${tool.name}. Result:`,
        output // Tool output is directly available
      );
    }
    console.log("Tool context:", context);
  },
  // Note: There is no top-level 'onError' hook. Errors are handled within onEnd and onToolEnd.
  // The 'onHandoff' hook (not shown here) is called when control is passed between agents (e.g., sub-agents).
});

const agent = new Agent({
  name: "Observable Agent",
  instructions: "An agent with logging hooks.",
  model: openai("gpt-4o"),
  hooks, // Attach the defined hooks
});
```

[Learn more about Hooks](./hooks.md)

### Prompt Management

**Why?** To manage your agent's instructions and behavior efficiently across different environments, enable team collaboration on prompts, maintain version control, and implement A/B testing without code deployments.

VoltAgent provides a three-tier prompt management system: Static Instructions (hardcoded strings), Dynamic Instructions (runtime functions), and VoltOps Management (enterprise-grade remote prompt management with analytics).

```ts
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Option 1: Static Instructions (simple, hardcoded)
const staticAgent = new Agent({
  name: "Static Assistant",
  instructions: "You are a helpful customer support agent. Be polite and efficient.",
  model: openai("gpt-4o-mini"),
});

// Option 2: Dynamic Instructions (runtime-based)
const dynamicAgent = new Agent({
  name: "Dynamic Assistant",
  instructions: async ({ context }) => {
    const userTier = context.get("userTier") || "basic";

    if (userTier === "premium") {
      return "You are a premium support agent. Provide detailed, thorough assistance.";
    } else {
      return "You are a support agent. Provide helpful but concise answers.";
    }
  },
  model: openai("gpt-4o-mini"),
});

// Option 3: VoltOps Management (enterprise-grade)
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const managedAgent = new Agent({
  name: "Managed Assistant",
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      label: process.env.NODE_ENV === "production" ? "production" : "development",
      variables: {
        companyName: "VoltAgent Corp",
        tone: "friendly and professional",
      },
    });
  },
  model: openai("gpt-4o-mini"),
});

const voltAgent = new VoltAgent({
  agents: { managedAgent },
  voltOpsClient: voltOpsClient,
});
```

[Learn more about Prompt Management](./prompts.md)

### Dynamic Agents

**Why?** To create adaptive AI agents that change their behavior, capabilities, and configuration based on runtime context. Instead of having fixed instructions, models, or tools, you can define functions that dynamically determine these properties based on user context, request parameters, or any other runtime information.

Dynamic agents are perfect for multi-tenant applications, role-based access control, subscription tiers, internationalization, and A/B testing scenarios.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const dynamicAgent = new Agent({
  name: "Adaptive Assistant",

  // Dynamic instructions based on user context
  instructions: ({ context }) => {
    const role = (context.get("role") as string) || "user";
    const language = (context.get("language") as string) || "English";

    if (role === "admin") {
      return `You are an admin assistant with special privileges. Respond in ${language}.`;
    } else {
      return `You are a helpful assistant. Respond in ${language}.`;
    }
  },

  // Dynamic model based on subscription tier
  model: ({ context }) => {
    const tier = (context.get("tier") as string) || "free";

    switch (tier) {
      case "premium":
        return openai("gpt-4o");
      case "pro":
        return openai("gpt-4o-mini");
      default:
        return openai("gpt-3.5-turbo");
    }
  },
});

// Use with context
const context = new Map<string, unknown>();
context.set("role", "admin");
context.set("language", "Spanish");
context.set("tier", "premium");

const response = await dynamicAgent.generateText("Help me manage the system settings", {
  context: context,
});
// The agent will respond in Spanish, with admin capabilities, using the premium model
```

[Learn more about Dynamic Agents](./dynamic-agents.md)

### Operation Context (`context`)

**Why?** To pass custom, request-specific data between different parts of an agent's execution flow (like hooks and tools) for a single operation, without affecting other concurrent or subsequent operations. Useful for tracing, logging, metrics, or passing temporary configuration.

`context` is a `Map` accessible via the `OperationContext` object, which is passed to hooks and available in tool execution contexts. This context is isolated to each individual operation (`generateText`, `streamObject`, etc.).

```ts
import { Agent, createHooks, createTool, type OperationContext } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const hooks = createHooks({
  onStart: async ({ context }) => {
    const requestId = `req-${Date.now()}`;
    context.context.set("requestId", requestId);
    console.log(`[agent] Operation started. RequestID: ${requestId}`);
  },
  onEnd: async ({ context }) => {
    const requestId = context.context.get("requestId");
    console.log(`[agent] Operation finished. RequestID: ${requestId}`);
  },
});

const loggerTool = createTool({
  name: "context_aware_logger",
  description: "Logs a message using the request ID from context.",
  parameters: z.object({ message: z.string() }),
  execute: async (params: { message: string }, oc?: OperationContext) => {
    const requestId = oc?.context?.get("requestId") || "unknown";
    const logMessage = `[ReqID: ${requestId}] Tool Log: ${params.message}`;
    console.log(logMessage);
    return `Logged: ${params.message}`;
  },
});

const agent = new Agent({
  name: "Context Agent",
  instructions: "Uses context.",
  model: openai("gpt-4o"),
  hooks: hooks,
  tools: [loggerTool],
});

await agent.generateText("Log this message: 'Processing user data.'");
// The requestId set in onStart will be available in loggerTool and onEnd.
```

[Learn more about Operation Context (context)](./context.md)

### Retriever

**Why?** To provide the agent with access to external knowledge bases or documents, allowing it to answer questions or generate content based on information not present in its original training data (Retrieval-Augmented Generation - RAG).

The retriever is automatically invoked before calling the LLM within `generate*`/`stream*` methods to fetch relevant context, which is then added to the system prompt.

```ts
import { BaseRetriever } from "@voltagent/core";
import type { BaseMessage } from "@voltagent/core";
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Create a simple retriever (replace with actual vector search in production)
class SimpleRetriever extends BaseRetriever {
  // Sample knowledge base
  private documents = [
    { id: "doc1", content: "VoltAgent is a TypeScript framework for building AI agents." },
    { id: "doc2", content: "Agents can use tools, memory, and sub-agents." },
    { id: "doc3", content: "Retrievers enhance AI agents with external knowledge using RAG." },
  ];

  // Method to fetch relevant documents
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    // Extract the query text
    const query = typeof input === "string" ? input : (input[input.length - 1].content as string);
    console.log(`Retriever: Searching for "${query}"`);

    // Simple keyword matching (use vector embeddings for real applications)
    const results = this.documents.filter((doc) =>
      doc.content.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) return "No relevant information found in documents.";

    // Format results for the LLM
    return results.map((doc) => `Document ${doc.id}: ${doc.content}`).join("\n\n");
  }
}

// Create agent with the retriever
const agent = new Agent({
  name: "Knowledge Assistant",
  instructions: "An assistant that uses retrieved documents to answer questions.",
  model: openai("gpt-4o"),
  retriever: new SimpleRetriever(), // Add the retriever instance
});

// Example: Ask a question using streamText
const response = await agent.generateText("What are Retrievers in VoltAgent?");
console.log(response.text);
// The agent will use SimpleRetriever *before* calling the LLM,
// then generate an answer based on the retrieved context.
```

[Learn more about Retrievers](../rag/overview.md)

### Models & Providers (ai-sdk)

VoltAgent uses the ai-sdk directly. You select a provider package from ai-sdk and pass the model to `Agent` via the `model` prop. Switching providers is as simple as changing the model factory.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const openaiAgent = new Agent({
  name: "OpenAI Assistant",
  instructions: "Assistant using OpenAI via ai-sdk",
  model: openai("gpt-4o-mini"),
});

const anthropicAgent = new Agent({
  name: "Anthropic Assistant",
  instructions: "Assistant using Anthropic via ai-sdk",
  model: anthropic("claude-3-5-sonnet"),
});

// Use as usual
const res = await openaiAgent.generateText("Hello");
```

[See Getting Started: Providers & Models](../getting-started/providers-models.md)

### Call Settings

Configure model behavior using ai-sdk call settings passed to agent methods. Common parameters include `temperature`, `maxOutputTokens`, `topP`, and stop sequences. For provider-specific options, use `providerOptions`.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Configurable Assistant",
  instructions: "An assistant with configurable generation parameters",
  model: openai("gpt-4o"),
});

// Example: Configure common LLM parameters regardless of provider
const response = await agent.generateText("Write a creative story about a robot.", {
  // ai-sdk call settings (common across providers)
  temperature: 0.8,
  maxOutputTokens: 500,
  topP: 0.9,
  presencePenalty: 0.3,
  frequencyPenalty: 0.5,
  stopSequences: ["THE END"],
  seed: 12345,
  // Provider-specific options
  providerOptions: {
    someProviderSpecificOption: {
      foo: "bar",
    },
  },
});

// Alternative: Provide parameters for streamed responses
const streamedResponse = await agent.streamText("Generate a business plan", {
  temperature: 0.3,
  maxOutputTokens: 2000,
});
```

Use these standardized options to:

- Fine-tune response characteristics (creativity, length, diversity)
- Register callbacks for streaming events
- Achieve consistent behavior across different LLM providers
- Create reproducible outputs with the same seed value

The options are applied consistently whether you're using `generateText`, `streamText`, `generateObject`, or `streamObject` methods.

### Step Control with maxSteps

**Why?** To control the number of iteration steps (turns) an agent can take during a single operation. This is particularly important for agents using tools, as they may need multiple LLM calls to complete a task: one to decide which tools to use, execute the tools, and then continue with the results.

VoltAgent supports `maxSteps` configuration at both the agent level (applies to all operations) and per-operation level (overrides agent setting for specific calls).

```ts
import { Agent, createTool } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get current weather",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    return { temperature: 22, condition: "sunny" };
  },
});

// Agent-level maxSteps (applies to all operations)
const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Help users with weather information using available tools",
  model: openai("gpt-4o"),
  tools: [weatherTool],
  maxSteps: 5, // All operations will use max 5 steps
});

// Basic usage - uses agent-level maxSteps (5)
const response1 = await agent.generateText("What's the weather in London?");
console.log(response1.text);

// Override maxSteps for specific operation
const response2 = await agent.generateText("What's the weather in Tokyo?", {
  maxSteps: 3, // Override: use max 3 steps for this operation
});
console.log(response2.text);

// Streaming with maxSteps override
const streamResponse = await agent.streamText("Check weather in Paris", {
  maxSteps: 2, // Override: use max 2 steps for this stream
});

for await (const chunk of streamResponse.textStream) {
  process.stdout.write(chunk);
}
```

#### Understanding Steps

Each "step" represents one interaction with the LLM. For example:

- **Step 1**: LLM receives the prompt, decides to use the weather tool, and makes the tool call
- **Step 2**: LLM receives the tool result and generates the final response

Without `maxSteps`, an agent might continue indefinitely if it keeps making tool calls. Setting `maxSteps` prevents runaway execution and ensures predictable behavior.

#### maxSteps Priority

Effective value resolution:

1. **Operation-level `maxSteps`** (highest): set per call on `generateText/streamText`.
2. **Agent-level `maxSteps`**: set in the constructor.
3. **Default**: 5 steps (if not specified anywhere).

```ts
// Default behavior (no maxSteps set): 5 steps
const simpleAgent = new Agent({ name: "Simple", model: openai("gpt-4o-mini") });

// Agent-level default for all calls
const fixedAgent = new Agent({ name: "Fixed", model: openai("gpt-4o-mini"), maxSteps: 8 });

// Per-call override
await fixedAgent.generateText("...", { maxSteps: 3 });
```

#### How VoltAgent enforces steps

Under the hood, VoltAgent uses ai-sdk's `stopWhen` with `stepCountIs(maxSteps)` when calling `generateText` and `streamText`. This guarantees the model stops once the step budget is reached, even when tools are in play.

You can override this behavior per call by providing your own ai-sdk `stopWhen` predicate in the method options. VoltAgent applies sensible defaults, but if you pass `stopWhen`, it takes precedence.

```ts
import { stepCountIs, hasToolCall } from "@voltagent/core";

// Explicitly enforce 2 steps
await agent.streamText("...", { stopWhen: stepCountIs(2) });

// Custom predicate: stop after 3 steps or after a specific tool call
await agent.generateText("...", {
  stopWhen: ({ steps }) => {
    if (steps.length >= 3) return true;
    const last = steps.at(-1);
    return !!last?.toolCalls?.some((c) => c.toolName === "submit_form");
  },
});

// Convenience: stop when a specific tool is called
await agent.generateText("...", { stopWhen: hasToolCall("submit_form") });
```

Tip: To observe step boundaries, consume `fullStream` and watch for step-related events (e.g., `start-step`, `finish-step`) where supported by your model/provider.

:::caution Overriding stopWhen

- Overriding `stopWhen` disables VoltAgent's default step cap derived from `maxSteps`.
- Early termination may cut off tool-call/result cycles and yield partial answers.
- A lax predicate can allow unbounded loops if the model keeps emitting steps.
- Prefer simple guards such as `stepCountIs(n)` or explicit checks on the last event.
  :::

**When Defaults Are Sufficient:**

- Simple question-answering agents
- Basic tool usage (1-3 tool calls)
- Standard customer service interactions
- Content generation with minimal tool usage

**When to Increase maxSteps:**

- Complex research tasks requiring multiple API calls
- Advanced workflows with deep sub-agent interactions
- Iterative problem-solving requiring multiple refinement steps
- Custom enterprise workflows with specific requirements

```ts
// Custom solution requiring higher step limits
const complexResearchAgent = new Agent({
  name: "Advanced Research Agent",
  instructions: "Conducts comprehensive research with iterative refinement",
  model: openai("gpt-4o"),
  tools: [webSearchTool, databaseTool, analysisTool],
  maxSteps: 50, // Custom limit for complex workflows
});

// Enterprise workflow with multiple coordination layers
const enterpriseWorkflow = new Agent({
  name: "Enterprise Coordinator",
  instructions: "Manages complex business processes",
  model: openai("gpt-4o"),
  subAgents: [dataAgent, analysisAgent, reportAgent, reviewAgent],
  maxSteps: 100, // High limit for enterprise complexity
});
```

### Cancellation with AbortController

**Why?** To provide graceful cancellation of long-running operations like LLM generation, tool execution, or streaming responses. This is essential for user-initiated cancellations, implementing timeouts, and preventing unnecessary work when results are no longer needed.

VoltAgent supports the standard `AbortController` API across all generation methods. When an operation is aborted, it immediately stops processing, cancels any ongoing tool executions, and cleans up resources.

```ts
import { Agent, isAbortError } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Cancellable Assistant",
  instructions: "An assistant that supports operation cancellation",
  model: openai("gpt-4o"),
});

// Example: Timeout-based cancellation
const abortController = new AbortController();

// Cancel after 5 seconds
setTimeout(() => {
  abortController.abort("Operation timeout after 5 seconds");
}, 5000);

try {
  // Pass the signal to any generation method
  const response = await agent.generateText("Write a very long story...", {
    abortSignal: abortController.signal, // Cancels if timeout occurs
  });
  console.log(response.text);
} catch (error) {
  if (isAbortError(error)) {
    console.log("Operation was cancelled:", error.message);
  } else {
    console.error("Generation failed:", error);
  }
}
```

#### Tool Cancellation

When an `AbortController` is provided to agent methods, it's automatically propagated to tools through the operation context. Tools can access both the signal and the abort capability:

```ts
const searchTool = createTool({
  name: "search_web",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async (args, options) => {
    // Access the AbortController from operation context
    const abortController = options?.operationContext?.abortController;

    // Example: Tool can trigger abort if needed
    if (args.query.includes("forbidden")) {
      abortController?.abort("Search query contains forbidden terms");
      return { error: "Search cancelled due to policy violation" };
    }

    const signal = abortController?.signal;
    // Pass signal to cancellable operations like fetch
    const response = await fetch(`https://api.search.com?q=${args.query}`, {
      signal: signal,
    });

    return await response.json();
  },
});
```

Tools access cancellation through `options.operationContext.abortController`:

- `.signal` - Check if operation was aborted
- `.abort()` - Trigger cancellation from within the tool

This means if you cancel an agent operation, any active tool executions will also be cancelled gracefully. Additionally, tools can trigger cancellation themselves when needed.

**Common Cancellation Scenarios:**

- **User Interface**: Let users cancel long-running operations
- **Timeouts**: Prevent operations from running too long
- **Resource Management**: Stop unnecessary work when switching contexts
- **Error Recovery**: Cancel related operations when one fails
- **Batch Processing**: Cancel remaining operations when stopping a batch

For detailed examples of implementing cancellable tools, including error handling and best practices, see the [Tools documentation on AbortSignal](./tools.md#cancellable-tools-with-abortcontroller).

### MCP (Model Context Protocol)

**Why?** To enable standardized communication between your agent and external, potentially independent, model/tool servers, promoting interoperability and modular deployment.

Connect to external servers that adhere to the MCP specification to leverage their capabilities (e.g., specialized models or tools) without directly integrating their code. MCP tools are treated like any other tool and can be invoked during `generate*`/`stream*` calls.

```ts
import { Agent, MCPConfiguration } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Set up MCP configuration pointing to your external server(s)
const mcpConfig = new MCPConfiguration({
  servers: {
    // Define one or more MCP-compliant servers
    myModelServer: {
      type: "http", // Communication type
      url: "https://my-mcp-server.example.com", // URL of the MCP server
    },
  },
});

// Asynchronously fetch tools offered by the configured MCP server(s)
const mcpTools = await mcpConfig.getTools();

// Create an agent that can utilize these external MCP tools
const agent = new Agent({
  name: "MCP Agent",
  instructions: "Uses external model capabilities via MCP",
  model: openai("gpt-4o"),
  // Add the tools fetched from the MCP server
  tools: mcpTools,
});

// Example: Call streamText
const response = await agent.generateText("Use the external analysis tool on this data...");
console.log(response.text);
// The agent can now potentially call tools hosted on 'myModelServer'.
```

[Learn more about MCP](./mcp/mcp.md)

### Voice

**Why?** To build voice-based applications by adding speech-to-text (STT) and text-to-speech (TTS) capabilities to your agent.

Integrate with voice providers like OpenAI or ElevenLabs. Use the provider directly for STT/TTS, or configure it on the agent (`agent.voice`) and use its methods (e.g., `agent.voice.speak()`) to synthesize the agent's text response.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
// Import voice providers
import { OpenAIVoiceProvider, ElevenLabsVoiceProvider } from "@voltagent/voice";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";

// --- Using a Voice Provider directly ---

// Option 1: OpenAI Voice
const openaiVoice = new OpenAIVoiceProvider({
  apiKey: process.env.OPENAI_API_KEY,
  ttsModel: "tts-1", // Text-to-Speech model
  voice: "alloy", // Choose a voice (alloy, echo, fable, onyx, nova, shimmer)
});

// Text to Speech (TTS) -> Returns a Readable stream of audio data
const audioStream = await openaiVoice.speak("Hello from OpenAI voice!");
// Example: Pipe the audio stream to a file
await pipeline(audioStream, createWriteStream("openai_output.mp3"));

// Speech to Text (STT) -> Takes an audio source (e.g., Readable stream)
const audioFileStream = createReadStream("input.mp3");
const transcript = await openaiVoice.listen(audioFileStream);
console.log("OpenAI Transcript:", transcript);

// Option 2: ElevenLabs Voice
const elevenLabsVoice = new ElevenLabsVoiceProvider({
  apiKey: process.env.ELEVENLABS_API_KEY,
  voice: "Rachel", // Choose an ElevenLabs voice ID or name
});

// TTS with ElevenLabs
const elAudioStream = await elevenLabsVoice.speak("Hello from ElevenLabs!");
await pipeline(elAudioStream, createWriteStream("elevenlabs_output.mp3"));

// --- Integrating Voice with an Agent ---

const agent = new Agent({
  name: "Voice Assistant",
  instructions: "A helpful voice assistant",
  model: openai("gpt-4o"),
  // Assign a voice provider instance to the agent's voice property
  voice: elevenLabsVoice, // Or use openaiVoice
});

// To generate voice from an agent response:
// 1. Generate the text response using a core agent method.
const textResponse = await agent.generateText("Tell me a short story.");

// 2. Check if the agent has a voice provider configured.
if (agent.voice && textResponse.text) {
  // 3. Call the 'speak' method on the agent's voice provider instance.
  console.log("Generating voice output...");
  const agentAudioStream = await agent.voice.speak(textResponse.text);

  // Example: Save the agent's spoken response to a file
  await pipeline(agentAudioStream, createWriteStream("agent_story.mp3"));
  console.log("Generated voice output stream.");
} else {
  console.log("Agent response:", textResponse.text);
  if (!agent.voice) {
    console.log("(Agent has no voice provider configured)");
  }
}
```

[Learn more about Voice Agents](./voice.md)

## Error Handling

When interacting with agents (`generateText`, `streamText`, etc.), operations can fail due to network issues, API errors, tool execution problems, or other runtime exceptions.

**Synchronous Errors (e.g., during setup):**

Use standard JavaScript `try...catch` blocks around the agent method calls (`generateText`, `streamText`, `generateObject`, `streamObject`). This will catch errors that occur _before_ the main operation or stream begins, such as configuration issues or initial API connection failures.

```ts
const agent = new Agent({
  /* ... configuration ... */
});

try {
  // This try/catch handles errors during the initial call setup
  const response = await agent.streamText("Some complex request that might fail initially");

  // Processing the stream itself might encounter errors handled differently (see below)
  console.log("Stream processing started...");
  for await (const delta of response.fullStream) {
    // ... handle deltas ...
    process.stdout.write(delta);
  }
  // Note: If an error occurs *during* the stream, the loop might finish,
  // but the final history entry status will indicate an error.
  console.log("Interaction finished processing stream.");
} catch (error) {
  // Catches errors from the initial await agent.streamText() call
  console.error("Agent interaction failed during setup:", error);
  // Implement fallback logic, inform the user, or log the error
}
```

**Asynchronous Errors (e.g., during streaming):**

Errors that occur _during_ the streaming process (after the initial `await agent.streamText()` call succeeds) are handled internally by VoltAgent:

1.  The corresponding history entry is automatically updated with an `error` status.
2.  An error event is added to the agent's timeline.
3.  These errors **do not** typically cause the `await agent.streamText(...)` call or the `for await...of response.stream` loop itself to throw.

To observe or react to these asynchronous errors, you can:

- **Check History:** After the stream finishes (the `for await` loop completes), check the status of the corresponding `AgentHistoryEntry`.
- **Use Agent Hooks:** The existing hooks (`onStart`, `onEnd`, `onToolStart`, `onToolEnd`) can still provide valuable context for logging and debugging around the points where errors might occur, even though there isn't a specific `onError` hook.
- **Use `onError` Callback (Per-Call):** Pass an `onError` callback directly in the `provider` options when calling `streamText` (or other methods). This is the most direct way to be notified of errors _during_ the stream for a specific call.

  ```ts
  // Example with streamText
  const response = await agent.streamText("Another request", {
    provider: {
      onError: async (error) => {
        console.error("onError callback: Stream encountered an error:", error);
        // Implement specific error handling for this call
      },
    },
  });
  ```

By combining `try...catch` for initial errors and using the per-call `onError` callback or checking history for stream errors, you can effectively manage issues during agent interactions.

## Next Steps

Now that you have an overview of the `Agent` class and its core interaction methods, dive deeper into specific areas:

- Explore the dedicated documentation pages linked in each section above (Memory, Tools, Providers, etc.).
- Check out our [examples repository](https://github.com/voltagent/voltagent/tree/main/examples) for complete working applications built with VoltAgent.
