---
title: Operation Context (userContext)
slug: /agents/context
description: Pass custom data through agent operations using userContext.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Operation Context (`userContext`)

`userContext` allows you to pass custom data throughout a single agent operation. Think of it as a temporary, isolated bag of information specific to one task your agent is performing. It becomes especially powerful when coordinating tasks between supervisor and sub-agents.

**Quick Examples: Initializing `userContext`**

There are two primary ways to initialize or populate `userContext` for an operation:

<Tabs groupId="usercontext-initialization">
  <TabItem value="hooks" label="Managed by Hooks">

```typescript
// Filename: agentHooksContext.ts
import {
  Agent,
  createHooks,
  VercelAIProvider,
  type OnStartHookArgs,
  type OnEndHookArgs,
} from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Agent populates userContext internally via hooks
const agentManagingInternally = new Agent({
  name: "InternalContextAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: ({ agent, context }: OnStartHookArgs) => {
      const operationSpecificId = `op-${agent.name}-${Date.now()}`;
      context.userContext.set("internalOpId", operationSpecificId);
      console.log(
        `[${agent.name}] HOOK: Operation started. OpID set internally: ${operationSpecificId}`
      );
    },
    onEnd: ({ agent, context }: OnEndHookArgs) => {
      const opId = context.userContext.get("internalOpId");
      console.log(`[${agent.name}] HOOK: Operation ended. Retrieved internal OpID: ${opId}`);
    },
  }),
});

async function runInternalContextTask() {
  console.log("\n--- Running Task: Context Managed by Hooks ---");
  await agentManagingInternally.generateText("Tell me a story about a brave otter.");
}
// runInternalContextTask();
```

In this approach, the `userContext` starts empty for the operation, and hooks (like `onStart`) are responsible for populating it with relevant data.

  </TabItem>
  <TabItem value="options" label="Passed via Options">

```typescript
// Filename: agentOptionsContext.ts
import {
  Agent,
  createHooks,
  VercelAIProvider,
  type OnStartHookArgs,
  type OnEndHookArgs,
} from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Agent receives userContext via generateText options
const agentReceivingContext = new Agent({
  name: "OptionsContextAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: ({ agent, context }: OnStartHookArgs) => {
      // Reads data passed in via options
      const externalTraceId = context.userContext.get("traceId");
      console.log(
        `[${agent.name}] HOOK: Operation started. Received traceId from options: ${externalTraceId}`
      );
      // Can also add more context if needed
      context.userContext.set("hookProcessed", true);
    },
    onEnd: ({ agent, context }: OnEndHookArgs) => {
      const externalTraceId = context.userContext.get("traceId");
      const processed = context.userContext.get("hookProcessed");
      console.log(
        `[${agent.name}] HOOK: Operation ended. TraceId: ${externalTraceId}, Processed by hook: ${processed}`
      );
    },
  }),
});

async function runOptionsContextTask() {
  console.log("\n--- Running Task: Context Passed via Options ---");
  const initialContext = new Map<string | symbol, unknown>();
  initialContext.set("traceId", `trace-${Date.now()}`);
  initialContext.set("userId", "user123");

  await agentReceivingContext.generateText("Analyze this user feedback.", {
    userContext: initialContext,
  });
}
// runOptionsContextTask();
```

Here, you provide an initial `userContext` map directly when calling the agent's generation method. The agent's `OperationContext` is then initialized with a _clone_ of this map. Hooks and tools can then access and potentially add to this context.

  </TabItem>
</Tabs>

## Key Concepts & Usage

`userContext` is a `Map<string | symbol, unknown>` within an `OperationContext`. It lets you store and retrieve data relevant to the current agent task.

**When to Use `userContext`:**

- **Carry Request-Specific Data:** Pass unique IDs (trace, session, request IDs) or configurations that apply only to the current operation.
  - _Example:_ Set a `correlationId` in `onStart` and use it in tools for logging.
- **Share State Between Hooks & Tools:** Data set by an `onStart` hook can be read by tools called during that operation, or by the `onEnd` hook.
  - _Example:_ The "Quick Example" above shows setting an ID in `onStart` and reading it in `onEnd`.
- **Coordinate Supervisor & Sub-Agents:** A supervisor agent can pass down common information (like a `globalSessionId`) to sub-agents.
  - _Example:_ See the "`userContext` in Sub-Agent Scenarios" section below.
- **Manage Operation-Scoped Resources:** Handle resources like a Playwright page that should live only for the duration of one operation.
  - _Example:_ See the "Advanced Use Case: Managing Playwright Browser Instances" section.

**Core Principles (How to Think About It):**

1.  **Accessibility:**
    - In **Hooks** (`onStart`, `onEnd`): Access via `context.userContext`.
    - In **Tools** (`execute` function): Access via `options.operationContext.userContext`.
2.  **Initialization & Propagation:**
    - For a new top-level agent operation, `userContext` starts empty.
    - If an agent call includes `userContext` in its options (e.g., `agent.generateText("...", { userContext: myDataMap })`), the operation starts with a clone of `myDataMap`.
    - When a **supervisor agent delegates to a sub-agent** (e.g., via `delegate_task`), the supervisor's current `userContext` is automatically cloned and passed to the sub-agent. The sub-agent's operation then begins with this inherited context.
