---
title: Operation Context (userContext)
slug: /agents/context
description: Pass custom data through agent operations using userContext.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Operation Context (`userContext`)

`userContext` allows you to pass custom data throughout a single agent operation. Think of it as a shared bag of information that all components (hooks, tools, retrievers, sub-agents) can access during one agent task.

## Basic Concept

Here's how `userContext` flows through an agent operation:

```
You → Agent → Hooks → Tools → Retrievers → Sub-Agents
     ↑                                              ↓
     ← ← ← ← ← userContext flows everywhere ← ← ← ← ←
```

Let's see this in action with simple examples:

## Initialize userContext

You can provide initial data in two ways:

### Method 1: Set Default Context in Constructor

You can set default `userContext` when creating the agent, which will be used for all operations unless overridden:

```typescript
import { Agent, VercelAIProvider } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Set default context at agent creation
const defaultContext = new Map();
defaultContext.set("environment", "production");
defaultContext.set("projectId", "my-project");

const agent = new Agent({
  name: "SimpleAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
  userContext: defaultContext, // Default context for all operations
});

// Uses default context automatically
const response1 = await agent.generateText("Hello!");
console.log("Environment:", response1.userContext?.get("environment")); // "production"

// Override with execution context (replaces default completely)
const response2 = await agent.generateText("Debug this", {
  userContext: new Map([
    ["environment", "development"],
    ["projectId", "my-project"],
  ]),
});
console.log("Environment:", response2.userContext?.get("environment")); // "development"
console.log("Project ID:", response2.userContext?.get("projectId")); // "my-project"
```

### Method 2: Pass Context During Execution

You can also pass `userContext` only when calling the agent:

```typescript
const agent = new Agent({
  name: "SimpleAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
});

// Pass userContext when calling the agent
const executionContext = new Map();
executionContext.set("language", "English");

const response = await agent.generateText("Hello!", {
  userContext: executionContext,
});

// Now you can access the data from the response
console.log("Language:", response.userContext?.get("language"));
```

## Hooks Access userContext

Hooks can read and write to `userContext`:

```typescript
import { createHooks } from "@voltagent/core";

const agent = new Agent({
  name: "HookAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: ({ context }) => {
      // Read data that was passed in
      const language = context.userContext.get("language");
      console.log(`Starting operation for language: ${language}`);

      // Add new data
      context.userContext.set("requestId", `req-${Date.now()}`);
      context.userContext.set("startTime", new Date().toISOString());
    },
    onEnd: ({ context }) => {
      // Read data from context
      const requestId = context.userContext.get("requestId");
      const startTime = context.userContext.get("startTime");
      console.log(`Request ${requestId} completed (started at ${startTime})`);
    },
  }),
  instructions: "You are a helpful assistant.",
});

// Usage
const context = new Map();
context.set("language", "English");

await agent.generateText("Hello!", { userContext: context });
```

## Tools Access userContext

Tools can read and write to `userContext` through their options:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const loggerTool = createTool({
  name: "log_message",
  description: "Logs a message with user context",
  parameters: z.object({
    message: z.string(),
  }),
  execute: async ({ message }, options) => {
    // Read from userContext
    const language = options?.operationContext?.userContext?.get("language");
    const requestId = options?.operationContext?.userContext?.get("requestId");

    console.log(`[${requestId}] Language ${language}: ${message}`);

    // Write to userContext
    const userContext = options?.operationContext?.userContext;
    if (userContext) {
      const logs = userContext.get("logs") || [];
      logs.push({ message, timestamp: new Date().toISOString() });
      userContext.set("logs", logs);
    }

    return `Message logged for language ${language}`;
  },
});

const agentWithTool = new Agent({
  name: "ToolAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [loggerTool],
  instructions: "Use the log_message tool to log what the user says.",
});

// Usage
const context = new Map();
context.set("language", "English");
context.set("requestId", "req-456");

const response = await agentWithTool.generateText("Log this: Hello world!", {
  userContext: context,
});

// Check what was logged
const logs = response.userContext?.get("logs");
console.log("All logs:", logs);
```

## Retrievers Store References

Retrievers can store source information in `userContext`:

```typescript
import { BaseRetriever } from "@voltagent/core";

class SimpleRetriever extends BaseRetriever {
  async retrieve(input, options) {
    // Simulate finding documents
    const foundDocs = [
      { title: "VoltAgent Guide", url: "https://docs.example.com" },
      { title: "Agent Tutorial", url: "https://tutorial.example.com" },
    ];

    // Store references in userContext
    if (options?.userContext) {
      options.userContext.set("references", foundDocs);
      options.userContext.set("searchQuery", input);
    }

    // Return content for LLM
    return foundDocs.map((doc) => `${doc.title}: Some helpful content...`).join("\n");
  }
}

const agentWithRetriever = new Agent({
  name: "RetrievalAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  retriever: new SimpleRetriever(),
  instructions: "Answer using retrieved information.",
});

// Usage
const response = await agentWithRetriever.generateText("How do I use VoltAgent?");

