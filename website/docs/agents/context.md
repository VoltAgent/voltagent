---
title: Operation Context (context)
slug: /agents/context
description: Pass custom data through agent operations using context.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Operation Context (`context`)

`context` allows you to pass custom data throughout a single agent operation. Think of it as a shared bag of information that all components (hooks, tools, retrievers, sub-agents) can access during one agent task.

## Basic Concept

Here's how `context` flows through an agent operation:

```
You → Agent → Hooks → Tools → Retrievers → Sub-Agents
     ↑                                              ↓
     ← ← ← ← ← context flows everywhere ← ← ← ← ←
```

Let's see this in action with simple examples:

## Initialize context

You can provide initial data in two ways:

### Method 1: Set Default Context in Constructor

You can set default `context` when creating the agent, which will be used for all operations unless overridden:

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Set default context at agent creation
const defaultContext = new Map();
defaultContext.set("environment", "production");
defaultContext.set("projectId", "my-project");

const agent = new Agent({
  name: "SimpleAgent",
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
  context: defaultContext, // Default context for all operations
});

// Uses default context automatically
const response1 = await agent.generateText("Hello!");
console.log("Environment:", response1.context?.get("environment")); // "production"

// Override with execution context (replaces default completely)
const response2 = await agent.generateText("Debug this", {
  context: new Map([
    ["environment", "development"],
    ["projectId", "my-project"],
  ]),
});
console.log("Environment:", response2.context?.get("environment")); // "development"
console.log("Project ID:", response2.context?.get("projectId")); // "my-project"
```

### Method 2: Pass Context During Execution

You can also pass `context` only when calling the agent:

```typescript
const agent = new Agent({
  name: "SimpleAgent",
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
});

// Pass context when calling the agent
const executionContext = new Map();
executionContext.set("language", "English");

const response = await agent.generateText("Hello!", {
  context: executionContext,
});

// Now you can access the data from the response
console.log("Language:", response.context?.get("language"));
```

## Hooks Access context

Hooks can read and write to `context`:

```typescript
import { createHooks } from "@voltagent/core";

const agent = new Agent({
  name: "HookAgent",
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: (context) => {
      // Read data that was passed in
      const language = context.context.get("language");
      console.log(`Starting operation for language: ${language}`);

      // Add new data
      context.context.set("requestId", `req-${Date.now()}`);
      context.context.set("startTime", new Date().toISOString());
    },
    onEnd: (context) => {
      // Read data from context
      const requestId = context.context.get("requestId");
      const startTime = context.context.get("startTime");
      console.log(`Request ${requestId} completed (started at ${startTime})`);
    },
  }),
  instructions: "You are a helpful assistant.",
});

// Usage
const context = new Map();
context.set("language", "English");

await agent.generateText("Hello!", { context });
```

## Tools Access context

Tools can read and write to `context` through their options:

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
    // Read from context
    const language = options?.operationContext?.context?.get("language");
    const requestId = options?.operationContext?.context?.get("requestId");

    console.log(`[${requestId}] Language ${language}: ${message}`);

    // Write to context
    const ctx = options?.operationContext?.context;
    if (ctx) {
      const logs = ctx.get("logs") || [];
      logs.push({ message, timestamp: new Date().toISOString() });
      ctx.set("logs", logs);
    }

    return `Message logged for language ${language}`;
  },
});

const agentWithTool = new Agent({
  name: "ToolAgent",
  model: openai("gpt-4o"),
  tools: [loggerTool],
  instructions: "Use the log_message tool to log what the user says.",
});

// Usage
const context = new Map();
context.set("language", "English");
context.set("requestId", "req-456");

const response = await agentWithTool.generateText("Log this: Hello world!", {
  context,
});

// Check what was logged
const logs = response.context?.get("logs");
console.log("All logs:", logs);
```

## Access Input and Output in Context

The `OperationContext` provides access to both the input and output of the current operation, making debugging and observability much easier.

### Accessing Input

The `input` field contains the original input provided to the agent operation:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const logTool = createTool({
  name: "log_input",
  description: "Logs the original user input",
  parameters: z.object({}),
  execute: async (args, options) => {
    const input = options?.operationContext?.input;
    console.log("Original input:", input);
    // input can be: string, UIMessage[], or BaseMessage[]

    return "Input logged successfully";
  },
});
```

### Accessing Output

The `output` field contains the generated response (only available after generation completes, mainly useful in hooks):

```typescript
import { createHooks } from "@voltagent/core";

const hooks = createHooks({
  onEnd: async ({ context }) => {
    // Access both input and output
    console.log("User asked:", context.input);
    console.log("Agent responded:", context.output);

    // Output type depends on the method used:
    // - generateText/streamText: string
    // - generateObject/streamObject: object

    // Log complete interaction
    const interaction = {
      input: context.input,
      output: context.output,
      userId: context.userId,
      conversationId: context.conversationId,
      operationId: context.operationId,
    };

    console.log("Complete interaction:", interaction);
  },
});
```

### Use Cases

The `input` and `output` fields are particularly useful for:

- **Audit Logging**: Track what users asked and what the agent responded
- **Analytics**: Analyze input/output patterns across conversations
- **Debugging**: Trace issues by comparing input to output
- **Quality Assurance**: Monitor agent responses for quality control
- **Custom Metrics**: Calculate response time, token efficiency, etc.

```typescript
import { Agent, createHooks } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const auditHooks = createHooks({
  onEnd: async ({ context, output }) => {
    // Log complete audit trail
    await auditLog.save({
      timestamp: context.startTime,
      operationId: context.operationId,
      userId: context.userId,
      conversationId: context.conversationId,
      input: context.input,
      output: context.output,
      usage: output?.usage,
    });
  },
});