3.  **Isolation:**
    - Each top-level agent operation (e.g., two separate calls to `agent.generateText(...)`) has its own completely independent `userContext`.
    - When context is passed to a sub-agent, it's a _clone_. Modifications by the sub-agent don't affect the supervisor's original `userContext` or other sub-agents.

### Advanced Use Case: Managing Playwright Browser Instances

Another powerful illustration of `userContext` is managing operation-scoped resources, like a Playwright `Browser` or `Page` instance. This avoids manually passing instances between hooks and tools.

**Scenario:** An agent needs to perform browser automation. Each agent operation (e.g., a `generateText` call) requires its own isolated browser session.

1.  **Lazy Initialization & Context Storage:** A helper function (e.g., `ensurePage`) checks `userContext` for an existing `Page`. If not found (or closed), it launches Playwright, creates a new `Page`, and stores both the `Page` and `Browser` instances in `userContext` using unique symbols as keys.
2.  **Tool Access:** Tools needing browser access call this helper, passing their `operationContext`. The helper ensures they get the correct `Page` instance for the current operation from `userContext`.
3.  **Scoped Cleanup via `onEnd` Hook:** An `onEnd` hook retrieves the `Browser` instance from the operation's `userContext` and closes it, ensuring resources are released when the specific operation concludes.

```typescript
import {
  Agent,
  createHooks,
  createTool,
  type OnEndHookArgs,
  type OperationContext,
  type ToolExecutionContext,
} from "@voltagent/core";
import { z } from "zod"; // Make sure z is imported if not already
import { chromium, type Browser, type Page } from "playwright";
// Assume VercelAIProvider and openai are configured as in the first example

const PAGE_KEY = Symbol("playwrightPage");
const BROWSER_KEY = Symbol("playwrightBrowser");

async function ensurePage(context: OperationContext): Promise<Page> {
  let page = context.userContext.get(PAGE_KEY) as Page | undefined;
  if (!page || page.isClosed()) {
    console.log(`[${context.operationId}] LAZY: Creating new browser/page for operation...`);
    const browser = await chromium.launch();
    page = await browser.newPage();
    context.userContext.set(BROWSER_KEY, browser);
    context.userContext.set(PAGE_KEY, page);
  }
  return page;
}

const playwrightHooks = createHooks({
  onEnd: async ({ context }: OnEndHookArgs) => {
    const browser = context.userContext.get(BROWSER_KEY) as Browser | undefined;
    if (browser) {
      console.log(`[${context.operationId}] CLEANUP: Closing browser for operation...`);
      await browser.close();
    }
  },
});

const navigateTool = createTool({
  name: "navigate_url",
  description: "Navigates to a specified URL.", // Added description
  parameters: z.object({ url: z.string().url() }),
  execute: async ({ url }, options?: ToolExecutionContext) => {
    if (!options?.operationContext) throw new Error("OperationContext is required for this tool.");
    const page = await ensurePage(options.operationContext);
    await page.goto(url);
    console.log(`[${options.operationContext.operationId}] ACTION: Navigated to ${url}`);
    return `Successfully navigated to ${url}`;
  },
});

const browserAutomationAgent = new Agent({
  name: "BrowserAutomationAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: playwrightHooks,
  tools: [navigateTool],
  instructions: "You are an agent that can browse the web. Use the navigate_url tool.",
});

async function runBrowserTasks() {
  console.log("--- Starting Browser Task 1 ---");
  await browserAutomationAgent.generateText("Navigate to https://example.com using the tool.");
  console.log("--- Browser Task 1 Finished ---");

  console.log("\n--- Starting Browser Task 2 (separate browser instance) ---");
  await browserAutomationAgent.generateText("Navigate to https://google.com using the tool.");
  console.log("--- Browser Task 2 Finished ---");
}

// runBrowserTasks();
```

This pattern ensures each call to `browserAutomationAgent.generateText` gets its own, clean browser environment, managed entirely through the operation-specific `userContext`.