console.log("Answer:", response.text);
console.log("Search query:", response.userContext?.get("searchQuery"));
console.log("References:", response.userContext?.get("references"));
```

## Sub-Agents Automatically Inherit Context

When a supervisor delegates to sub-agents, the complete operation context is automatically passed, including `userContext` and conversation history:

```typescript
// Worker agent - automatically receives supervisor's context
const workerAgent = new Agent({
  name: "WorkerAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: ({ context }) => {
      // Automatically gets userContext from supervisor
      const projectId = context.userContext.get("projectId");
      const language = context.userContext.get("language");
      console.log(`Worker starting for project ${projectId}, language ${language}`);

      // Can add its own data too
      context.userContext.set("workerStartTime", new Date().toISOString());
    },
  }),
  instructions: "You are a worker that processes tasks.",
});

// Supervisor agent
const supervisorAgent = new Agent({
  name: "SupervisorAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  subAgents: [workerAgent],
  hooks: createHooks({
    onStart: ({ context }) => {
      // Set up project context
      context.userContext.set("projectId", `project-${Date.now()}`);
      context.userContext.set("supervisorId", "supervisor-001");
    },
  }),
  instructions: "You supervise tasks. Delegate work to WorkerAgent when needed.",
});

// Usage
const initialContext = new Map();
initialContext.set("language", "English");
initialContext.set("priority", "high");

const response = await supervisorAgent.generateText("Please delegate this task to the worker", {
  userContext: initialContext,
});

// Final context includes data from both supervisor and worker
console.log("Project ID:", response.userContext?.get("projectId"));
console.log("Worker start time:", response.userContext?.get("workerStartTime"));
```

### Key Benefits

- **Automatic Inheritance**: No manual context passing required
- **Shared History**: All agents contribute to the same conversation steps
- **Bidirectional Updates**: Changes made by sub-agents are visible to supervisor
- **Unified Workflow**: The entire operation appears as one cohesive process

For more details on sub-agent architecture, see the [Sub-Agents guide](./subagents.md).

## Complete Flow Example

Here's how all pieces work together:

```typescript
import { Agent, createHooks, createTool, BaseRetriever } from "@voltagent/core";
import { z } from "zod";

// Simple retriever
class BasicRetriever extends BaseRetriever {
  async retrieve(input, options) {
    if (options.userContext) {
      options.userContext.set("references", [{ title: "Document 1", source: "knowledge-base" }]);
    }
    return "Retrieved content about the topic";
  }
}

// Simple tool
const counterTool = createTool({
  name: "increment_counter",
  description: "Increments a counter",
  parameters: z.object({}),
  execute: async (_, options) => {
    const userContext = options.operationContext?.userContext;
    if (userContext) {
      const count = (userContext.get("counter") || 0) + 1;
      userContext.set("counter", count);
      return `Counter is now: ${count}`;
    }
    return "Counter incremented";
  },
});

// Agent with everything
const fullAgent = new Agent({
  name: "FullAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  retriever: new BasicRetriever(),
  tools: [counterTool],
  hooks: createHooks({
    onStart: ({ context }) => {
      console.log("🚀 Operation started");
      context.userContext.set("operationId", `op-${Date.now()}`);
    },
    onEnd: ({ context }) => {
      const opId = context.userContext.get("operationId");
      const counter = context.userContext.get("counter");
      const references = context.userContext.get("references");

      console.log("✅ Operation completed");
      console.log(`Operation ID: ${opId}`);
      console.log(`Counter final value: ${counter}`);
      console.log(`References found: ${references?.length || 0}`);
    },
  }),
  instructions: "Use tools and retrieval to help users. Always increment the counter.",
});

// Usage showing the complete flow
async function demonstrateFlow() {
  const initialContext = new Map();
  initialContext.set("language", "English");

  const response = await fullAgent.generateText(
    "Use the increment tool and search for information",
    { userContext: initialContext }
  );

  console.log("Text:", response.text);
  const finalContext = response.userContext;
  for (const [key, value] of finalContext.entries()) {
    console.log(`${String(key)}: ${JSON.stringify(value)}`);
  }
}
```

## Key Points

1. **Initialization**:
   - Set default context in constructor: `new Agent({ userContext: defaultMap })`
   - Override per call: `agent.generateText("...", { userContext: callMap })`
2. **Hooks**: Access via `context.userContext` in `onStart`/`onEnd`
3. **Tools**: Access via `options.operationContext.userContext` in `execute`
4. **Retrievers**: Access via `options.userContext` in `retrieve`
5. **Sub-Agents**: Automatically get a copy of supervisor's `userContext`
6. **Response**: Access final state via `response.userContext`
7. **Dynamic Values**: Constructor context is available in dynamic instructions, model, and tools functions

Each component can read existing data and add new data. The `userContext` travels through the entire operation, making it easy to share state and track information across all parts of your agent system.

### Context Priority

When both constructor and execution contexts are provided:

- Execution context completely replaces constructor context (no automatic merging)
- Constructor context serves as the default when no execution context is provided
- Dynamic values (instructions, model, tools) receive whichever context is active

:::tip
To extend rather than replace the default context, create a new Map from it:

```typescript
const extendedContext = new Map(defaultContext);
extendedContext.set("environment", "development"); // Override specific values
```

:::
