---
title: Operation Context (context)
slug: /agents/context
description: Pass custom data through agent operations using context.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Operation Context (`context`)

The `context` field in `OperationContext` is a Map that passes custom data throughout a single agent operation. All components (hooks, tools, retrievers, sub-agents) can read and write to this shared data structure during execution.

## Basic Concept

Here's how `context` flows through an agent operation:

```
You → Agent → Hooks → Tools → Retrievers → Memory → Sub-Agents
     ↑                                                        ↓
     ← ← ← ← ← ← context flows everywhere ← ← ← ← ← ← ← ← ←
```

## Initialize context

You can provide initial data in two ways:

### Method 1: Set Default Context in Constructor

Set default `context` when creating the agent. This context is used for all operations unless overridden at execution time:

```typescript
import { Agent } from "@voltagent/core";

// Set default context at agent creation
const defaultContext = new Map();
defaultContext.set("environment", "production");
defaultContext.set("projectId", "my-project");

const agent = new Agent({
  name: "SimpleAgent",
  model: "openai/gpt-4o",
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

Pass `context` when calling the agent to provide operation-specific data:

```typescript
const agent = new Agent({
  name: "SimpleAgent",
  model: "openai/gpt-4o",
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

## Sending User Information

You can pass user information to the agent using the `context`. This information is automatically picked up by the tracing system and associated with the trace.

Supported fields:

- `user.name`: User's full name
- `user.email`: User's email address
- `user.avatar`: User's avatar URL (optional, falls back to Gravatar using email if not provided)
- `user.metadata`: Additional metadata object

<Tabs>
  <TabItem value="sdk" label="SDK" default>

When using the SDK, pass user information in the `context` Map:

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({ ... });

const context = new Map();
context.set("user.name", "John Doe");
context.set("user.email", "john@example.com");
context.set("user.avatar", "https://example.com/avatar.jpg");
context.set("user.metadata", { plan: "pro" });

await agent.generateText("Hello", { userId: "user_123", context });
```

  </TabItem>
  <TabItem value="api" label="REST API">

When using the REST API, you can pass user information in the `context` object. You can use either a nested `user` object or flat keys.

**Option 1: Nested User Object**

```json
{
  "prompt": "Hello",
  "userId": "user_123",
  "context": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "metadata": { "plan": "pro" }
    }
  }
}
```

**Option 2: Flat Keys**

```json
{
  "prompt": "Hello",
  "userId": "user_123",
  "context": {
    "user.name": "John Doe",
    "user.email": "john@example.com",
    "user.avatar": "https://example.com/avatar.jpg",
    "user.metadata": { "plan": "pro" }
  }
}
```

  </TabItem>
</Tabs>

## Hooks Access context

Hooks can read and write to `context`:

```typescript
import { createHooks } from "@voltagent/core";

const agent = new Agent({
  name: "HookAgent",
  model: "openai/gpt-4o",
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

## Tools Access Context

Tools receive the full operation context through the second parameter (`options`), which includes all `OperationContext` fields directly accessible:

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
    // Access user-defined context directly
    const language = options?.context?.get("language");
    const requestId = options?.context?.get("requestId");

    // Access operation metadata
    const userId = options?.userId;
    const operationId = options?.operationId;

    // Use the operation-scoped logger
    options?.logger?.info(`[${requestId}] User ${userId}: ${message}`);

    console.log(`[${requestId}] Language ${language}: ${message}`);

    // Write to context
    const ctx = options?.context;
    if (ctx) {
      const logs = ctx.get("logs") || [];
      logs.push({
        message,
        timestamp: new Date().toISOString(),
        userId,
        operationId,
      });
      ctx.set("logs", logs);
    }

    return `Message logged for language ${language}`;
  },
});

const agentWithTool = new Agent({
  name: "ToolAgent",
  model: "openai/gpt-4o",
  tools: [loggerTool],
  instructions: "Use the log_message tool to log what the user says.",
});

// Usage
const context = new Map();
context.set("language", "English");
context.set("requestId", "req-456");

const response = await agentWithTool.generateText("Log this: Hello world!", {
  context,
  userId: "user123",
});

