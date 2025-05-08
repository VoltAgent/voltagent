---
title: Operation Context (userContext)
slug: /agents/context
description: Pass custom data and manage state through agent operations using userContext.
---

# Operation Context (`userContext`)

VoltAgent's `userContext` provides a robust way to pass custom data and manage state throughout the lifecycle of a single agent operation (e.g., a `generateText` or `streamObject` call). This context is isolated to each operation, ensuring data integrity across concurrent or subsequent requests.

## Understanding and Initializing `userContext`

`userContext` is a property within the `OperationContext` object, which encapsulates all information about a specific agent task.

**Key Characteristics:**

- **Generic Object (`TContext`)**: `userContext` is a generic object, allowing you to define a specific TypeScript type for your context data (e.g., `type MyOperationState = { userId: string, traceId: string; }`). This provides type safety and an enhanced developer experience with IDE autocompletion.
- **Default Type**: If no specific type is provided when calling an agent's generation method, `userContext` defaults to `Record<string, any>`.
- **Initialization**: You can set an initial state for `userContext` using the `initialUserContext` option when invoking agent generation methods:

```typescript
// Define your context type
type CallContext = {
  correlationId: string;
  userId: string;
  featureFlags?: Record<string, boolean>;
};

const agent = new Agent({
  /* ... agent configuration ... */
});

const initialData: CallContext = {
  correlationId: `cid-${Date.now()}`,
  userId: "user-123",
  featureFlags: { newAnalysisLogic: true },
};

// Provide the context type and initial data to the agent's method
await agent.generateText<CallContext>("Process this request based on user profile.", {
  initialUserContext: initialData,
});
```

If `initialUserContext` is not provided, `userContext` defaults to an empty object (`{}`). Inside the agent's lifecycle (hooks, tool execution), `operationContext.userContext` will then be the initialized object.

## How `userContext` Works

1.  **Operation Start & Context Creation**: When an agent operation begins (e.g., `agent.generateText(...)`), VoltAgent creates a unique `OperationContext`.
2.  **`userContext` Initialization**: `userContext` within this `OperationContext` is initialized:
    - With the data from `initialUserContext` if provided.
    - As an empty object (`{}`) otherwise.
    - Its type is determined by the generic type argument passed to the generation method (e.g., `<CallContext>`).
3.  **Access in Hooks**: The `OperationContext` (and thus the typed `userContext`) is passed to `onStart` and `onEnd` agent lifecycle hooks. Hooks can be made generic to accept specific context types (e.g., `OnStartHookArgs<CallContext>`).
4.  **Access in Tools**: `OperationContext` (and its `userContext`) is available within a tool's `execute` function via the optional `options` parameter (as `options.operationContext`).
5.  **Isolation**: Each call to an agent's generation method receives its own independent `OperationContext` and `userContext`. Data is not shared between different operations.
6.  **Propagation in Agent Hierarchies (Supervisor-SubAgent)**:
    When using a supervisor agent that delegates tasks to sub-agents via the `delegate_task` tool:
    - The `initialUserContext` provided to the supervisor agent populates its `userContext`.
    - When `delegate_task` is invoked, the supervisor's current `userContext` is automatically packaged.
    - This (potentially merged) context is then passed as `supervisorUserContext` to `SubAgentManager.handoffTask`.
    - Finally, `handoffTask` uses this to set the `initialUserContext` for the sub-agent's operation.
    - This ensures that context like a `correlationId` or `userId` set at the supervisor level is available throughout the entire chain of delegated operations.

## Key Use Cases & Benefits

`userContext` is invaluable for:

- **Tracing & Logging**: Propagating request/trace IDs (set via `initialUserContext` or in `onStart`) for distributed tracing.
- **Request-Specific Configuration**: Passing data like user preferences, tenant IDs, or API keys (from `initialUserContext` or `onStart`) to tools.
- **Metrics & Analytics**: Aggregating metrics initiated in `onStart` (potentially using data from `initialUserContext`) and finalizing them in `onEnd`.
- **Dynamic Resource Management**: Handling resources (e.g., database connections) configured via `initialUserContext` and managed across hooks.
- **Data Flow Between Hooks**: Initializing data via `initialUserContext`, augmenting it in `onStart`, and accessing the final state in `onEnd`.

## Core Usage Example

This example demonstrates initializing `userContext` with `initialUserContext`, modifying it in an `onStart` hook, and accessing it in an `onEnd` hook and a tool.

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

// 1. Define your context type
type AppSessionContext = {
  requestId: string; // Must be provided by initialUserContext
  userId?: string; // Can be provided by initialUserContext
  processingStartTime?: number;
  toolCallCount?: number;
};

