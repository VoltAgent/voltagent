---
title: Tools
slug: /agents/tools
---

# Tools

Tools allow your agents to interact with external systems, APIs, databases, and perform specific actions. They are one of the most powerful features of VoltAgent, giving your agents the ability to affect the world beyond just generating text.

## Creating Basic Tools

VoltAgent provides a `createTool` helper function that makes it easy to create type-safe tools with full IntelliSense support. Let's start with a simple example - a calculator tool:

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

const calculatorTool = createTool({
  name: "calculate",
  description: "Perform a mathematical calculation",
  parameters: z.object({
    expression: z.string().describe("The mathematical expression to evaluate, e.g. (2 + 2) * 3"),
  }),
  execute: async (args) => {
    try {
      // In production, use a secure math parser instead of eval
      const result = eval(args.expression);
      return { result };
    } catch (error) {
      throw new Error(`Invalid expression: ${args.expression}`);
    }
  },
});
```

This tool takes a mathematical expression as input and returns the calculated result. Notice how the `execute` function automatically infers its parameter types from the Zod schema defined in `parameters`. This provides full IntelliSense support in your IDE, helping catch errors during development.

## Understanding Tools

A tool in VoltAgent is a function that an agent can call to perform an action or retrieve information. Each tool has:

- **Name**: A unique identifier for the tool
- **Description**: Explains what the tool does (the agent uses this to decide when to use the tool)
- **Parameters**: The inputs the tool requires, defined using Zod schemas
- **Execute function**: The code that runs when the tool is called

## Using Tools with an Agent

To use a tool with an agent, simply include it in the agent's configuration. When you interact with the agent (e.g., using `generateText` or `streamText`), the LLM will decide based on the prompt and the tool's description whether using the tool is appropriate to fulfill the request.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Calculator Assistant",
  instructions: "An assistant that can perform calculations",
  model: openai("gpt-4o"),
  tools: [calculatorTool],
});

// The agent can now use the calculator tool when needed
// const response = await agent.generateText("What is 123 * 456?");
// console.log(response.text);
```

## Using Multiple Tools Together

Agents become more powerful when they can use multiple tools together. Here's an example of an agent that can both check the weather and perform calculations:

```ts
import { Agent, createTool } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Calculator tool
const calculatorTool = createTool({
  name: "calculate",
  description: "Perform a mathematical calculation",
  parameters: z.object({
    expression: z.string().describe("The mathematical expression to evaluate"),
  }),
  execute: async (args) => {
    try {
      // args is automatically typed as { expression: string }
      const result = eval(args.expression);
      return { result };
    } catch (error) {
      throw new Error(`Invalid expression: ${args.expression}`);
    }
  },
});

// Weather tool
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The city name"),
  }),
  execute: async (args) => {
    // args is automatically typed as { location: string }
    const { location } = args;

    // In a real implementation, you would call a weather API
    // This is a simplified example
    return {
      location,
      temperature: 22,
      conditions: "sunny",
    };
  },
});

// Create an agent with multiple tools
const multiToolAgent = new Agent({
  name: "Multi-Tool Assistant",
  instructions: "An assistant that can check weather and perform calculations",
  model: openai("gpt-4o"),
  tools: [calculatorTool, weatherTool],
});

// The agent can now use both tools in the same conversation
const response = await multiToolAgent.generateText(
  "What's the weather in Paris today? Also, what is 24 * 7?"
);
console.log(response.text);

// Example response:
// "The current weather in Paris is 22°C and sunny. As for your calculation, 24 * 7 = 168."
```

In this example, the agent can decide which tool to use based on the user's question. When asked both about the weather and a calculation, it will use both tools and combine the results into a single coherent response.

## Type Safety with Tools

When you use `createTool`, the type of the `args` parameter in the `execute` function is automatically inferred from the Zod schema you define in `parameters`. This provides several benefits:

- **IntelliSense support**: Your IDE will show autocomplete suggestions for the properties of `args`
- **Type checking**: TypeScript will catch errors if you try to access properties that don't exist
- **Refactoring support**: When you change the schema, TypeScript will help you update all the places that use it
- **Documentation**: The types serve as documentation for what data the tool expects

For example, with this tool definition:

```ts
const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The city name"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().describe("Temperature unit"),
  }),
  execute: async (args) => {
    // args is typed as { location: string; unit?: "celsius" | "fahrenheit" }
    const { location, unit = "celsius" } = args;
    // ...
  },
});
```

