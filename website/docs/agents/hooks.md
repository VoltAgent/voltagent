---
title: Hooks
slug: /agents/hooks
---

# Hooks

Hooks provide points within the agent's execution lifecycle where you can inject custom logic. They allow you to run code before an agent starts processing, after it finishes, before and after it uses a tool, or when tasks are handed off between agents in a multi-agent system.

This is useful for logging, monitoring, adding validation, managing resources, or modifying behavior.

## Creating and Using Hooks

The recommended way to define hooks is using the `createHooks` helper function. This creates a typed hooks object that can be passed to one or more agents during initialization.

```ts
import {
  Agent,
  createHooks,
  type AgentTool,
  type AgentOperationOutput, // Unified success output type
  type VoltAgentError, // Standardized error type
  type ChatMessage, // Vercel AI SDK compatible message format
  type OnStartHookArgs, // Argument types for hooks
  type OnEndHookArgs,
  type OnToolStartHookArgs,
  type OnToolEndHookArgs,
  type OnHandoffHookArgs,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define a collection of hooks using the helper
const myAgentHooks = createHooks({
  /**
   * Called before the agent starts processing a request.
   */
  onStart: async (args: OnStartHookArgs) => {
    const { agent, context } = args;
    console.log(`[Hook] Agent ${agent.name} starting interaction at ${new Date().toISOString()}`);
    console.log(`[Hook] Operation ID: ${context.operationId}`);
  },

  /**
   * Called after the agent finishes processing a request, successfully or with an error.
   */
  onEnd: async (args: OnEndHookArgs) => {
    const { agent, output, error, messages, context } = args;
    if (error) {
      console.error(`[Hook] Agent ${agent.name} finished with error:`, error.message);
      console.log(`[Hook] User input was:`, messages[0]?.content);
      // Log detailed error info
      console.error(`[Hook] Error Details:`, JSON.stringify(error, null, 2));
    } else if (output) {
      console.log(`[Hook] Agent ${agent.name} finished successfully.`);
      console.log(`[Hook] Conversation turn:`, {
        userInput: messages[0]?.content,
        assistantResponse: messages[1]?.content,
      });

      // Example: Log usage or analyze the result based on output type
      if ("usage" in output && output.usage) {
        console.log(`[Hook] Token Usage: ${output.usage.totalTokens}`);
      }
      if ("text" in output && output.text) {
        console.log(`[Hook] Final text length: ${output.text.length}`);
      }
      if ("object" in output && output.object) {
        console.log(`[Hook] Final object keys: ${Object.keys(output.object).join(", ")}`);
      }
    }
  },

  /**
   * Called just before a tool's execute function is called.
   */
  onToolStart: async (args: OnToolStartHookArgs) => {
    const { agent, tool, context } = args;
    console.log(`[Hook] Agent ${agent.name} starting tool: ${tool.name}`);
    // Example: Validate tool inputs or log intent
  },

  /**
   * Called after a tool's execute function completes or throws.
   */
  onToolEnd: async (args: OnToolEndHookArgs) => {
    const { agent, tool, output, error, context } = args;
    if (error) {
      console.error(`[Hook] Tool ${tool.name} failed with error:`, error.message);
      // Log detailed tool error
      console.error(`[Hook] Tool Error Details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`[Hook] Tool ${tool.name} completed successfully with result:`, output);
      // Example: Log tool output or trigger follow-up actions
    }
  },

  /**
   * Called when a task is handed off from a source agent to this agent (in sub-agent scenarios).
   */
  onHandoff: async (args: OnHandoffHookArgs) => {
    const { agent, sourceAgent } = args;
    console.log(`[Hook] Task handed off from ${sourceAgent.name} to ${agent.name}`);
    // Example: Track collaboration flow in multi-agent systems
  },
});

// Define a placeholder provider for the example
const provider = new VercelAIProvider();

// Assign the hooks when creating an agent
const agentWithHooks = new Agent({
  name: "My Agent with Hooks",
  instructions: "An assistant demonstrating hooks",
  llm: provider,
  model: openai("gpt-4o"),
  // Pass the hooks object during initialization
  hooks: myAgentHooks,
});

