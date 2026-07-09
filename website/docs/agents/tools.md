---
title: Tools
slug: /agents/tools
---

# Tools

Tools enable agents to interact with external systems, APIs, databases, and perform specific actions beyond generating text. An agent uses its model to decide when to call tools based on their descriptions and the current context.

## Creating a Tool

For new VoltAgent 3.x code, use the AI SDK-style `tool()` helper and pass tools as a `ToolSet` object. The tool name comes from the object key and the input schema uses `inputSchema`, matching AI SDK conventions.

```ts
import { Agent, tool } from "@voltagent/core";
import { z } from "zod";

const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Answer weather questions using the weather tool.",
  model: "openai/gpt-4o",
  tools: {
    get_weather: tool({
      description: "Get current weather for a location",
      inputSchema: z.object({
        location: z.string().describe("The city name"),
      }),
      execute: async ({ location }) => {
        // Call weather API
        const response = await fetch(`https://api.weather.com/current?city=${location}`);
        const data = await response.json();

        return {
          location,
          temperature: data.temp,
          conditions: data.conditions,
        };
      },
    }),
  },
});
```

AI SDK-style tools can still use VoltAgent-specific features through the `voltagent` namespace:

```ts
const agent = new Agent({
  name: "Weather Assistant",
  instructions: "Answer weather questions using the weather tool.",
  model: "openai/gpt-4o",
  tools: {
    get_weather: tool({
      description: "Get current weather for a location",
      inputSchema: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { location, temperature: 22, conditions: "sunny" };
      },
      voltagent: {
        name: "Get Weather",
        purpose: "Fetch current weather for a location",
        tags: ["weather", "external-api"],
        hooks: {
          onStart: ({ tool }) => {
            console.log(`[tool] ${tool.name} starting`);
          },
        },
      },
    }),
  },
});
```

Each AI SDK-style tool has:

- **object key**: Unique identifier, such as `get_weather`
- **description**: Explains what the tool does (the model uses this to decide when to call it)
- **inputSchema**: Input schema defined with Zod
- **execute**: Function that runs when the tool is called
- **outputSchema** (optional): Output schema for validating tool results
- **providerOptions** (optional): Provider-specific options for advanced features
- **toModelOutput** (optional): Converts rich tool results into AI SDK model output
- **voltagent.name** (optional): VoltAgent-facing name for display or metadata consumers. The ToolSet key remains the execution name.
- **voltagent.purpose** (optional): VoltAgent-facing purpose for display or metadata consumers.
- **voltagent.tags** (optional): Optional user-defined tags for organizing or labeling tools.
- **voltagent.hooks** (optional): VoltAgent lifecycle hooks for observing or post-processing tool execution.
- **voltagent.needsApproval** (optional): Static approval metadata for existing VoltAgent approval or tool-policy flows. Prefer call-level `toolApproval` for new per-request approval flows.

VoltAgent observability and tool execution use the ToolSet key as the canonical `tool.name`. If you set `voltagent.name`, it is exposed as display metadata (`tool.display_name`) for the Console and telemetry consumers without changing the name the model calls.

VoltAgent intentionally does not expose AI SDK `contextSchema`, `runtimeContext`, `toolsContext`, `telemetry`, or `experimental_telemetry` on `tool()`. Use agent call `context` or `voltagent.context` for per-request application context, `voltagent.hooks` when a tool needs VoltAgent lifecycle context, and VoltAgent observability/OpenTelemetry configuration for telemetry. See [AI SDK Compatibility Boundaries](/docs/agents/overview#ai-sdk-compatibility-boundaries) for the agent-level ownership rules.

The `execute` function's parameter types are automatically inferred from the Zod schema, providing full IntelliSense support.

## Using AI SDK Provider Tools

VoltAgent-managed `tool()` tools and AI SDK provider-defined tools can be used together on the same agent. Use `tool()` when VoltAgent should execute your code and provide hooks, tags, approval metadata, API metadata, and observability. Use provider-defined tools when the model provider owns the tool implementation.

```ts
import { Agent, tool, type ProviderTool } from "@voltagent/core";
import { z } from "zod";

