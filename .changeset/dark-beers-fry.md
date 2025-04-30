---
"@voltagent/core": patch
---

feat: Introduce `userContext` for passing custom data through agent operations

Introduced `userContext`, a `Map<string | symbol, unknown>` within the `OperationContext`. This allows developers to store and retrieve custom data across agent lifecycle hooks (`onStart`, `onEnd`) and tool executions for a specific agent operation (like a `generateText` call). This context is isolated per operation, providing a way to manage state specific to a single request or task.

**Usage Example:**

```typescript
import {
  Agent,
  createHooks,
  createTool,
  type OperationContext,
  type ToolExecutionContext,
} from "@voltagent/core";
import { z } from "zod";

// Define hooks that set and retrieve data
const hooks = createHooks({
  onStart: (agent: Agent<any>, context: OperationContext) => {
    // Set data needed throughout the operation and potentially by tools
    const requestId = `req-${Date.now()}`;
    const traceId = `trace-${Math.random().toString(16).substring(2, 8)}`;
    context.userContext.set("requestId", requestId);
    context.userContext.set("traceId", traceId);
    console.log(`[${agent.name}] Operation started. RequestID: ${requestId}, TraceID: ${traceId}`);
  },
  onEnd: (agent: Agent<any>, result: any, context: OperationContext) => {
    // Retrieve data at the end of the operation
    const requestId = context.userContext.get("requestId");
    const traceId = context.userContext.get("traceId"); // Can retrieve traceId here too
    console.log(`[${agent.name}] Operation finished. RequestID: ${requestId}, TraceID: ${traceId}`);
    // Use these IDs for logging, metrics, cleanup, etc.
  },
});

// Define a tool that uses the context data set in onStart
const customContextTool = createTool({
  name: "custom_context_logger",
  description: "Logs a message using trace ID from the user context.",
  parameters: z.object({
    message: z.string().describe("The message to log."),
  }),
  execute: async (params: { message: string }, options?: ToolExecutionContext) => {
    // Access userContext via options.operationContext
    const traceId = options?.operationContext?.userContext?.get("traceId") || "unknown-trace";
    const requestId = options?.operationContext?.userContext?.get("requestId") || "unknown-request"; // Can access requestId too
    const logMessage = `[RequestID: ${requestId}, TraceID: ${traceId}] Tool Log: ${params.message}`;
    console.log(logMessage);
    // In a real scenario, you might interact with external systems using these IDs
    return `Logged message with RequestID: ${requestId} and TraceID: ${traceId}`;
  },
});

// Create an agent with the tool and hooks
const agent = new Agent({
  name: "MyCombinedAgent",
  llm: myLlmProvider, // Your LLM provider instance
  model: myModel, // Your model instance
  tools: [customContextTool],
  hooks: hooks,
});

// Trigger the agent. The LLM might decide to use the tool.
await agent.generateText(
  "Log the following information using the custom logger: 'User feedback received.'"
);

// Console output will show logs from onStart, the tool (if called), and onEnd,
// demonstrating context data flow.
```