// Alternatively, define hooks inline (less reusable)
const agentWithInlineHooks = new Agent({
  name: "Inline Hooks Agent",
  instructions: "Another assistant",
  llm: provider,
  model: openai("gpt-4o"),
  hooks: {
    onStart: async ({ agent, context }) => {
      // Use object destructuring
      /* ... */
    },
    onEnd: async ({ agent, output, error, context }) => {
      /* ... */
    },
    // ... other inline hooks ...
  },
});
```

## Available Hooks

All hooks receive a single argument object containing relevant information.

### `onStart`

- **Triggered:** Before the agent begins processing a request (`generateText`, `streamText`, etc.).
- **Argument Object (`OnStartHookArgs`):** `{ agent: Agent, context: OperationContext }`
- **Use Cases:** Initialization logic, request logging, setting up request-scoped resources.

```ts
// Example: Log the start of an operation
onStart: async ({ agent, context }) => {
  console.log(`Agent ${agent.name} starting operation ${context.operationId}`);
};
```

### `onEnd`

- **Triggered:** After the agent finishes processing a request, either successfully or with an error.
- **Argument Object (`OnEndHookArgs`):** `{ agent: Agent, output: AgentOperationOutput | undefined, error: VoltAgentError | undefined, conversationId: string, context: OperationContext }`
- **Use Cases:** Cleanup logic, logging completion status and results (success or failure), analyzing final output or error details, recording usage statistics, storing conversation history.
- **Note:** The `output` object's specific structure within the `AgentOperationOutput` union depends on the agent method called. Check for specific fields (`text`, `object`) or use type guards. `error` will contain the structured `VoltAgentError` on failure.

```ts
// Example: Log the outcome of an operation and store conversation history
onEnd: async ({ agent, output, error, conversationId, context }) => {
  if (error) {
    console.error(`Agent ${agent.name} operation ${context.operationId} failed: ${error.message}`);
    console.log(`User input: "${context.historyEntry.input}"`);
    // Only user input available on error (no assistant response)
  } else {
    // Check output type if needed
    if (output && "text" in output) {
      console.log(
        `Agent ${agent.name} operation ${context.operationId} succeeded with text output.`
      );
    } else if (output && "object" in output) {
      console.log(
        `Agent ${agent.name} operation ${context.operationId} succeeded with object output.`
      );
    } else {
      console.log(`Agent ${agent.name} operation ${context.operationId} succeeded.`);
    }

    // Log the complete conversation flow
    console.log(`Conversation flow:`, {
      user: context.historyEntry.input,
      assistant: context.steps, // the assistant steps
      totalMessages: context.steps.length,
      toolInteractions: context.steps.flatMap((s) => s.toolInvocations || []).length,
      toolsUsed: context.steps.flatMap((s) => s.toolInvocations || []).map((t) => t.toolName),
    });

    // Log usage if available
    if (output?.usage) {
      console.log(`  Usage: ${output.usage.totalTokens} tokens`);
    }
  }
};
```

### `onToolStart`

- **Triggered:** Just before an agent executes a specific tool.
- **Argument Object (`OnToolStartHookArgs`):** `{ agent: Agent, tool: AgentTool, context: OperationContext }`
- **Use Cases:** Logging tool usage intent, validating tool inputs (though typically handled by Zod schema), modifying tool arguments (use with caution).

```ts
// Example: Log when a tool is about to be used
onToolStart: async ({ agent, tool, context }) => {
  console.log(
    `Agent ${agent.name} invoking tool '${tool.name}' for operation ${context.operationId}`
  );
};
```

### `onToolEnd`

- **Triggered:** After a tool's `execute` function successfully completes or fails.
- **Argument Object (`OnToolEndHookArgs`):** `{ agent: Agent, tool: AgentTool, output: unknown | undefined, error: VoltAgentError | undefined, context: OperationContext }`
- **Use Cases:** Logging tool results or errors, post-processing tool output, triggering subsequent actions based on tool success or failure.

```ts
// Example: Log the result or error of a tool execution
onToolEnd: async ({ agent, tool, output, error, context }) => {
  if (error) {
    console.error(
      `Tool '${tool.name}' failed in operation ${context.operationId}: ${error.message}`
    );
  } else {
    console.log(
      `Tool '${tool.name}' succeeded in operation ${context.operationId}. Result:`,
      output
    );
  }
};
```

### `onHandoff`

- **Triggered:** When one agent delegates a task to another agent (using the `delegate_task` tool in a sub-agent setup).
- **Argument Object (`OnHandoffHookArgs`):** `{ agent: Agent, sourceAgent: Agent }`
- **Use Cases:** Tracking and visualizing workflow in multi-agent systems, adding context during agent collaboration.

```ts
// Example: Log agent handoffs
onHandoff: async ({ agent, sourceAgent }) => {
  console.log(`Task handed off from agent '${sourceAgent.name}' to agent '${agent.name}'`);
};
```

## Asynchronous Hooks and Error Handling

- **Async Nature:** Hooks can be defined as `async` functions. VoltAgent will `await` the completion of each hook before proceeding. Be mindful that long-running asynchronous operations within hooks can add latency to the overall agent response time.
- **Error Handling:** If an error is thrown _inside_ a hook function and not caught within the hook itself, it may interrupt the agent's execution flow. It's recommended to handle potential errors within your hook logic using `try...catch` if necessary, or ensure hooks are designed to be reliable.

## Common Use Cases

Hooks enable a variety of powerful patterns:

1.  **Logging & Observability**: Track agent execution steps, timings, inputs, outputs, and errors for monitoring and debugging.
2.  **Analytics**: Collect detailed usage data (token counts, tool usage frequency, success/error rates) for analysis.
3.  **Request/Response Modification**: (Use with caution) Modify inputs before processing or outputs after generation.
4.  **State Management**: Initialize or clean up request-specific state or resources.
5.  **Workflow Orchestration**: Trigger external actions or notifications based on agent events (e.g., notify on tool failure or successful completion with specific output).
6.  **UI Integration**: You can leverage the `@voltagent/vercel-ui` package to convert the `OperationContext` to a list of messages that can be used with the Vercel AI SDK (see below example).

## Examples

### Vercel UI Integration Example

Here's an example of how you can use the `@voltagent/vercel-ui` package to convert the `OperationContext` to a list of messages that can be used with the Vercel AI SDK:

```ts
import { convertToUIMessages } from "@voltagent/vercel-ui";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { Agent } from "@voltagent/core";