const webSearchTool: ProviderTool = {
  name: "web_search",
  description: "Search the web using the model provider's hosted search tool.",
  type: "provider",
  id: "openai.web_search_preview",
  args: {},
};

const agent = new Agent({
  name: "Research Assistant",
  instructions: "Use the right tool for weather or current web research.",
  model: "openai/gpt-4o",
  tools: {
    get_weather: tool({
      description: "Get current weather for a location",
      inputSchema: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { location, temperature: 22, conditions: "sunny" };
      },
    }),
    web_search: webSearchTool,
  },
});
```

Provider-defined tools are passed through to the AI SDK unchanged. Use the exact `id` and `args` shape from your provider's AI SDK docs. They are not wrapped with VoltAgent tool hooks or `execute` handlers, so use `tool()` for tools that need VoltAgent-managed lifecycle behavior or application-side execution.

## Native Tool Approval

Use AI SDK v7's native `toolApproval` option when approval should be decided per request. This takes precedence over tool-level `needsApproval`.

```ts
const result = await agent.generateText({
  prompt: "Delete the stale report",
  tools: {
    delete_file: tool({
      description: "Delete a file",
      inputSchema: z.object({
        path: z.string(),
      }),
      execute: async ({ path }) => deleteFile(path),
    }),
  },
  toolApproval: {
    delete_file: "user-approval",
  },
});
```

Use `voltagent.needsApproval` only when approval should be static tool metadata or part of an existing VoltAgent tool policy. If both are provided, call-level `toolApproval` takes precedence:

```ts
const agent = new Agent({
  name: "Workspace Assistant",
  instructions: "Manage workspace files.",
  model: "openai/gpt-4o",
  tools: {
    delete_file: tool({
      description: "Delete a file",
      inputSchema: z.object({
        path: z.string(),
      }),
      execute: async ({ path }) => deleteFile(path),
      voltagent: {
        needsApproval: true,
      },
    }),
  },
});
```

## Tool Hooks

You can attach tool-specific hooks to observe or post-process a tool result. Tool hooks run before agent-level hooks, and agent `onToolEnd` can still override the output afterward.

**Hook parameters:**

- `onStart`: `{ tool, args, options }`
- `onEnd`: `{ tool, args, output, error, options }` (return `{ output }` to override the result)

> Overrides are re-validated if the tool has an `outputSchema`. For streaming tools (AsyncIterable), overrides apply only to the final output.

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";

const summarizeTool = tool({
  description: "Summarize text with a hard cap",
  inputSchema: z.object({ text: z.string() }),
  execute: async ({ text }) => text,
  voltagent: {
    hooks: {
      onStart: ({ tool }) => {
        console.log(`[tool] ${tool.name} starting`);
      },
      onEnd: ({ output }) => {
        if (typeof output === "string") {
          return { output: output.slice(0, 500) };
        }
      },
    },
  },
});
```

## Streaming Tool Results (Preliminary)

If your tool can provide progress or intermediate status, return an `AsyncIterable` from `execute`.
Each `yield` is emitted as a preliminary tool result, and the **last yielded value** is treated as the final result.

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";

const weatherOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("loading"),
    text: z.string(),
    weather: z.undefined().optional(),
  }),
  z.object({
    status: z.literal("success"),
    text: z.string(),
    weather: z.object({
      location: z.string(),
      temperature: z.number(),
    }),
  }),
]);