The `args` parameter is automatically typed as `{ location: string; unit?: "celsius" | "fahrenheit" }`, giving you full IDE support without having to manually specify the type.

## Tool Hooks

VoltAgent provides lifecycle hooks that let you respond to tool execution events. This allows you to add logging, perform additional actions, or modify behavior when tools are used.

### Using hooks

The `onToolStart` hook is called just before a tool is executed, and `onToolEnd` is called after execution completes. These hooks are particularly useful for:

- Logging tool usage
- Updating UI when tools are running
- Cleaning up resources after tool execution

```ts
import { Agent, createHooks, isAbortError } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Define the hooks using createHooks
const hooks = createHooks({
  onToolStart({ agent, tool, context, args }) {
    console.log(`Tool starting: ${tool.name}`);
    console.log(`Agent: ${agent.name}`);
    console.log(`Operation ID: ${context.operationId}`);
  },
  onToolEnd({ agent, tool, output, error, context }) {
    console.log(`Tool completed: ${tool.name}`);

    if (error) {
      if (isAbortError(error)) {
        console.log(`Tool was aborted: ${error.message}`);
      } else {
        console.error(`Tool failed: ${error.message}`);
      }
    } else {
      console.log(`Result: ${JSON.stringify(output)}`);
    }
  },
});

// Create an agent with hooks
const agent = new Agent({
  name: "Assistant with Tool Hooks",
  instructions: "An assistant that logs tool execution",
  model: openai("gpt-4o"),
  tools: [calculatorTool],
  hooks: hooks,
});

// When the agent uses a tool, the hooks will be triggered
// const response = await agent.generateText("What is 123 * 456?");
```

#### ToolDeniedError: Deny a tool and terminate the flow

In policy or security scenarios you may want to prevent a tool from running and immediately stop the entire agent operation. Throw a ToolDeniedError from a hook (typically onToolStart) to do this. The agent will:

- Stop the tool call immediately,
- Surface the error to the caller as a ToolDeniedError, preserving httpStatus and code for programmatic handling.

Example policy check in onToolStart:

```ts
import { createHooks, ToolDeniedError } from "@voltagent/core";

const hooks = createHooks({
  onToolStart({ tool, context, args }) {
    const userId = context.userId;
    const plan = context.userPlan; // your app can inject any context values

    // Block expensive or restricted tools for non-pro users
    if (tool.name === "search_web" && plan !== "pro") {
      throw new ToolDeniedError({
        toolName: tool.name,
        message: "Pro plan required to use web search.",
        code: "TOOL_PLAN_REQUIRED",
        httpStatus: 402, // Payment Required (choose a suitable 4xx code)
      });
    }
  },
});
```

Catching the termination when calling the agent:

```ts
import { isToolDeniedError } from "@voltagent/core";

try {
  const res = await agent.generateText("Please search the web for ...", { hooks });
} catch (err) {
  if (isToolDeniedError(err)) {
    // Access structured fields
    console.log("Tool denied:", {
      tool: err.name, // the tool name
      status: err.httpStatus,
      code: err.code,
      message: err.message,
    });
    // Show a friendly UI, redirect to upgrade, etc.
  } else {
    // Other errors, including AbortError for generic cancellations
    console.error("Operation failed:", err);
  }
}
```

Notes:

- Throw ToolDeniedError from any hook (onToolStart is most common) to terminate early.
- When ToolDeniedError is thrown, the agent aborts the entire flow; no further tool calls will be executed.
- For generic cancellations (timeouts, user cancel), catch isAbortError; for policy denials, use isToolDeniedError.

Allowed codes and custom codes:

- Built-in codes you can use for `code`:
  - TOOL_ERROR
  - TOOL_FORBIDDEN
  - TOOL_PLAN_REQUIRED
  - TOOL_QUOTA_EXCEEDED
- You can also supply any custom string for `code` to fit your app’s taxonomy, e.g. "TOOL_REGION_BLOCKED".
- HTTP status must be a client error (4xx).

Example using a custom code:

```ts
throw new ToolDeniedError({
  toolName: "browser_screenshot",
  message: "Screenshots are disabled for this tenant in EU region.",
  code: "TOOL_REGION_BLOCKED", // custom application-specific code
  httpStatus: 403,
});
```

## Best Practices

### Clear Descriptions