// Check what was logged
const logs = response.context?.get("logs");
console.log("All logs:", logs);
```

### What's Available in Tool Options?

The `options` parameter in tool `execute` functions combines `ToolExecuteOptions` and `Partial<OperationContext>`:

**From OperationContext:**

- `operationId` - Unique operation identifier
- `userId` - User identifier (if provided)
- `conversationId` - Conversation identifier (if provided)
- `workspace` - Workspace instance configured on the agent (if available)
- `context` - User-defined context Map (read/write)
- `systemContext` - Internal system context Map
- `logger` - Operation-scoped logger with full context
- `abortController` - For operation cancellation
- `traceContext` - OpenTelemetry trace context
- `input` - Original input to the agent
- `isActive` - Whether operation is still active

**Tool-specific context (from `toolContext?` - optional):**

> **Note:** `toolContext` is always populated when your tool is called from a VoltAgent agent. It may be `undefined` when called externally.

- `toolContext?.name` - Name of the tool being executed
- `toolContext?.callId` - Unique identifier for this tool call (from AI SDK)
- `toolContext?.messages` - Message history at tool call time (from AI SDK)
- `toolContext?.abortSignal` - Abort signal for cancellation (from AI SDK)

```typescript
// Example: Authorization check using context
const sensitiveDataTool = createTool({
  name: "get_sensitive_data",
  description: "Retrieves sensitive user data",
  parameters: z.object({
    dataType: z.string(),
  }),
  execute: async ({ dataType }, options) => {
    // Check user role from context
    const userRole = options?.context?.get("userRole");

    if (userRole !== "admin") {
      throw new Error("Unauthorized: Admin role required");
    }

    // Log access with full context including tool name
    const toolName = options?.toolContext?.name;
    options?.logger?.warn(`${toolName}: Sensitive data accessed: ${dataType}`, {
      userId: options?.userId,
      operationId: options?.operationId,
    });

    return await fetchSensitiveData(dataType);
  },
});
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
  model: "openai/gpt-4o",
  instructions: "You are a helpful assistant.",
  hooks: auditHooks,
});
```

## OperationContext Properties

The `OperationContext` type (defined in [types.ts](https://github.com/VoltAgent/voltagent/blob/main/packages/core/src/agent/types.ts)) contains multiple properties beyond the user-managed `context` Map. Understanding these properties helps with debugging, observability, and advanced use cases.

### User-Managed Fields

These fields are set by you and used to identify and track operations:

```typescript
interface OperationContext {
  // User data storage - read and write custom values
  readonly context: Map<string | symbol, unknown>;

  // Optional user identifier
  userId?: string;

  // Optional conversation identifier
  conversationId?: string;

  // Workspace configured on the agent (if any)
  workspace?: Workspace;
}
```

**Usage example:**

```typescript
const response = await agent.generateText("Hello", {
  userId: "user-123",
  conversationId: "conv-456",
  context: new Map([["language", "en"]]),
});

// Access in hooks or tools
console.log(operationContext.userId); // "user-123"
console.log(operationContext.conversationId); // "conv-456"
console.log(operationContext.context.get("language")); // "en"
console.log(operationContext.workspace?.id); // e.g. "demo-workspace"
```

### Operation Metadata (Read-Only)

These fields are automatically set by the framework and provide metadata about the current operation:

```typescript
interface OperationContext {
  // Unique identifier for this operation
  readonly operationId: string;

  // When the operation started
  startTime: Date;

  // Whether the operation is still active
  isActive: boolean;

  // Parent agent ID if this is a sub-agent execution
  parentAgentId?: string;
}
```

**Usage example:**

```typescript
const agent = new Agent({
  name: "TrackedAgent",
  model: "openai/gpt-4o",
  hooks: createHooks({
    onEnd: async ({ context }) => {
      const duration = Date.now() - context.startTime.getTime();
      console.log(`Operation ${context.operationId} took ${duration}ms`);

      if (context.parentAgentId) {
        console.log(`Executed as sub-agent of ${context.parentAgentId}`);
      }
    },
  }),
  instructions: "You are a helpful assistant.",
});
```

### System Fields (Advanced)

These fields are used internally by the framework. Most users don't need to interact with them directly:

```typescript
interface OperationContext {
  // Internal state management (used by framework)
  readonly systemContext: Map<string | symbol, unknown>;