const weatherTool = tool({
  description: "Get the current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("The city name"),
  }),
  outputSchema: weatherOutputSchema,
  async *execute({ location }) {
    yield {
      status: "loading" as const,
      text: `Getting weather for ${location}`,
      weather: undefined,
    };

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const temperature = 72 + Math.floor(Math.random() * 21) - 10;

    yield {
      status: "success" as const,
      text: `The weather in ${location} is ${temperature}F`,
      weather: { location, temperature },
    };
  },
});
```

### Tool Tags

Tags are optional string labels that help organize and categorize tools.

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";

// Example: Database tools with tags
const queryTool = tool({
  description: "Execute a read-only SQL query",
  inputSchema: z.object({
    query: z.string().describe("SQL query to execute"),
  }),
  execute: async ({ query }) => {
    // Execute query
    return { results: [] };
  },
  voltagent: {
    tags: ["database", "read-only", "sql"],
  },
});

const updateTool = tool({
  description: "Update database records",
  inputSchema: z.object({
    table: z.string().describe("Table name"),
    id: z.string().describe("Record ID"),
    data: z.record(z.unknown()).describe("Data to update"),
  }),
  execute: async ({ table, id, data }) => {
    // Update record
    return { success: true };
  },
  voltagent: {
    tags: ["database", "write", "sql", "destructive"],
  },
});

// Example: External API tools
const weatherTool = tool({
  description: "Get current weather data",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    // Fetch weather
    return { temperature: 72, conditions: "sunny" };
  },
  voltagent: {
    tags: ["weather", "external-api", "read-only"],
  },
});
```

Tags are included in OpenTelemetry spans and visible in the VoltAgent observability dashboard, making it easy to analyze tool usage patterns and debug agent behavior.

Tool tags also flow through the REST tool endpoints (`GET /tools` and `POST /tools/:name/execute` responses), so you can build frontend tooling or access control based on tags.

### Provider-Specific Options

You can pass provider-specific options to enable advanced features like caching. Currently supported providers include Anthropic, OpenAI, Google, and others.

#### Anthropic Cache Control

Anthropic's prompt caching can reduce costs and latency for repeated tool calls:

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";

const cityAttractionsTool = tool({
  description: "Get tourist attractions for a city",
  inputSchema: z.object({
    city: z.string().describe("The city name"),
  }),
  providerOptions: {
    anthropic: {
      cacheControl: { type: "ephemeral" },
    },
  },
  execute: async ({ city }) => {
    return await fetchAttractions(city);
  },
});
```

The `cacheControl` option tells Anthropic to cache the tool definition, improving performance for subsequent calls. Learn more about [Anthropic's cache control](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic#cache-control).

## Using Tools with Agents

Add tools when creating an agent. The model decides when to use them based on the user's input and tool descriptions.

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "Weather Assistant",
  instructions: "An assistant that provides weather information",
  model: "openai/gpt-4o",
  tools: {
    get_weather: weatherTool,
  },
});

// The model calls the tool when appropriate
const response = await agent.generateText("What's the weather in Paris?");
console.log(response.text);
// "The current weather in Paris is 22°C and sunny."
```

### Using Multiple Tools

Agents can use multiple tools together to answer complex queries.

```ts
const calculatorTool = tool({
  description: "Perform mathematical calculations",
  inputSchema: z.object({
    expression: z.string().describe("The mathematical expression to evaluate"),
  }),
  execute: async ({ expression }) => {
    // Use a safe math parser in production
    const result = eval(expression);
    return { result };
  },
});

const agent = new Agent({
  name: "Multi-Tool Assistant",
  instructions: "An assistant that can check weather and perform calculations",
  model: "openai/gpt-4o",
  tools: {
    get_weather: weatherTool,
    calculate: calculatorTool,
  },
});

const response = await agent.generateText("What's the weather in Paris? Also, what is 24 * 7?");
// The model uses both tools and combines the results
```

### Dynamic Tool Registration

Provide additional tools per request with the same ToolSet shape.

```ts
// Provide tools for a specific request only
const response = await agent.generateText("Calculate 123 * 456", {
  tools: {
    calculate: calculatorTool,
  },
});
```

## Accessing Tool Context

The `execute` function follows the AI SDK tool signature. Its second parameter includes AI SDK execution data such as `toolCallId`, `messages`, and `abortSignal`.

VoltAgent operation context is available in `voltagent.hooks`, where `options` contains the operation-scoped logger, `context` map, user/conversation identifiers, trace context, and tool metadata.