For a full implementation of this pattern, see the [VoltAgent Playwright Example](https://github.com/voltagent/voltagent/tree/main/examples/with-playwright).

## Illustrating Core Access Patterns

Let's solidify how to access `userContext` with a direct example focusing on hooks and tools. This expands on the "Quick Example" by showing tool interaction.

```typescript
// Logger tool using context
const simpleContextTool = createTool({
  name: "log_with_context",
  description: "Logs a message using an ID from userContext.",
  parameters: z.object({ message: z.string() }),
  execute: async (params: { message: string }, options?: ToolExecutionContext) => {
    const operationIdFromContext = options?.operationContext?.userContext?.get("myOperationId");
    const logMessage = `[Tool Log][OpID: ${operationIdFromContext || "N/A"}] Message: ${params.message}`;
    console.log(logMessage);
    return `Logged: ${params.message} (OpID: ${operationIdFromContext || "N/A"})`;
  },
});

const agentWithToolContext = new Agent({
  name: "ToolContextAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [simpleContextTool],
  hooks: createHooks({
    // Using hooks from the first "Quick Example"
    onStart: ({ agent, context }: OnStartHookArgs) => {
      const operationSpecificId = `op-${agent.name}-${Date.now()}`;
      context.userContext.set("myOperationId", operationSpecificId);
      console.log(`[${agent.name}] HOOK: Operation started. OpID set to: ${operationSpecificId}`);
    },
    onEnd: ({ agent, context }: OnEndHookArgs) => {
      const opId = context.userContext.get("myOperationId");
      console.log(`[${agent.name}] HOOK: Operation finished. Retrieved OpID: ${opId}`);
    },
  }),
  instructions: "Use the log_with_context tool to log your thoughts.",
});

async function runToolContextTask() {
  await agentWithToolContext.generateText(
    "Log this message: 'Hello from the tool, using context!'"
  );
}
// runToolContextTask();
```

This example explicitly shows:

- `onStart` hook setting a value in `userContext`.
- A tool (`log_with_context`) accessing this value via `options.operationContext.userContext`.
- `onEnd` hook also accessing the same value.

## `userContext` in Sub-Agent Scenarios

As highlighted in the "Core Principles", `userContext` is automatically cloned and passed from a supervisor agent to its sub-agents during delegation. This allows sub-agents to access shared information seamlessly.

**Example: Propagating a Session ID to a Sub-Agent**

Let's see a supervisor agent passing a `sessionId` to its sub-agent. The sub-agent then uses this ID in its hooks and tools.

```typescript
// Assume VercelAIProvider, openai, createTool, z, Agent, createHooks,
// OnStartHookArgs, ToolExecutionContext are imported as in previous examples.

// Sub-Agent that will use the context
const subAgentProcessingTool = createTool({
  name: "sub_task_processor_with_session",
  description: "Processes a sub-task using an inherited session ID from context.",
  parameters: z.object({ task_details: z.string() }),
  execute: async (params, options?: ToolExecutionContext) => {
    const sessionId = options?.operationContext?.userContext?.get("sessionId") || "unknown-session";
    const logMessage = `[Sub-Agent TOOL][SessionID: ${sessionId}] Processing: ${params.task_details}`;
    console.log(logMessage);
    return `Sub-task for session ${sessionId} processed successfully.`;
  },
});

const workerAgentWithContext = new Agent({
  name: "WorkerAgentWithContext",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: [subAgentProcessingTool],
  hooks: createHooks({
    onStart: ({ agent, context }: OnStartHookArgs) => {
      const sessionId = context.userContext.get("sessionId");
      console.log(`[${agent.name} HOOK] Operation started. Inherited SessionID: ${sessionId}`);
    },
    onEnd: ({ agent, context }: OnStartHookArgs) => {
      const sessionId = context.userContext.get("sessionId");
      console.log(`[${agent.name} HOOK] Operation finished for SessionID: ${sessionId}`);
    }
  }),
  instructions: "You are a worker agent. Use your tools to process tasks based on session ID."
});

// Supervisor Agent
const supervisorAgentWithDelegation = new Agent({
  name: "SupervisorAgentWithDelegation",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  hooks: createHooks({
    onStart: ({ agent, context }: OnStartHookArgs) => {
      const sessionId = context.userContext.get("sessionId");
      console.log(`[${agent.name} HOOK] Supervisor Operation started. SessionID set to: ${sessionId}`);
    },
  }),
  subAgents: [workerAgentWithContext], // This makes delegate_task available
  instructions: "You are a supervisor. Delegate tasks to WorkerAgentWithContext."
});

async function runDelegationWithContext() {
  const supervisorSessionMap = new Map<string | symbol, unknown>();
  const newSessionId = `session-${Date.now()}`;
  supervisorSessionMap.set("sessionId", newSessionId);

  console.log(`\n--- Supervisor starting operation with SessionID: ${newSessionId} ---\`);
  // Supervisor's generateText call includes the userContext.
  // If it calls delegate_task for WorkerAgentWithContext, this context will be passed.
  await supervisorAgentWithDelegation.generateText(
    `Delegate processing of 'important financial data' to WorkerAgentWithContext for session ${newSessionId}.`,
    { userContext: supervisorSessionMap }
  );
  console.log("--- Supervisor operation finished ---");
}

// runDelegationWithContext();
```

In this example:

- When `supervisorAgentWithDelegation.generateText` is called with a `userContext` containing a `sessionId`, this context is established for the supervisor's operation.
- If the supervisor LLM uses the `delegate_task` tool (automatically available due to `subAgents` configuration) to delegate to `WorkerAgentWithContext`, the `SubAgentManager` ensures the `supervisorSessionMap` (as a clone) is passed to the worker.
- `WorkerAgentWithContext`'s `onStart` hook and its `subAgentProcessingTool` can then access this `sessionId` from their own `userContext`.

This pattern is crucial for maintaining contextual coherence when tasks are broken down and distributed across multiple specialized agents.