  // Scoped logger with operation context
  logger: Logger;

  // OpenTelemetry span management
  traceContext: AgentTraceContext;

  // Full conversation history including tool calls
  conversationSteps?: StepWithContent[];

  // Cancellation control
  abortController: AbortController;

  // Error to throw when operation is aborted
  cancellationError?: CancellationError;

  // Bridge for requesting user input (human-in-the-loop)
  elicitation?: (request: unknown) => Promise<unknown>;
}
```

**System Context vs User Context:**

- **`context`**: Your data - use this for sharing information between components
- **`systemContext`**: Framework internals - stores stream writers, internal state, etc.

The framework uses `systemContext` to pass internal state between components. For example, when a sub-agent streams data, the parent agent's stream writer is stored in `systemContext` (see [subagent/index.ts:145-148](https://github.com/VoltAgent/voltagent/blob/main/packages/core/src/agent/subagent/index.ts#L145-L148)).

### Input/Output (Automatically Set)

These fields capture the operation's input and output:

```typescript
interface OperationContext {
  // Original input provided to the agent
  input?: string | UIMessage[] | BaseMessage[];

  // Generated response (text or object)
  output?: string | object;
}
```

These fields are documented in detail in the "Access Input and Output in Context" section below.

### Operation Lifecycle Example

Here's how to use metadata fields for observability:

```typescript
import { Agent, createHooks } from "@voltagent/core";

const observableAgent = new Agent({
  name: "ObservableAgent",
  model: "openai/gpt-4o",
  hooks: createHooks({
    onStart: ({ context }) => {
      // Use the scoped logger
      context.logger.info("Operation started", {
        operationId: context.operationId,
        userId: context.userId,
        conversationId: context.conversationId,
      });

      // Store start metrics
      context.context.set("metrics", {
        startTime: context.startTime,
        operationId: context.operationId,
      });
    },
    onEnd: ({ context, output }) => {
      const metrics = context.context.get("metrics") as any;
      const duration = Date.now() - context.startTime.getTime();

      context.logger.info("Operation completed", {
        operationId: context.operationId,
        duration,
        inputType: typeof context.input,
        outputType: typeof context.output,
        isActive: context.isActive,
      });
    },
  }),
  instructions: "You are a helpful assistant.",
});

// The logger automatically includes userId, conversationId, and operationId
const response = await observableAgent.generateText("Hello", {
  userId: "user-123",
  conversationId: "conv-456",
});
```

### Cancellation with AbortController

The `abortController` field allows operation cancellation:

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "CancellableAgent",
  model: "openai/gpt-4o",
  instructions: "You are a helpful assistant.",
});

// Create an abort controller
const abortController = new AbortController();

// Pass the signal to the agent
const responsePromise = agent.generateText("Write a long story", {
  abortSignal: abortController.signal,
});

// Cancel after 1 second
setTimeout(() => {
  abortController.abort("User cancelled");
}, 1000);

try {
  const response = await responsePromise;
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Operation was cancelled");
  }
}
```