```ts
const debugTool = tool({
  description: "Logs debugging information",
  inputSchema: z.object({
    message: z.string().describe("Debug message to log"),
  }),
  execute: async (args, options) => {
    console.log("Tool call ID:", options.toolCallId);
    console.log("Message history length:", options.messages.length);

    if (options.abortSignal?.aborted) {
      throw new Error("Tool call was cancelled");
    }

    return `Logged: ${args.message}`;
  },
  voltagent: {
    hooks: {
      onStart: ({ args, options }) => {
        options?.logger?.info("Starting debug tool", {
          args,
          operationId: options.operationId,
          userId: options.userId,
          conversationId: options.conversationId,
          requestId: options.context?.get("requestId"),
        });
      },
    },
  },
});
```

## Cancellation with AbortController

Tools can respond to cancellation signals from the active generation call.

```ts
const searchTool = tool({
  description: "Search the web for information",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async (args, options) => {
    const signal = options.abortSignal;

    // Check if already aborted
    if (signal?.aborted) {
      throw new Error("Search was cancelled before it started");
    }

    if (args.query.includes("forbidden")) {
      throw new Error("Search query contains forbidden terms");
    }

    try {
      // Pass signal to fetch for cancellation support
      const response = await fetch(`https://api.search.com?q=${args.query}`, { signal });

      if (!response.ok && response.status === 429) {
        throw new Error("API rate limit exceeded");
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Search was cancelled during execution");
      }
      throw error;
    }
  },
});
```

When calling an agent with an abort signal:

```ts
import { isAbortError } from "@voltagent/core";

const abortController = new AbortController();

// Set timeout to abort after 30 seconds
setTimeout(() => abortController.abort("Operation timeout"), 30000);

try {
  const response = await agent.generateText("Search for the latest AI developments", {
    abortSignal: abortController.signal,
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

## Tool Execution Approval (needsApproval)

Some tools should not run automatically because they trigger sensitive actions (payments, file changes, command execution, etc). Set `needsApproval` to require explicit user approval before the tool executes.

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";

const runCommandTool = tool({
  description: "Run a shell command",
  inputSchema: z.object({
    command: z.string().describe("Command to execute"),
  }),
  execute: async ({ command }) => {
    // Execute safely
    return { ok: true, command };
  },
  voltagent: {
    needsApproval: true,
  },
});
```

`needsApproval` can also be a function for dynamic policies:

```ts
const processPaymentTool = tool({
  description: "Charge a customer",
  inputSchema: z.object({
    amount: z.number(),
    customerId: z.string(),
  }),
  execute: async ({ amount, customerId }) => {
    return { success: true, amount, customerId };
  },
  voltagent: {
    needsApproval: async ({ amount }) => amount > 1000,
  },
});
```

### How the Approval Flow Works

1. The model calls a tool with `needsApproval`.
2. VoltAgent returns a tool part with `state: "approval-requested"` instead of executing.
3. Your UI asks the user to approve or deny.
4. Send a tool approval response back to VoltAgent.
5. If approved, the tool executes in the next step. If denied, the model sees the denial and can respond accordingly.

### UI Implementation (useChat)

VoltAgent's `/agents/:id/chat` stream is compatible with AI SDK `useChat`, so you can render the approval request and send a response from the UI.

```tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";

function Chat() {
  const { messages, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: "/agents/weather/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.parts.map((part) => {
            if (part.type === "tool-runCommand") {
              if (part.state === "approval-requested") {
                return (
                  <div key={part.toolCallId}>
                    <p>Approve command: {part.input.command}?</p>
                    <button
                      onClick={() =>
                        addToolApprovalResponse({
                          id: part.approval.id,
                          approved: true,
                        })
                      }
                    >
                      Approve
                    </button>
                    <button
                      onClick={() =>
                        addToolApprovalResponse({
                          id: part.approval.id,
                          approved: false,
                          reason: "User denied",
                        })
                      }
                    >
                      Deny
                    </button>
                  </div>
                );
              }
            }
            return null;
          })}
        </div>
      ))}
    </div>
  );
}
```

If you do not use `sendAutomaticallyWhen`, call `sendMessage` manually after approval to continue the flow.

## Client-Side Tools

Client-side tools execute in the browser or client application instead of on the server. They're useful for accessing browser APIs, user permissions, or client-specific features.

For a complete working setup, see the example: [with-client-side-tools](https://github.com/VoltAgent/voltagent/tree/main/examples/with-client-side-tools).

### What Makes a Tool Client-Side?

A tool without an `execute` function is automatically client-side.

```ts
// Client-side tool (no execute function)
const getLocationTool = tool({
  description: "Get the user's current location",
  inputSchema: z.object({}),
  outputSchema: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  // No execute = client-side
});

