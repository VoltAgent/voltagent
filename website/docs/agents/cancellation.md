---
title: Cancellation
slug: /agents/cancellation
---

# Cancellation

VoltAgent implements cancellation through the standard `AbortController` API. Pass an `AbortController` instance to agent methods to stop LLM generation, tool execution, and multi-agent workflows.

## Basic Cancellation

Create an `AbortController` and pass it to agent methods:

```typescript
import { Agent, isAbortError } from "@voltagent/core";

const agent = new Agent({
  name: "Assistant",
  instructions: "A helpful assistant",
  model: "openai/gpt-4o",
});

const abortController = new AbortController();

// Cancel after 5 seconds
setTimeout(() => {
  abortController.abort("Timeout: Operation took too long");
}, 5000);

try {
  const response = await agent.generateText("Write a detailed analysis...", {
    abortController,
  });
  console.log(response.text);
} catch (error) {
  if (isAbortError(error)) {
    console.log("Operation cancelled:", error.message);
  } else {
    throw error;
  }
}
```

## How Cancellation Works

When you provide an `AbortController` to an agent method:

1. The signal is passed to the LLM provider
2. Tools receive the `OperationContext` containing the `abortController`
3. Subagents inherit the parent's `abortController`
4. All operations check the signal state before proceeding

Cancellation propagates through the entire operation chain for clean shutdown at every level.

:::note Parameter Deprecation
The `signal` parameter is deprecated. Use `abortController` instead. The `signal` parameter will be removed in a future version.
:::

## Streaming Cancellation

Cancellation works with streaming responses:

```typescript
const abortController = new AbortController();

// User can cancel anytime
document.getElementById("stop-btn")?.addEventListener("click", () => {
  abortController.abort("User requested stop");
});

const response = await agent.streamText("Generate a long report...", {
  abortController,
});

try {
  for await (const chunk of response.textStream) {
    process.stdout.write(chunk);
  }
} catch (error) {
  if (isAbortError(error)) {
    console.log("\nStream cancelled");
  }
}
```

With `fullStream`, you receive detailed cancellation feedback:

```typescript
const response = await agent.streamText("Complex task...", {
  abortController,
});

for await (const event of response.fullStream) {
  if (event.type === "error" && isAbortError(event.error)) {
    console.log("Cancelled during:", event.context);
    break;
  }
  // Process other events
}
```

## Tool Cancellation

Tools receive the `OperationContext` as the second parameter. Access `abortController` through the context to respond to or trigger cancellation:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const dataProcessingTool = createTool({
  name: "process_data",
  description: "Process large datasets",
  parameters: z.object({
    dataset: z.string(),
    operation: z.string(),
  }),
  execute: async (args, context) => {
    const abortController = context?.abortController;
    const signal = abortController?.signal;

    // Check if already aborted
    if (signal?.aborted) {
      return { error: "Operation was already cancelled" };
    }

    // Tool can trigger abort based on conditions
    if (args.dataset === "restricted") {
      abortController?.abort("Access to restricted dataset denied");
      return { error: "Dataset access denied" };
    }

    // Pass signal to async operations
    try {
      const response = await fetch(`/api/process/${args.dataset}`, {
        method: "POST",
        body: JSON.stringify({ operation: args.operation }),
        signal,
      });

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        return { error: "Processing cancelled" };
      }
      throw error;
    }
  },
});
```

## Multi-Agent Cancellation

In supervisor-subagent architectures, the abort signal propagates to all subagents:

```typescript
const researcher = new Agent({
  name: "Researcher",
  instructions: "Research topics thoroughly",
  model: "openai/gpt-4o-mini",
});

const writer = new Agent({
  name: "Writer",
  instructions: "Write detailed content",
  model: "openai/gpt-4o-mini",
});

const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Coordinate research and writing",
  model: "openai/gpt-4o",
  subAgents: [researcher, writer],
});

const abortController = new AbortController();

// Cancel supervisor and any active subagent operations
setTimeout(() => {
  abortController.abort("Deadline reached");
}, 10000);

const response = await supervisor.streamText("Research and write about quantum computing", {
  abortController,
});
```

When the supervisor is cancelled:

- Any active `delegate_task` operations stop
- Subagents inherit the parent's `abortController`
- All tool executions within subagents are cancelled
- The entire workflow stops

## Timeout Implementation

Implement timeouts for operations:

```typescript
const abortController = new AbortController();

