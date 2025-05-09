---
title: Operation Context (userContext)
slug: /agents/context
description: Pass custom data through agent operations using userContext.
---

# Operation Context (`userContext`)

VoltAgent provides a powerful mechanism called `userContext` to pass custom data through the lifecycle of a single agent operation (like a `generateText` or `streamObject` call). This context is isolated to each individual _main_ agent operation, ensuring that data doesn't inadvertently leak between concurrent or subsequent requests. Importantly, `userContext` can also be intentionally propagated from a supervisor agent to its sub-agents, allowing for consistent contextual data across delegated tasks.

## What is `userContext`?

`userContext` is a property within the `OperationContext` object. `OperationContext` itself encapsulates information about a specific agent task, including its unique ID (`operationId`), the associated history entry, and event tracking details.

`userContext` is specifically a `Map<string | symbol, unknown>`.

- **Map**: It allows you to store key-value pairs.
- **Keys**: Can be strings or symbols, providing flexibility in how you identify your context data.
- **Values**: Can be of `unknown` type, meaning you can store virtually any kind of data – strings, numbers, objects, custom class instances, etc.

## Why Use `userContext`?

`userContext` solves the problem of needing to maintain and access request-specific state or data across different parts of an agent's execution flow, particularly between lifecycle hooks and tool executions.

Common use cases include:

1.  **Tracing & Logging**: Propagate unique request IDs or trace IDs generated at the start (`onStart`) into tool executions and across sub-agent operations for distributed tracing or detailed logging.
2.  **Request-Specific Configuration**: Pass configuration details relevant only to the current operation (e.g., user preferences, tenant IDs) from `onStart` to tools, and potentially to sub-agents if they require this shared configuration.
3.  **Metrics & Analytics**: Store timing information or other metrics in `onStart` and finalize/report them in `onEnd`. This can span across operations delegated to sub-agents if the metric is relevant to the entire supervised task.
4.  **Resource Management**: Store references to resources allocated in `onStart` (like database connections specific to the request) and release them in `onEnd`. For complex delegated tasks, sub-agents might also need access to these resources via the propagated `userContext`.
5.  **Passing Data Between Hooks**: Set a value in `onStart` and retrieve it in `onEnd` for the same operation.
6.  **Delegated Task Context**: When a supervisor agent delegates parts of a task to sub-agents, the `userContext` can carry overarching information (e.g., a global session ID, the original user query, or shared parameters) that all sub-agents need to perform their part of the task coherently.

### Advanced Use Case: Managing Playwright Browser Instances

Another powerful use case for `userContext` is managing stateful resources that should be isolated per operation, such as a Playwright `Browser` or `Page` instance. This avoids the complexity of passing the instance explicitly between hooks and tools.

**Scenario:** You want an agent to perform browser automation tasks using Playwright. Each agent operation should have its own isolated browser session.

1.  **Initialization (in Tools or Hooks):** Instead of initializing the browser directly in `onStart`, you can create a helper function (e.g., `ensureBrowser`) that tools call. This function checks `userContext` first. If a `Page` instance for the current `operationId` doesn't exist, it launches Playwright, creates a `Page`, and stores it in `userContext` using a unique key (like a `Symbol`).
2.  **Tool Access:** Tools needing browser access (e.g., `clickElement`, `navigateToUrl`) call the `ensureBrowser` helper, passing their `options.operationContext`. The helper retrieves the correct `Page` instance from `userContext`.
3.  **Cleanup (`onEnd` Hook):** An `onEnd` hook retrieves the `Browser` instance from `userContext` using the operation's context and calls `browser.close()` to ensure resources are released when the operation finishes.

```typescript
import {
  Agent,
  createHooks,
  createTool,
  type OnEndHookArgs,
  type OperationContext,
  type ToolExecutionContext,
} from "@voltagent/core";
import { chromium, type Browser, type Page } from "playwright";

const PAGE_KEY = Symbol("playwrightPage");
const BROWSER_KEY = Symbol("playwrightBrowser");

// Helper to get/create page within the context
async function ensurePage(context: OperationContext): Promise<Page> {
  let page = context.userContext.get(PAGE_KEY) as Page | undefined;
  if (!page || page.isClosed()) {
    console.log(`[${context.operationId}] Creating new browser/page for context...`);
    const browser = await chromium.launch();
    page = await browser.newPage();
    context.userContext.set(BROWSER_KEY, browser); // Store browser for cleanup
    context.userContext.set(PAGE_KEY, page);
  }
  return page;
}

// Hook for cleanup
const hooks = createHooks({
  onEnd: async ({ context }: OnEndHookArgs) => {
    const browser = context.userContext.get(BROWSER_KEY) as Browser | undefined;
    if (browser) {
      console.log(`[${context.operationId}] Closing browser for context...`);
      await browser.close();
    }
  },
});

// Example Tool
const navigateTool = createTool({
  name: "navigate",
  parameters: z.object({ url: z.string().url() }),
  execute: async ({ url }, options?: ToolExecutionContext) => {
    if (!options?.operationContext) throw new Error("Context required");
    const page = await ensurePage(options.operationContext); // Get page via context
    await page.goto(url);
    return `Navigated to ${url}`;
  },
});

// Agent setup (LLM/Model details omitted)
const browserAgent = new Agent({
  name: "Browser Agent",
  // ... llm, model ...
  hooks: hooks,
  tools: [navigateTool],
});

// Usage:
// await browserAgent.generateText("Navigate to https://example.com");
// await browserAgent.generateText("Navigate to https://google.com"); // Uses a *different* browser instance
```