// Another client-side tool
const readClipboardTool = tool({
  description: "Read content from the user's clipboard",
  inputSchema: z.object({}),
  outputSchema: z.object({
    text: z.string(),
  }),
});

// Server-side tool (has execute)
const getWeatherTool = tool({
  description: "Get current weather for a city",
  inputSchema: z.object({
    city: z.string().describe("City name"),
  }),
  execute: async ({ city }) => {
    const response = await fetch(`https://api.weather.com/current?city=${city}`);
    return await response.json();
  },
});
```

### Handling Client-Side Tools

Use the `onToolCall` callback with `useChat` to handle client-side tool execution.

```tsx
import { useChat } from "@ai-sdk/react";
import type { ClientSideToolResult } from "@voltagent/core";
import { useState, useEffect, useCallback } from "react";

function Chat() {
  const [result, setResult] = useState<ClientSideToolResult | null>(null);

  const handleToolCall = useCallback(async ({ toolCall }) => {
    // Handle automatic execution for getLocation
    if (toolCall.toolName === "getLocation") {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setResult({
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            output: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          });
        },
        (error) => {
          setResult({
            state: "output-error",
            tool: "getLocation",
            toolCallId: toolCall.toolCallId,
            errorText: error.message,
          });
        }
      );
    }
  }, []);

  const { messages, sendMessage, addToolResult, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onToolCall: handleToolCall,
  });

  // Send results back to the model
  useEffect(() => {
    if (!result) return;
    addToolResult(result);
  }, [result, addToolResult]);

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>{/* Render message */}</div>
      ))}
    </div>
  );
}
```

### Interactive Client-Side Tools

For tools requiring user interaction, render UI components:

```tsx
function ReadClipboardTool({
  callId,
  state,
  addToolResult,
}: {
  callId: string;
  state?: string;
  addToolResult: (res: ClientSideToolResult) => void;
}) {
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div>
        <p>Allow access to your clipboard?</p>
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              addToolResult({
                tool: "readClipboard",
                toolCallId: callId,
                output: { content: text },
              });
            } catch {
              addToolResult({
                state: "output-error",
                tool: "readClipboard",
                toolCallId: callId,
                errorText: "Clipboard access denied",
              });
            }
          }}
        >
          Yes
        </button>
        <button
          onClick={() =>
            addToolResult({
              state: "output-error",
              tool: "readClipboard",
              toolCallId: callId,
              errorText: "Access denied",
            })
          }
        >
          No
        </button>
      </div>
    );
  }
  return <div>readClipboard: {state}</div>;
}
```

**Important**: You must call `addToolResult` to send the tool result back to the model. Without this, the model considers the tool call a failure.

## Agent Tool Hooks

Hooks let you respond to tool execution events for logging, UI updates, or additional actions. Use `onToolError` when you need to customize the error payload before it is returned to the model. For tool-level hooks (per tool), see the **Tool Hooks** section above.

```ts
import { Agent, createHooks, isAbortError } from "@voltagent/core";