// Set a timeout to abort after 30 seconds
const timeoutId = setTimeout(() => {
  abortController.abort("Operation timeout - exceeded 30 seconds");
}, 30000);

try {
  const response = await agent.generateText("Complex analysis...", {
    abortController,
  });

  // Clear timeout if operation completes
  clearTimeout(timeoutId);
  console.log(response.text);
} catch (error) {
  clearTimeout(timeoutId); // Always clear the timeout

  if (isAbortError(error)) {
    console.log("Operation timed out:", error.message);
  } else {
    throw error;
  }
}
```

## Error Detection with Hooks

Agent hooks can detect and handle abort errors:

```typescript
import { createHooks, isAbortError } from "@voltagent/core";

const agent = new Agent({
  name: "Assistant",
  instructions: "A helpful assistant",
  model: "openai/gpt-4o",
  hooks: createHooks({
    onEnd: async ({ error, context }) => {
      if (isAbortError(error)) {
        // Handle abort - error.name === "AbortError"
        console.log("Operation aborted:", error.message);

        // Cleanup resources
        await cleanup(context);

        // Log metrics
        await logAbortMetrics({
          operationId: context.operationId,
          reason: error.message,
          duration: Date.now() - context.startTime,
        });
      } else if (error) {
        // Handle other errors
        console.error("Operation failed:", error);
      }
    },
  }),
});
```

## REST API Cancellation

Clients can cancel REST API requests by closing the connection:

```typescript
// Client-side cancellation
const controller = new AbortController();

const response = await fetch("http://localhost:3141/agents/my-agent/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "Generate a comprehensive report",
  }),
  signal: controller.signal,
});

// Cancel button
document.getElementById("cancel")?.addEventListener("click", () => {
  controller.abort();
});

// Process stream
const reader = response.body?.getReader();
if (reader) {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Process chunk
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Stream cancelled");
    }
  }
}
```

The server detects client disconnection and aborts the agent operation.

## Cancellation States

Operations can be in different states regarding cancellation:

```typescript
const abortController = new AbortController();

// Check if aborted
if (abortController.signal.aborted) {
  console.log("Already aborted");
}

// Listen for abort
abortController.signal.addEventListener("abort", () => {
  console.log("Just aborted:", abortController.signal.reason);
});

// Trigger abort with reason
abortController.abort("User cancelled");
```

## Implementation Patterns

### Graceful Shutdown

For individual agent operations, manually handle shutdown signals:

```typescript
async function processWithGracefulShutdown(agent: Agent, input: string) {
  const abortController = new AbortController();

  // Handle shutdown signals
  const shutdownHandler = () => {
    console.log("Shutting down...");
    abortController.abort("System shutdown");
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

  try {
    const response = await agent.generateText(input, {
      abortController,
    });
    return response.text;
  } finally {
    process.off("SIGINT", shutdownHandler);
    process.off("SIGTERM", shutdownHandler);
  }
}
```

### VoltAgent-Level Shutdown

When using the `VoltAgent` class with a server, shutdown is handled automatically:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const voltAgent = new VoltAgent({
  agents: { myAgent },
  server: honoServer({ port: 3141 }),
});

// VoltAgent automatically registers SIGINT/SIGTERM handlers
// For programmatic shutdown:
await voltAgent.shutdown(); // Stops server, workflows, and telemetry
```

VoltAgent automatically registers SIGINT/SIGTERM handlers that clean up the server, suspend workflows, and shutdown telemetry. See [Server Architecture - Graceful Shutdown](../api/server-architecture.md#graceful-shutdown) for details.

### Concurrent Operations with Cancellation

```typescript
async function processMultiple(agent: Agent, inputs: string[]) {
  const abortController = new AbortController();

  // Cancel all if any fails
  const promises = inputs.map(async (input) => {
    try {
      return await agent.generateText(input, { abortController });
    } catch (error) {
      abortController.abort("One operation failed");
      throw error;
    }
  });

  return Promise.all(promises);
}
```

## Next Steps

- Learn about [Tools](./tools.md) and how they handle cancellation
- Explore [Sub-Agents](./subagents.md) for multi-agent cancellation patterns
- See [Hooks](./hooks.md) for cancellation detection and handling