This pattern ensures each `generateText` call gets its own clean browser environment managed via the isolated `userContext`.

For a full implementation of this pattern, see the [VoltAgent Playwright Example](https://github.com/voltagent/voltagent/tree/main/examples/with-playwright).

## How it Works

1.  **Initialization**: When an agent operation (e.g., `agent.generateText(...)`) begins, VoltAgent creates a unique `OperationContext`.
2.  **Empty Map or Propagated Context**:
    - For a new top-level operation, `userContext` within this `OperationContext` is initialized as an empty `Map`.
    - If the operation is initiated by a sub-agent that had `userContext` passed to it from a supervisor (via `PublicGenerateOptions`), the sub-agent's `OperationContext` will be initialized with a _clone_ of the supervisor's `userContext`. This ensures the sub-agent starts with the supervisor's context data but modifications within the sub-agent do not affect the supervisor's original context map.
3.  **Access via Hooks**: The `OperationContext` (including `userContext`) is passed as an argument to the `onStart` and `onEnd` agent lifecycle hooks of the current agent (be it a supervisor or a sub-agent).
4.  **Access via Tools**: The `OperationContext` is also accessible within a tool's `execute` function via the optional `options` parameter (specifically `options.operationContext`). This applies to tools executed by both supervisor and sub-agents.
5.  **Propagation to Sub-Agents**: When a supervisor agent uses a tool like `delegate_task` (typically created by `SubAgentManager`), the supervisor's current `userContext` (from its `operationContext`) is automatically included in the options passed to the sub-agent's generation method (e.g., `generateText`). The sub-agent then starts its own operation with this context, as described in point 2.
6.  **Isolation with Intentional Propagation**:
    - Each direct call to an agent's generation method (e.g., `supervisorAgent.generateText(...)`) gets its own independent `OperationContext` and, initially, an empty `userContext` (unless it's a sub-agent receiving context).
    - Data stored in one top-level operation's `userContext` is not visible to other concurrent or subsequent top-level operations.
    - However, as detailed above, a supervisor agent _can_ and _does_ intentionally pass its `userContext` (as a clone) to its sub-agents when delegating tasks. This allows sub-agents to operate with the necessary shared context while maintaining the integrity of the supervisor's original context due to the cloning mechanism.

## Usage Example

This example demonstrates how to set context data in the `onStart` hook and access it in both the `onEnd` hook and within a tool's `execute` function.

```typescript
import {
  Agent,
  createHooks,
  createTool,
  type OnStartHookArgs,
  type OnEndHookArgs,
  type OperationContext,
  type ToolExecutionContext,
} from "@voltagent/core";
import { z } from "zod";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define hooks that set and retrieve data
const hooks = createHooks({
  onStart: ({ agent, context }: OnStartHookArgs) => {
    // Set a unique request ID for this operation
    const requestId = `req-${Date.now()}`;
    context.userContext.set("requestId", requestId);
    console.log(`[${agent.name}] Operation started. RequestID: ${requestId}`);
  },
  onEnd: ({ agent, context }: OnEndHookArgs) => {
    // Retrieve the request ID at the end of the operation
    const requestId = context.userContext.get("requestId");
    console.log(`[${agent.name}] Operation finished. RequestID: ${requestId}`);
    // Use this ID for logging, metrics, cleanup, etc.
  },
});

// Define a tool that uses the context data set in onStart
const loggerTool = createTool({
  name: "context_aware_logger",
  description: "Logs a message using the request ID from context.",
  parameters: z.object({ message: z.string() }),
  execute: async (params: { message: string }, options?: ToolExecutionContext) => {
    // Access userContext via options.operationContext
    const requestId = options?.operationContext?.userContext?.get("requestId") || "unknown-request";
    const logMessage = `[RequestID: ${requestId}] Tool Log: ${params.message}`;
    console.log(logMessage);
    // In a real scenario, you might interact with external systems using this ID
    return `Logged message with RequestID: ${requestId}`;
  },
});

const agent = new Agent({
  name: "MyCombinedAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [loggerTool],
  hooks: hooks,
});

// Trigger the agent.
await agent.generateText(
  "Log the following information using the custom logger: 'User feedback received.'"
);

// Console output will show logs from onStart, the tool (if called), and onEnd,
```

