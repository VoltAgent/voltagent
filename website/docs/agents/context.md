---
title: Operation Context (userContext)
slug: /agents/context
description: Pass custom data through agent operations using userContext.
---

# Operation Context (`userContext`)

VoltAgent provides a powerful mechanism called `userContext` to pass custom data through the lifecycle of a single agent operation (like a `generateText` or `streamObject` call). This context is isolated to each individual operation, ensuring that data doesn't leak between concurrent or subsequent requests.

## What is `userContext`?

`userContext` is a property within the `OperationContext` object. `OperationContext` itself encapsulates information about a specific agent task, including its unique ID (`operationId`), the associated history entry, and event tracking details.

`userContext` is specifically a `Map<string | symbol, unknown>`.

- **Map**: It allows you to store key-value pairs.
- **Keys**: Can be strings or symbols, providing flexibility in how you identify your context data.
- **Values**: Can be of `unknown` type, meaning you can store virtually any kind of data – strings, numbers, objects, custom class instances, etc.

## Why Use `userContext`?

`userContext` solves the problem of needing to maintain and access request-specific state or data across different parts of an agent's execution flow, particularly between lifecycle hooks and tool executions.

Common use cases include:

1.  **Tracing & Logging**: Propagate unique request IDs or trace IDs generated at the start (`onStart`) into tool executions for distributed tracing or detailed logging.
2.  **Request-Specific Configuration**: Pass configuration details relevant only to the current operation (e.g., user preferences, tenant IDs) from `onStart` to tools.
3.  **Metrics & Analytics**: Store timing information or other metrics in `onStart` and finalize/report them in `onEnd`.
4.  **Resource Management**: Store references to resources allocated in `onStart` (like database connections specific to the request) and release them in `onEnd`.
5.  **Passing Data Between Hooks**: Set a value in `onStart` and retrieve it in `onEnd` for the same operation.

### Advanced Use Case: Managing Playwright Browser Instances

Another powerful use case for `userContext` is managing stateful resources that should be isolated per operation, such as a Playwright `Browser` or `Page` instance. This avoids the complexity of passing the instance explicitly between hooks and tools.

**Scenario:** You want an agent to perform browser automation tasks using Playwright. Each agent operation should have its own isolated browser session.

1.  **Initialization (in Tools or Hooks):** Instead of initializing the browser directly in `onStart`, you can create a helper function (e.g., `ensureBrowser`) that tools call. This function checks `userContext` first. If a `Page` instance for the current `operationId` doesn't exist, it launches Playwright, creates a `Page`, and stores it in `userContext` using a unique key (like a `Symbol`).
2.  **Tool Access:** Tools needing browser access (e.g., `clickElement`, `navigateToUrl`) call the `ensureBrowser` helper, passing their `options.operationContext`. The helper retrieves the correct `Page` instance from `userContext`.
3.  **Cleanup (`onEnd` Hook):** An `onEnd` hook retrieves the `Browser` instance from `userContext` using the operation's context and calls `browser.close()` to ensure resources are released when the operation finishes.

```typescript
// Simplified Example Structure
import {
  Agent,
  createHooks,
  createTool,
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
  onEnd: async (_agent, _result, context: OperationContext) => {
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
2.  **Empty Map**: Within this context, `userContext` is initialized as an empty `Map`.
3.  **Access via Hooks**: The `OperationContext` (including `userContext`) is passed as an argument to the `onStart` and `onEnd` agent lifecycle hooks.
4.  **Access via Tools**: The `OperationContext` is also accessible within a tool's `execute` function via the optional `options` parameter (specifically `options.operationContext`).
5.  **Isolation**: Each call to an agent generation method (`generateText`, `streamText`, etc.) gets its own independent `OperationContext` and `userContext`. Data stored in one operation's `userContext` is not visible to others.

## Usage Example

This example demonstrates how to set context data in the `onStart` hook and access it in both the `onEnd` hook and within a tool's `execute` function.

```typescript
import {
  Agent,
  createHooks,
  createTool,
  type OperationContext,
  type ToolExecutionContext,
} from "@voltagent/core";
import { z } from "zod";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define hooks that set and retrieve data
const hooks = createHooks({
  onStart: (agent: Agent<any>, context: OperationContext) => {
    // Set a unique request ID for this operation
    const requestId = `req-${Date.now()}`;
    context.userContext.set("requestId", requestId);
    console.log(`[${agent.name}] Operation started. RequestID: ${requestId}`);
  },
  onEnd: (agent: Agent<any>, result: any, context: OperationContext) => {
    // Retrieve the request ID at the end of the operation
    const requestId = context.userContext.get("requestId");
    console.log(`[${agent.name}] Operation finished. RequestID: ${requestId}`);
    // Use this ID for logging, metrics, cleanup, etc.
  },
});

// Define a tool that uses the context data set in onStart
const customContextTool = createTool({
  name: "custom_context_logger",
  description: "Logs a message using the request ID from the user context.",
  parameters: z.object({
    message: z.string().describe("The message to log."),
  }),
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
  tools: [customContextTool],
  hooks: hooks,
});

// Trigger the agent.
await agent.generateText(
  "Log the following information using the custom logger: 'User feedback received.'"
);

// Console output will show logs from onStart, the tool (if called), and onEnd,
```

In this example:

1.  The `onStart` hook generates a `requestId` and stores it in `userContext`.
2.  If the LLM decides to use the `custom_context_logger` tool, the tool's `execute` function accesses the `requestId` from `userContext` via the `options.operationContext` provided to it.
3.  The `onEnd` hook retrieves the same `requestId` from the context, demonstrating that the data persisted throughout the operation's lifecycle.