Provide clear descriptions for your tools and parameters. The agent relies heavily on these descriptions to understand the tool's purpose, capabilities, and required inputs. Remember that the `.describe()` strings in your Zod parameter schemas are crucial information passed directly to the LLM.

**Bad Example:**

```ts
const badTool = createTool({
  name: "search",
  description: "Searches things", // Vague, doesn't explain what it searches or when to use it
  parameters: z.object({
    q: z.string(), // Unclear parameter name with no description
    n: z.number().optional(), // Unclear what this parameter does
  }),
  execute: async (args) => {
    /* ... */
  },
});
```

**Good Example:**

```ts
const goodTool = createTool({
  name: "search_web",
  description:
    "Searches the web for current information on a topic. Use this when you need to find recent or factual information that may not be in your training data.", // Clear purpose and usage guidance
  parameters: z.object({
    query: z
      .string()
      .describe("The search query. Should be specific and focused on what information is needed."),
    results_count: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results to return. Defaults to 3 if not specified."),
  }),
  execute: async (args) => {
    /* ... */
  },
});
```

### Error Handling

Implement proper error handling in your tool's execute function. Return useful error messages that the agent can understand.

```ts
execute: async (args) => {
  try {
    // Tool implementation
    return result;
  } catch (error) {
    throw new Error(`Failed to process request: ${error.message}`);
  }
};
```

### Cancellable Tools with AbortController

For long-running tools, implement cancellation with AbortController. This allows tools to be gracefully cancelled when needed, such as when a user cancels a request or when an operation times out.

Tools receive an options object as their second parameter, which contains the operation context with an AbortController. The tool can:

- **Check if already aborted** using `signal.aborted`
- **Listen for abort events** using `signal.addEventListener('abort', ...)`
- **Trigger abort** using `abortController.abort()` to cancel the entire agent operation

> **Important**: When a tool calls `abortController.abort()`, it cancels the entire agent operation, not just the current tool execution. This will stop any subsequent tool calls and cause the agent to throw an `AbortError`.

```ts
const searchTool = createTool({
  name: "search_web",
  description: "Search the web for current information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async (args, options) => {
    // Extract the AbortController from operation context
    const abortController = options?.operationContext?.abortController;
    const signal = abortController?.signal;

    // Check if already aborted
    if (signal?.aborted) {
      throw new Error("Search was cancelled before it started");
    }

    // Tool can trigger abort to cancel the entire operation
    if (args.query.includes("forbidden")) {
      // This will abort the entire agent operation, not just this tool
      abortController?.abort("Forbidden query detected - cancelling entire operation");
      throw new Error("Search query contains forbidden terms");
    }

    // Example of a fetch operation that respects abort signal
    try {
      const response = await fetch(`https://api.search.com?q=${args.query}`, {
        signal: signal, // Pass the signal to fetch
      });

      // Tool can also abort based on response
      if (!response.ok && response.status === 429) {
        abortController?.abort("Rate limit exceeded - stopping all operations");
        throw new Error("API rate limit exceeded");
      }

      return await response.json();
    } catch (error) {
      // If fetch was aborted, it will throw an AbortError
      if (error.name === "AbortError") {
        throw new Error("Search was cancelled during execution");
      }
      throw error;
    }
  },
});
```

When calling a tool directly, you can pass an AbortController:

```ts
// Create an AbortController
const abortController = new AbortController();

// Set a timeout to abort after 5 seconds
setTimeout(() => abortController.abort("Operation timeout"), 5000);

try {
  // Pass the abortController directly
  const result = await searchTool.execute({ query: "Latest AI developments" }, { abortController });
  console.log("Results:", result);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Search was cancelled");
  } else {
    console.error("Search failed:", error);
  }
}
```

When using tools with an agent, you can pass the AbortController in the options of the agent's generateText or streamText methods:

```ts
import { isAbortError } from "@voltagent/core";

// Create an AbortController
const abortController = new AbortController();

// Set a timeout to abort after 30 seconds
setTimeout(() => abortController.abort("Operation timeout"), 30000);