The agent creates an internal `AbortController` and cascades the external signal to it (see [agent.ts:3385-3395](https://github.com/VoltAgent/voltagent/blob/main/packages/core/src/agent/agent.ts#L3385-L3395)). Sub-agents automatically inherit the parent's abort controller.

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
  model: "openai/gpt-4o",
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

When a supervisor delegates to sub-agents, the parent's `OperationContext` is passed down. The sub-agent receives the same `context` Map reference (not a copy), so modifications are visible to both parent and sub-agent.

```typescript
// Worker agent - automatically receives supervisor's context
const workerAgent = new Agent({
  name: "WorkerAgent",
  model: "openai/gpt-4o",
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
  model: "openai/gpt-4o",
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

### Context Inheritance Priority

When creating an `OperationContext`, the framework follows this priority (see [agent.ts:3343-3371](https://github.com/VoltAgent/voltagent/blob/main/packages/core/src/agent/agent.ts#L3343-L3371)):

1. **Parent context** (if sub-agent): Use parent's context Map reference
2. **Runtime context** (if provided at execution): Use the provided Map
3. **Agent-level context** (if set in constructor): Use the agent's default Map
4. **New Map**: Create an empty Map if none exists

The framework then fills in missing keys from lower-priority sources without overriding existing values. This means:

- Sub-agents see all parent context data
- Parent's values take precedence over runtime and agent-level defaults
- Runtime values take precedence over agent-level defaults

**Important**: The context Map reference is preserved, not cloned. This enables bidirectional updates - changes made by sub-agents are visible to the parent.

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
    const ctx = options?.context;
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
  model: "openai/gpt-4o",
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

### Context Access by Component

1. **Hooks**: Access via `context.context` in `onStart`/`onEnd` callbacks
2. **Tools**: Access via `options.operationContext.context` in `execute` function
3. **Retrievers**: Access via `options.context` in `retrieve` method
4. **Sub-Agents**: Automatically receive parent's `context` Map reference
5. **Response**: Access final state via `response.context`
6. **Dynamic Values**: Constructor context is available in dynamic instructions, model, and tools functions

### OperationContext Fields

The `OperationContext` contains:

- **User-managed**: `context` (Map), `userId`, `conversationId`, `workspace`
- **Metadata**: `operationId`, `startTime`, `isActive`, `parentAgentId`
- **System**: `systemContext`, `logger`, `traceContext`, `conversationSteps`, `abortController`, `cancellationError`, `elicitation`
- **Input/Output**: `input`, `output` (automatically set)

### Context Initialization Priority

1. Parent context (for sub-agents) - highest priority
2. Runtime context (execution parameter)
3. Agent-level context (constructor)
4. New empty Map - lowest priority

Lower-priority sources only fill in missing keys; they don't override existing values. The Map reference is preserved (not cloned) to enable bidirectional updates between parent and sub-agents.

### Tips

**Extend rather than replace default context:**

```typescript
const agent = new Agent({
  context: new Map([["env", "production"]]),
  // ...
});

// Extend the default context
const extendedContext = new Map(agent.context);
extendedContext.set("requestId", "req-123");

await agent.generateText("Hello", { context: extendedContext });
```

**Use metadata fields for observability:**

```typescript
hooks: createHooks({
  onEnd: ({ context }) => {
    console.log(
      `Operation ${context.operationId} completed in ${Date.now() - context.startTime.getTime()}ms`
    );
  },
});
```

## Memory Adapters

Custom memory adapters can access `OperationContext` to implement cross-cutting concerns like multi-tenancy, logging, and access control without modifying core adapter logic.

### Example: Multi-Tenant Data Isolation

Custom memory adapters can read user-provided context to implement tenant-scoped data access:

```typescript
import { InMemoryStorageAdapter } from "@voltagent/core";
import type { OperationContext, GetMessagesOptions, UIMessage } from "@voltagent/core/agent";

class TenantMemoryAdapter extends InMemoryStorageAdapter {
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    context?: OperationContext
  ): Promise<UIMessage[]> {
    // Read tenant ID from user-provided context
    const tenantId = context?.context.get("tenantId") as string;

    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    // Create tenant-scoped user ID
    const scopedUserId = `${tenantId}:${userId}`;

    // Log access for audit trail
    context?.logger.info("Tenant memory access", {
      tenantId,
      userId,
      scopedUserId,
      traceId: context.traceContext.getTraceId(),
    });

    // Use scoped user ID to isolate tenant data
    return super.getMessages(scopedUserId, conversationId, options, context);
  }
}

// Use the adapter
const agent = new Agent({
  memory: new Memory({ storage: new TenantMemoryAdapter() }),
});

// Tenant A: user-123's data
await agent.generateText("Show my history", {
  userId: "user-123",
  context: new Map([["tenantId", "company-abc"]]), // Stores as "company-abc:user-123"
});

// Tenant B: same user ID, but different tenant = different data
await agent.generateText("Show my history", {
  userId: "user-123",
  context: new Map([["tenantId", "company-xyz"]]), // Stores as "company-xyz:user-123"
});
```

**What this enables:**

- **Data isolation** between tenants using composite keys
- **Per-request tenant context** without adapter reconfiguration
- **Audit logging** with full operation context
- **Flexible access control** based on runtime values

All memory adapters (InMemory, Postgres, LibSQL, Supabase) support `OperationContext` as an optional parameter.