// 2. Define hooks that use the typed context
const hooks = createHooks({
  onStart: ({ agent, context }: OnStartHookArgs<AppSessionContext>) => {
    console.log(
      `[${agent.name}] Op Start. ReqID: ${context.userContext.requestId}, User: ${context.userContext.userId || "N/A"}`
    );
    context.userContext.processingStartTime = Date.now(); // Add data in the hook
    context.userContext.toolCallCount = 0; // Initialize
  },
  onEnd: ({ agent, context }: OnEndHookArgs<AppSessionContext>) => {
    const duration = Date.now() - (context.userContext.processingStartTime || Date.now());
    console.log(
      `[${agent.name}] Op End. ReqID: ${context.userContext.requestId}. Duration: ${duration}ms. Tools called: ${context.userContext.toolCallCount}`
    );
  },
});

// 3. Define a tool that accesses and modifies the context
const contextualTool = createTool({
  name: "contextual_processor",
  description: "Processes data using information from userContext.",
  parameters: z.object({ data: z.string() }),
  execute: async (params: { data: string }, options?: ToolExecutionContext) => {
    const opCtx = options?.operationContext as OperationContext<AppSessionContext> | undefined;
    const requestId = opCtx?.userContext?.requestId || "unknown";

    if (opCtx?.userContext) {
      opCtx.userContext.toolCallCount = (opCtx.userContext.toolCallCount || 0) + 1;
    }

    const logMessage = `[ReqID: ${requestId}] Tool processing: ${params.data}. Current tool calls: ${opCtx?.userContext?.toolCallCount}`;
    console.log(logMessage);
    return `Processed '${params.data}' with RequestID: ${requestId}`;
  },
});

// 4. Configure Agent
const agent = new Agent({
  name: "ContextDemoAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [contextualTool],
  hooks: hooks,
  instructions: "Use the contextual_processor tool for any data processing task.",
});

// 5. Trigger the agent with initialUserContext
async function runDemo() {
  const initialData: AppSessionContext = {
    requestId: `req-demo-${Date.now()}`,
    userId: "demo-user-007",
    // processingStartTime and toolCallCount will be set by hooks
  };

  await agent.generateText<AppSessionContext>(
    "Process the data: 'important customer feedback' using the tool.",
    { initialUserContext: initialData }
  );
}

runDemo();
```

## Advanced Scenario: Managing Playwright Instances with `userContext`

`userContext` is excellent for managing stateful, operation-isolated resources like Playwright `Browser` or `Page` instances. `initialUserContext` can pass browser configurations or user-specific details (e.g., cookies, initial URL).

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
import { z } from "zod"; // Make sure z is imported for tool parameters

// Define a context type for Playwright data
type PlaywrightSessionContext = {
  playwrightPage?: Page;
  playwrightBrowser?: Browser;
  initialUrl?: string;
  downloadsPath?: string;
};

// Helper to get/create page within the context
async function ensurePage(context: OperationContext<PlaywrightSessionContext>): Promise<Page> {
  let page = context.userContext.playwrightPage;
  if (!page || page.isClosed()) {
    console.log(`[${context.operationId}] Creating new browser/page...`);
    // Potentially use launch options from context.userContext if needed
    const browser = await chromium.launch();
    page = await browser.newPage();
    context.userContext.playwrightBrowser = browser;
    context.userContext.playwrightPage = page;

    const urlToNavigate = context.userContext.initialUrl || "about:blank";
    console.log(`[${context.operationId}] Navigating to initial URL: ${urlToNavigate}`);
    await page.goto(urlToNavigate);
  }
  return page;
}

const playwrightHooks = createHooks({
  onEnd: async ({ context }: OnEndHookArgs<PlaywrightSessionContext>) => {
    const browser = context.userContext.playwrightBrowser;
    if (browser) {
      console.log(`[${context.operationId}] Closing browser...`);
      await browser.close();
      // Clear from context to prevent re-use of closed browser reference
      context.userContext.playwrightBrowser = undefined;
      context.userContext.playwrightPage = undefined;
    }
  },
});

const navigateAndScreenshotTool = createTool({
  name: "navigate_and_screenshot",
  parameters: z.object({ url: z.string().url(), path: z.string() }),
  execute: async ({ url, path }, options?: ToolExecutionContext) => {
    if (!options?.operationContext) throw new Error("OperationContext required");
    const page = await ensurePage(
      options.operationContext as OperationContext<PlaywrightSessionContext>
    );
    await page.goto(url);
    await page.screenshot({ path });
    return `Screenshot of ${url} saved to ${path}`;
  },
});

const browserAgent = new Agent({
  name: "PlaywrightAgent",
  // ... llm, model configuration ...
  hooks: playwrightHooks,
  tools: [navigateAndScreenshotTool],
  instructions: "Use tools to interact with web pages.",
});

// Example Usage with initialUserContext:
async function runPlaywrightDemo() {
  await browserAgent.generateText<PlaywrightSessionContext>(
    "Navigate to https://example.com and take a screenshot, save it as example.png",
    { initialUserContext: { initialUrl: "about:blank", downloadsPath: "./downloads" } }
  );
}
// runPlaywrightDemo(); // Uncomment to run
```

This pattern ensures each agent operation gets its own managed browser environment. For a complete example, see the [VoltAgent Playwright Example](https://github.com/voltagent/voltagent/tree/main/examples/with-playwright).