const auditedAgent = new Agent({
  name: "Audited Assistant",
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant.",
  hooks: auditHooks,
});
```

## Retrievers Store References

Retrievers can store source information in `context`:

```typescript
import { BaseRetriever } from "@voltagent/core";

class SimpleRetriever extends BaseRetriever {
  async retrieve(input, options) {
    // Simulate finding documents
    const foundDocs = [
      { title: "VoltAgent Guide", url: "https://docs.example.com" },
      { title: "Agent Tutorial", url: "https://tutorial.example.com" },
    ];

    // Store references in context
    if (options?.context) {
      options.context.set("references", foundDocs);
      options.context.set("searchQuery", input);
    }

    // Return content for LLM
    return foundDocs.map((doc) => `${doc.title}: Some helpful content...`).join("\n");
  }
}

const agentWithRetriever = new Agent({
  name: "RetrievalAgent",
  model: openai("gpt-4o"),
  retriever: new SimpleRetriever(),
  instructions: "Answer using retrieved information.",
});

// Usage
const response = await agentWithRetriever.generateText("How do I use VoltAgent?");

console.log("Answer:", response.text);
console.log("Search query:", response.context?.get("searchQuery"));
console.log("References:", response.context?.get("references"));
```

## Sub-Agents Automatically Inherit Context

When a supervisor delegates to sub-agents, the complete operation context is automatically passed, including `context` and conversation history:

```typescript
// Worker agent - automatically receives supervisor's context
const workerAgent = new Agent({
  name: "WorkerAgent",
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: (context) => {
      // Automatically gets context from supervisor
      const projectId = context.context.get("projectId");
      const language = context.context.get("language");
      console.log(`Worker starting for project ${projectId}, language ${language}`);

      // Can add its own data too
      context.context.set("workerStartTime", new Date().toISOString());
    },
  }),
  instructions: "You are a worker that processes tasks.",
});

// Supervisor agent
const supervisorAgent = new Agent({
  name: "SupervisorAgent",
  model: openai("gpt-4o"),
  subAgents: [workerAgent],
  hooks: createHooks({
    onStart: (context) => {
      // Set up project context
      context.context.set("projectId", `project-${Date.now()}`);
      context.context.set("supervisorId", "supervisor-001");
    },
  }),
  instructions: "You supervise tasks. Delegate work to WorkerAgent when needed.",
});

// Usage
const initialContext = new Map();
initialContext.set("language", "English");
initialContext.set("priority", "high");

const response = await supervisorAgent.generateText("Please delegate this task to the worker", {
  context: initialContext,
});

// Final context includes data from both supervisor and worker
console.log("Project ID:", response.context?.get("projectId"));
console.log("Worker start time:", response.context?.get("workerStartTime"));
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
    if (options.context) {
      options.context.set("references", [{ title: "Document 1", source: "knowledge-base" }]);
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
    const ctx = options.operationContext?.context;
    if (ctx) {
      const count = (ctx.get("counter") || 0) + 1;
      ctx.set("counter", count);
      return `Counter is now: ${count}`;
    }
    return "Counter incremented";
  },
});

// Agent with everything
const fullAgent = new Agent({
  name: "FullAgent",
  model: openai("gpt-4o"),
  retriever: new BasicRetriever(),
  tools: [counterTool],
  hooks: createHooks({
    onStart: (context) => {
      console.log("🚀 Operation started");
      context.context.set("operationId", `op-${Date.now()}`);
    },
    onEnd: (context) => {
      const opId = context.context.get("operationId");
      const counter = context.context.get("counter");
      const references = context.context.get("references");

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
    { context: initialContext }
  );

  console.log("Text:", response.text);
  const finalContext = response.context;
  for (const [key, value] of finalContext.entries()) {
    console.log(`${String(key)}: ${JSON.stringify(value)}`);
  }
}
```

## Key Points

1. **Initialization**:
   - Set default context in constructor: `new Agent({ context: defaultMap })`
   - Override per call: `agent.generateText("...", { context: callMap })`
2. **Hooks**: Access via `context.context` in `onStart`/`onEnd`
3. **Tools**: Access via `options.operationContext.context` in `execute`
4. **Retrievers**: Access via `options.context` in `retrieve`
5. **Sub-Agents**: Automatically get a copy of supervisor's `context`
6. **Response**: Access final state via `response.context`
7. **Dynamic Values**: Constructor context is available in dynamic instructions, model, and tools functions

Each component can read existing data and add new data. The `context` travels through the entire operation, making it easy to share state and track information across all parts of your agent system.

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