const hooks = createHooks({
  onToolStart({ agent, tool, context, args }) {
    console.log(`Tool starting: ${tool.name}`);
    console.log(`Agent: ${agent.name}`);
    console.log(`Operation ID: ${context.operationId}`);
    console.log(`Arguments:`, args);
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
      console.log(`Result:`, output);
    }
  },

  onToolError({ tool, originalError }) {
    const maybeAxios = (originalError as any).isAxiosError === true;
    if (!maybeAxios) {
      return;
    }

    return {
      output: {
        error: true,
        message: originalError.message,
        code: (originalError as any).code,
        status: (originalError as any).response?.status,
      },
    };
  },
});

const agent = new Agent({
  name: "Assistant with Tool Hooks",
  instructions: "An assistant that logs tool execution",
  model: "openai/gpt-4o",
  tools: {
    get_weather: weatherTool,
  },
  hooks: hooks,
});
```

### Using Tags with Hooks

Tool tags can be accessed in hooks for implementing custom logic like access control or conditional behavior:

```ts
import { createHooks, ToolDeniedError } from "@voltagent/core";

const hooks = createHooks({
  onToolStart({ tool, context }) {
    // Check if tool has destructive tag and user has permission
    if (tool.tags?.includes("destructive")) {
      const userRole = context.context.get("userRole");
      if (userRole !== "admin") {
        throw new ToolDeniedError({
          toolName: tool.name,
          message: "Admin permission required for destructive operations",
          code: "TOOL_FORBIDDEN",
        });
      }
    }

    // Log tools by category
    if (tool.tags?.includes("external-api")) {
      console.log(`Calling external API: ${tool.name}`);
    }
  },
});

const agent = new Agent({
  name: "Controlled Assistant",
  instructions: "An assistant with tag-based access control",
  model: "openai/gpt-4o",
  tools: {
    query_database: queryTool,
    update_record: updateTool,
    get_weather: weatherTool,
  },
  hooks: hooks,
});

// Usage with context
const response = await agent.generateText("Update the user record", {
  context: { userRole: "admin" }, // Admin can use destructive tools
});
```

### Policy Enforcement with ToolDeniedError

Throw `ToolDeniedError` from a hook to block a tool and immediately stop the entire agent operation.

```ts
import { createHooks, ToolDeniedError } from "@voltagent/core";

const hooks = createHooks({
  onToolStart({ tool, context }) {
    const plan = context.context.get("userPlan");

    // Block expensive tools for non-pro users
    if (tool.name === "search_web" && plan !== "pro") {
      throw new ToolDeniedError({
        toolName: tool.name,
        message: "Pro plan required to use web search.",
        code: "TOOL_PLAN_REQUIRED",
        httpStatus: 402,
      });
    }
  },
});
```

Catching the denial:

```ts
import { isToolDeniedError } from "@voltagent/core";

try {
  const res = await agent.generateText("Please search the web", { hooks });
} catch (err) {
  if (isToolDeniedError(err)) {
    console.log("Tool denied:", {
      tool: err.name,
      status: err.httpStatus,
      code: err.code,
      message: err.message,
    });
    // Show upgrade UI, redirect, etc.
  } else {
    console.error("Operation failed:", err);
  }
}
```

Allowed `code` values:

- `TOOL_ERROR`
- `TOOL_FORBIDDEN`
- `TOOL_PLAN_REQUIRED`
- `TOOL_QUOTA_EXCEEDED`
- Custom codes (e.g., `"TOOL_REGION_BLOCKED"`)

### Multi-modal Tool Results

Tools can return images and media content to the LLM using the `toModelOutput` function. This enables visual workflows where tools can provide screenshots, generated images, or other media for the LLM to analyze.

**Supported Providers:** Anthropic, OpenAI

#### Screenshot Tool Example

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";
import fs from "fs";

const screenshotTool = tool({
  description: "Takes a screenshot of the screen",
  inputSchema: z.object({
    region: z.string().optional().describe("Region to capture"),
  }),
  execute: async ({ region }) => {
    // Take screenshot and return base64
    const imageData = fs.readFileSync("./screenshot.png").toString("base64");

    return {
      type: "image",
      data: imageData,
      timestamp: new Date().toISOString(),
    };
  },
  // Convert output to multi-modal content for LLM
  toModelOutput: ({ output }) => ({
    type: "content",
    value: [
      {
        type: "text",
        text: `Screenshot captured at ${output.timestamp}`,
      },
      {
        type: "media",
        data: output.data,
        mediaType: "image/png",
      },
    ],
  }),
});
```