try {
  // Pass the signal to the agent (recommended)
  const response = await agent.generateText("Search for the latest AI developments", {
    abortSignal: abortController.signal, // Agent propagates an internal controller to tools
  });
  console.log(response.text);
} catch (error) {
  if (isAbortError(error)) {
    console.log("Operation was cancelled:", error.message);
  } else {
    console.error("Error:", error);
  }
}
```

The AbortSignal mechanism is particularly useful for:

- User-initiated cancellations
- Implementing timeouts for slow operations
- Gracefully stopping batch operations
- Preventing unnecessary work when results are no longer needed

### Timeout Handling

For tools that call external APIs, implement timeout handling. While `Promise.race` can be used, the `AbortController` pattern often integrates more cleanly, especially with `fetch` and the agent's own signal propagation.

```ts
execute: async (args) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out")), 5000);
  });

  const resultPromise = fetchDataFromApi(args);

  return Promise.race([resultPromise, timeoutPromise]);
};
```

Alternatively, using AbortController with a timeout:

```ts
execute: async (args, options) => {
  // Get parent abort controller if provided
  const parentController = options?.operationContext?.abortController;

  // Create a new AbortController for timeout
  const timeoutController = new AbortController();

  // Create a timeout that will abort the controller
  const timeoutId = setTimeout(() => {
    timeoutController.abort("Operation timed out");
  }, 5000); // 5-second timeout

  try {
    // Listen to parent abort if provided
    if (parentController?.signal) {
      parentController.signal.addEventListener("abort", () => {
        timeoutController.abort("Parent operation aborted");
        clearTimeout(timeoutId);
      });
    }

    // Use our controller's signal for the API call
    const result = await fetchDataFromApi(args, { signal: timeoutController.signal });
    clearTimeout(timeoutId); // Clear the timeout if the operation completed successfully
    return result;
  } catch (error) {
    clearTimeout(timeoutId); // Ensure timeout is cleared on error too
    throw error;
  }
};
```

## Dynamic Tool Registration

You can add tools to an agent after it's been created:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { openai } from "@ai-sdk/openai";

// Create an agent without tools initially
const agent = new Agent({
  name: "Dynamic Assistant",
  instructions: "An assistant that can gain new abilities",
  model: openai("gpt-4o"),
});

// Later, add tools to the agent
agent.addTools([calculatorTool]);

// You can also add toolkits
agent.addTools([myToolkit]);

// Or provide tools for a specific request only
const response = await agent.generateText("Calculate 123 * 456", {
  tools: [calculatorTool],
});
```

## MCP (Model Context Protocol) Support

VoltAgent supports the [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/mcp), allowing your agents to seamlessly connect with external model servers, AI systems, and other tools that implement this protocol. This enables you to expand your agent's capabilities without having to write complex integration code.

### Using MCP Tools

You can connect to external MCP-compatible servers and use their tools with your agents:

```ts
import { Agent, MCPConfiguration } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Set up MCP configuration with multiple servers
const mcpConfig = new MCPConfiguration({
  servers: {
    // HTTP server configuration
    browserTools: {
      type: "http",
      url: "https://your-mcp-server.example.com/browser",
    },
    // Local stdio server configuration
    localAI: {
      type: "stdio",
      command: "python",
      args: ["local_ai_server.py"],
    },
  },
});

// Option 1: Get tools grouped by server using getToolsets()
const toolsets = await mcpConfig.getToolsets();
// Access tools for a specific server
const browserToolsOnly = toolsets.browserTools.getTools();
const localAiToolsOnly = toolsets.localAI.getTools();

// Option 2: Get all tools from all servers combined into a single array
const allMcpTools = await mcpConfig.getTools();

// Create an agent using only the browser tools
const agentWithBrowserTools = new Agent({
  name: "Browser Agent",
  description: "Assistant using only browser tools via MCP",
  model: openai("gpt-4o"),
  tools: browserToolsOnly, // Use the specific toolset
});

// Create another agent using *all* fetched MCP tools
const agentWithAllMcpTools = new Agent({
  name: "MCP-Enhanced Assistant",
  description: "Assistant with access to all configured MCP tools",
  model: openai("gpt-4o"),
  tools: allMcpTools, // Use the combined list
});

// Use the agents (example)
// const response = await agentWithBrowserTools.generateText(
//   "Take a screenshot of the current page."
// );
// console.log(response.text);
```

MCP enables your agents to:

- Connect to browser extensions for web automation
- Access specialized local AI models (image recognition, voice processing, etc.)
- Use API gateways that implement the MCP protocol
- Tap into ecosystems of MCP-compatible tools

For in-depth details on setting up and using the Model Context Protocol with your agents, see the [MCP documentation](./mcp/mcp.md).