## `userContext` in Sub-Agent Scenarios

The `userContext` is particularly useful in scenarios involving supervisor agents and sub-agents. A supervisor agent can establish a context that is then passed down to any sub-agents it delegates tasks to. This allows for a consistent flow of information, like a global `transactionId` or shared configuration, across the entire hierarchy of an operation.

**How Propagation Works:**

1.  **Supervisor Initiates with Context**: When a supervisor agent starts an operation (e.g., `supervisor.generateText("Delegate this work", { userContext: mySupervisorContext })`), its `userContext` is initialized.
2.  **Delegation**: If the supervisor uses a tool like `delegate_task` (managed by `SubAgentManager`), its current `operationContext.userContext` is automatically picked up.
3.  **Sub-Agent Receives Context**: This `userContext` is passed as part of the `PublicGenerateOptions` to the sub-agent's generation method (e.g., `subAgent.generateText(..., { /* other options */, userContext: supervisorContextClone })`).
4.  **Sub-Agent Initialization**: The sub-agent's `OperationContext` is then initialized with a _clone_ of the supervisor's `userContext`. This means the sub-agent gets all the data but cannot accidentally modify the supervisor's original context map.
5.  **Sub-Agent Access**: The sub-agent can access this inherited context in its own hooks (`onStart`, `onEnd`) and tools, just like a regular `userContext`.

**Example:**

Let's consider a supervisor agent that wants to pass a `sessionId` to its sub-agents.

```typescript
// Assume VercelAIProvider and openai are configured as in the previous example.

// Sub-Agent that will use the context
const subAgentTool = createTool({
  name: "sub_task_processor",
  description: "Processes a sub-task using session ID from context.",
  parameters: z.object({ task_details: z.string() }),
  execute: async (params, options?: ToolExecutionContext) => {
    const sessionId = options?.operationContext?.userContext?.get("sessionId") || "unknown-session";
    const logMessage = `[Sub-Agent Task][SessionID: ${sessionId}] Processing: ${params.task_details}`;
    console.log(logMessage);
    return `Sub-task processed with SessionID: ${sessionId}`;
  },
});

const subAgent = new Agent({
  name: "WorkerAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [subAgentTool],
  hooks: createHooks({
    onStart: ({ agent, context }) => {
      const sessionId = context.userContext.get("sessionId");
      console.log(`[${agent.name}] Operation started. Inherited SessionID: ${sessionId}`);
    },
  }),
});

// Supervisor Agent
const supervisorHooks = createHooks({
  onStart: ({ agent, context }: OnStartHookArgs) => {
    const sessionId = context.userContext.get("sessionId"); // Will be set from generateText options
    console.log(`[${agent.name}] Supervisor Operation started. SessionID: ${sessionId}`);
  },
});

const supervisorAgent = new Agent({
  name: "SupervisorAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: supervisorHooks,
  subAgents: [subAgent],
});

async function runDelegation() {
  const supervisorSessionContext = new Map<string | symbol, unknown>();
  supervisorSessionContext.set("sessionId", `session-${Date.now()}`);

  console.log("--- Starting Supervisor Operation with User Context ---");
  // The supervisor's generateText call includes the userContext.
  // If it calls delegate_task, this context will be passed to WorkerAgent.
  await supervisorAgent.generateText("Delegate processing of 'important data' to WorkerAgent.", {
    userContext: supervisorSessionContext,
  });
  console.log("--- Supervisor Operation Finished ---");
}

// runDelegation();
```

In this example:

- When `supervisorAgent.generateText` is called with `userContext` containing a `sessionId`, this context is set for the supervisor's operation.
- If the supervisor LLM decides to use the `delegate_task` tool to delegate to `WorkerAgent`, the `SubAgentManager` ensures that the `supervisorSessionContext` (as a clone) is passed to `WorkerAgent`.
- `WorkerAgent`'s `onStart` hook and its `subAgentTool` can then access this `sessionId`.

This pattern is crucial for maintaining contextual coherence when tasks are broken down and distributed across multiple specialized agents.