#### Return Formats

The `toModelOutput` function can return different content types:

**Text only:**

```ts
toModelOutput: ({ output }) => ({
  type: "text",
  value: "Operation completed successfully",
});
```

**JSON data:**

```ts
toModelOutput: ({ output }) => ({
  type: "json",
  value: { status: "success", data: output },
});
```

**Multi-modal (text + image):**

```ts
toModelOutput: ({ output }) => ({
  type: "content",
  value: [
    { type: "text", text: "Here is the image:" },
    { type: "media", data: output.base64, mediaType: "image/png" },
  ],
});
```

**Error handling:**

```ts
toModelOutput: ({ output }) => {
  if (output.error) {
    return {
      type: "error-text",
      value: `Failed: ${output.error}`,
    };
  }
  return {
    type: "text",
    value: output.result,
  };
};
```

Learn more: [AI SDK Multi-modal Tool Results](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results)

## Best Practices

### Clear Descriptions

Provide clear descriptions for tools and parameters. The model relies on these to understand when and how to use tools.

**Bad:**

```ts
const badTool = tool({
  description: "Searches things", // Too vague
  inputSchema: z.object({
    q: z.string(), // No description
  }),
  execute: async (args) => {
    /* ... */
  },
});
```

**Good:**

```ts
const goodTool = tool({
  description:
    "Searches the web for current information. Use when you need recent or factual information not in your training data.",
  inputSchema: z.object({
    query: z.string().describe("The search query. Be specific about what information is needed."),
    results_count: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results to return. Defaults to 3."),
  }),
  execute: async (args) => {
    /* ... */
  },
});
```

### Error Handling

Implement error handling that provides useful feedback to the model.

```ts
execute: async (args) => {
  try {
    const result = await performOperation(args);
    return result;
  } catch (error) {
    throw new Error(`Failed to process request: ${error.message}`);
  }
};
```

### Timeout Handling

For long-running operations, implement timeouts using `AbortController`.

```ts
execute: async (args, options) => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort("Operation timed out");
  }, 5000);

  try {
    // Listen to parent abort if provided
    if (options.abortSignal) {
      options.abortSignal.addEventListener("abort", () => {
        timeoutController.abort("Parent operation aborted");
        clearTimeout(timeoutId);
      });
    }

    const result = await fetch(url, {
      signal: timeoutController.signal,
    });
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
```

## MCP (Model Context Protocol) Support

VoltAgent supports the [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/mcp), allowing agents to connect with external MCP-compatible servers and tools.

### Using MCP Tools

Connect to MCP servers and use their tools with your agents:

```ts
import { Agent, MCPConfiguration } from "@voltagent/core";

// Configure MCP servers
const mcpConfig = new MCPConfiguration({
  servers: {
    // HTTP server
    browserTools: {
      type: "http",
      url: "https://your-mcp-server.example.com/browser",
    },
    // Local stdio server
    localAI: {
      type: "stdio",
      command: "python",
      args: ["local_ai_server.py"],
    },
  },
});

// Get tools grouped by server
const toolsets = await mcpConfig.getToolsets();
const browserToolsOnly = toolsets.browserTools.getTools();

// Or get all tools combined
const allMcpTools = await mcpConfig.getTools();

// Create agent with MCP tools
const agent = new Agent({
  name: "MCP-Enhanced Assistant",
  description: "Assistant with MCP tools",
  model: "openai/gpt-4o",
  tools: allMcpTools,
});
```

For detailed MCP setup and usage, see the [MCP documentation](./mcp/mcp.md).