const agent = new Agent({
  id: "assistant",
  name: "Assistant",
  purpose: "A helpful assistant that can answer questions and help with tasks.",
  instructions: "You are a helpful assistant that can answer questions and help with tasks.",
  model: "gpt-4.1-mini",
  llm: new VercelAIProvider(),
  hooks: {
    onEnd: async (result) => {
      await chatStore.save({
        conversationId: result.conversationId,
        messages: convertToUIMessages(result.operationContext),
      });
    },
  },
});

const result = await agent.generateText("Hello, how are you?");

// You can now fetch the messages from your custom chat store and return to the UI to provide a
// history of the conversation.

app.get("/api/chats/:id", async ({ req }) => {
  const conversation = await chatStore.read(req.param("id"));
  return Response.json(conversation.messages);
});
```

### Full Conversation Flow Example

Here's an example showing how the `messages` parameter includes complete conversation flow with tool interactions:

```ts
const conversationHooks = createHooks({
  onEnd: async ({ agent, output, error, messages, context }) => {
    // Example messages array for a successful operation with tool usage (ChatMessage format):
    // [
    //   {
    //     id: "msg_1",
    //     role: "user",
    //     content: "What's the weather in San Francisco?",
    //     createdAt: new Date()
    //   },
    //   {
    //     id: "msg_2",
    //     role: "assistant",
    //     content: "The weather in San Francisco is 8°C and rainy with 86% humidity.",
    //     createdAt: new Date(),
    //     toolInvocations: [
    //       {
    //         toolCallId: "call_mmZhyZwnheCjZQCRxFPR14pF",
    //         toolName: "getWeather",
    //         args: { location: "San Francisco" },
    //         result: {
    //           weather: { location: "San Francisco", temperature: 8, condition: "Rainy", humidity: 86, windSpeed: 14 },
    //           message: "Current weather in San Francisco: 8°C and rainy with 86% humidity."
    //         },
    //         state: "result",
    //         step: 0
    //       }
    //     ]
    //   }
    // ]

    if (!error && output) {
      // Store complete conversation including tool interactions
      await storeConversation({
        operationId: context.operationId,
        messages: messages, // Full conversation flow
        usage: output.usage,
        timestamp: new Date(),
      });

      // Check if tools were used
      const toolInteractions = messages.flatMap((m) => m.toolInvocations || []);
      if (toolInteractions.length > 0) {
        console.log(`Operation used ${toolInteractions.length} tool(s)`);
        toolInteractions.forEach((tool, i) => {
          console.log(`  Tool ${i + 1}: ${tool.toolName} (${tool.state})`);
        });
      }
    }
  },
});
```
