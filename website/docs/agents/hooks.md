---
title: Hooks
slug: /agents/hooks
---

# Agent Hooks

Hooks intercept specific points in the agent execution pipeline. Use them to observe or modify behavior during agent operations: before a request starts, when preparing messages for the LLM, before and after tool execution, or after completion.

## Defining Hooks

Define hooks using the `createHooks` helper function. Pass the resulting object to the Agent constructor, or to individual method calls like `generateText` and `streamText`.

```ts
import {
  Agent,
  createHooks,
  messageHelpers,
  type AgentTool,
  type AgentOperationOutput,
  type VoltAgentError,
  type OnStartHookArgs,
  type OnEndHookArgs,
  type OnPrepareMessagesHookArgs,
  type OnPrepareModelMessagesHookArgs,
  type OnToolStartHookArgs,
  type OnToolEndHookArgs,
  type OnHandoffHookArgs,
} from "@voltagent/core";

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
   * Called after VoltAgent sanitizes UI messages but before the LLM receives them.
   * `rawMessages` contains the unsanitized list for inspection or metadata recovery.
   */
  onPrepareMessages: async (args: OnPrepareMessagesHookArgs) => {
    const { messages, rawMessages, context } = args;
    console.log(`Preparing ${messages.length} sanitized messages for LLM`);

    // Add timestamp to each message
    const timestamp = new Date().toLocaleTimeString();
    const enhanced = messages.map((msg) => messageHelpers.addTimestampToMessage(msg, timestamp));

    if (rawMessages) {
      // Access raw message structure for audit logging
      console.debug(`First raw message parts:`, rawMessages[0]?.parts);
    }

    return { messages: enhanced };
  },

  /**
   * Called after UI messages are converted into provider-specific ModelMessage objects.
   */
  onPrepareModelMessages: async (args: OnPrepareModelMessagesHookArgs) => {
    const { modelMessages, uiMessages } = args;
    console.log(`Model payload contains ${modelMessages.length} messages`);

    // Inject a system message if none exists
    if (!modelMessages.some((msg) => msg.role === "system")) {
      return {
        modelMessages: [
          {
            role: "system",
            content: [{ type: "text", text: "Operate within safety budget" }],
          },
          ...modelMessages,
        ],
      };
    }

    return {};
  },

  /**
   * Called after the agent completes a request (success or failure).
   */
  onEnd: async (args: OnEndHookArgs) => {
    const { agent, output, error, context } = args;
    if (error) {
      console.error(`[Hook] Agent ${agent.name} finished with error:`, error.message);
      console.error(`[Hook] Error Details:`, JSON.stringify(error, null, 2));
    } else if (output) {
      console.log(`[Hook] Agent ${agent.name} finished successfully.`);
      // Log usage or inspect output type
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
   * Called before a tool executes.
   */
  onToolStart: async (args: OnToolStartHookArgs) => {
    const { agent, tool, context, args: toolArgs } = args;
    console.log(`[Hook] Agent ${agent.name} starting tool: ${tool.name}`);
    console.log(`[Hook] Tool arguments:`, toolArgs);
  },

  /**
   * Called after a tool completes or throws an error.
   */
  onToolEnd: async (args: OnToolEndHookArgs) => {
    const { agent, tool, output, error, context } = args;
    if (error) {
      console.error(`[Hook] Tool ${tool.name} failed:`, error.message);
      console.error(`[Hook] Tool Error Details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`[Hook] Tool ${tool.name} completed with result:`, output);
    }
  },

  /**
   * Called when a task is handed off from a source agent to this agent.
   */
  onHandoff: async (args: OnHandoffHookArgs) => {
    const { agent, sourceAgent } = args;
    console.log(`[Hook] Task handed off from ${sourceAgent.name} to ${agent.name}`);
  },
});

// Pass hooks to the Agent constructor
const agentWithHooks = new Agent({
  name: "My Agent with Hooks",
  instructions: "An assistant demonstrating hooks",
  model: "openai/gpt-4o",
  hooks: myAgentHooks,
});

// Or define hooks inline
const agentWithInlineHooks = new Agent({
  name: "Inline Hooks Agent",
  instructions: "Another assistant",
  model: "openai/gpt-4o",
  hooks: {
    onStart: async ({ agent, context }) => {
      /* ... */
    },
    onEnd: async ({ agent, output, error, context }) => {
      /* ... */
    },
  },
});
```

## Passing Hooks to Methods

Pass hooks to `generateText`, `streamText`, `generateObject`, or `streamObject` to run hooks for that specific invocation only.

:::warning
Method-level hooks do not override agent-level hooks. Both will execute. For most hooks, the method-level hook runs first, then the agent-level hook. For `onPrepareMessages` and `onPrepareModelMessages`, the method-level hook replaces the agent-level hook entirely.
:::

```ts
const agent = new Agent({
  name: "My Agent with Hooks",
  instructions: "An assistant demonstrating hooks",
  model: "openai/gpt-4o",
  hooks: myAgentHooks,
});

await agent.generateText("Hello, how are you?", {
  hooks: {
    onEnd: async ({ context }) => {
      console.log("End of generation for this invocation!");
    },
  },
});
```

For example, store conversation history only for specific endpoints:

```ts
const agent = new Agent({
  name: "Translation Agent",
  instructions: "A translation agent that translates text from English to French",
  model: "openai/gpt-4o",
});

// for the translate endpoint, we don't want to store the conversation history
app.post("/api/translate", async (req, res) => {
  const result = await agent.generateText(req.body.text);
  return result;
});

// for the chat endpoint, we want to store the conversation history
app.post("/api/translate/chat", async (req, res) => {
  const result = await agent.streamText(req.body.text, {
    hooks: {
      onEnd: async ({ context }) => {
        await chatStore.save({
          conversationId: context.conversationId,
          messages: context.steps,
        });
      },
    },
  });

  return result.textStream;
});
```

## Available Hooks

All hooks receive a single argument object containing relevant information.

### Choosing the right message hook

| Hook                     | Stage                                                              | When to use                                                                                           |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `onPrepareMessages`      | Operates on sanitized `UIMessage[]` built from memory + user input | Transform messages using helper functions, redact content, or access `rawMessages` for logging.       |
| `onPrepareModelMessages` | Runs after `convertToModelMessages` on `ModelMessage[]`            | Apply provider-specific adjustments, inject system directives, or modify the final payload structure. |

Use `onPrepareMessages` for general transformations and `onPrepareModelMessages` for provider-specific adjustments. Both hooks can be used together; VoltAgent applies them in that order.

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

### `onPrepareMessages`

- **Triggered:** After VoltAgent assembles conversation history and sanitizes UI messages, before conversion to provider-specific payloads.
- **Argument Object (`OnPrepareMessagesHookArgs`):** `{ messages: UIMessage[], rawMessages?: UIMessage[], context: OperationContext, agent: Agent }`
- **Use Cases:** Transform sanitized messages (add timestamps, redact content), or access `rawMessages` for logging or metadata recovery.
- **Return:** `{ messages: UIMessage[] }` to replace the sanitized list, or an empty object to keep the original.
- **Notes:**
  - `messages` contains sanitized UI messages safe for the LLM.
  - `rawMessages` contains the full structure before sanitization, useful for logging or metadata reconstruction.

```ts
onPrepareMessages: async ({ messages, rawMessages }) => {
  const tagged = messages.map((msg) =>
    messageHelpers.addTimestampToMessage(msg, new Date().toISOString())
  );

  if (rawMessages) {
    auditTrail.write(rawMessages); // your own analytics sink
  }

  return { messages: tagged };
};
```

### `onPrepareModelMessages`

- **Triggered:** After UI messages are converted via `convertToModelMessages`, immediately before the provider receives them.
- **Argument Object (`OnPrepareModelMessagesHookArgs`):** `{ modelMessages: ModelMessage[], uiMessages: UIMessage[], context: OperationContext, agent: Agent }`
- **Use Cases:** Apply provider-specific transformations, inject final system messages, compress conversation length, or add structured metadata.
- **Return:** `{ modelMessages: ModelMessage[] }` with a replacement list, or an empty object to keep the original.
- **Tip:** Use `onPrepareMessages` for general transformations, and this hook for provider-specific adjustments.

```ts
onPrepareModelMessages: async ({ modelMessages }) => {
  // Force the last message to include a "speak clearly" reminder for voice models
  const last = modelMessages.at(-1);
  if (last && last.role === "user" && Array.isArray(last.content)) {
    last.content.push({ type: "text", text: "Please answer succinctly." });
  }

  return { modelMessages };
};
```

### `onEnd`

- **Triggered:** After the agent completes processing a request (success or failure).
- **Argument Object (`OnEndHookArgs`):** `{ agent: Agent, output: AgentOperationOutput | undefined, error: VoltAgentError | undefined, conversationId: string, context: OperationContext }`
- **Use Cases:** Cleanup, logging, analyzing output or errors, recording usage statistics, storing conversation history.
- **Note:** The `output` structure depends on the method called. Check for `text` or `object` fields. `error` contains the structured `VoltAgentError` on failure.

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

    // Access input and output directly from context
    console.log("Request input:", context.input);
    console.log("Generated output:", context.output);

    // Log the complete conversation flow
    console.log(`Conversation flow:`, {
      user: context.historyEntry.input,
      assistant: context.steps, // the assistant steps
      totalMessages: context.steps.length,
      toolInteractions: context.steps.flatMap((s) => s.toolInvocations || []).length,
      toolsUsed: context.steps.flatMap((s) => s.toolInvocations || []).map((t) => t.toolName),
    });

    // Log complete interaction using input/output
    console.log("Full interaction:", {
      input: context.input,
      output: context.output,
      userId: context.userId,
      conversationId: context.conversationId,
      operationId: context.operationId,
    });

    // Log usage if available
    if (output?.usage) {
      console.log(`  Usage: ${output.usage.totalTokens} tokens`);
    }
  }
};
```

### `onToolStart`

- **Triggered:** Before an agent executes a tool.
- **Argument Object (`OnToolStartHookArgs`):** `{ agent: Agent, tool: AgentTool, args: any, context: OperationContext }`
- **Use Cases:** Logging tool usage, inspecting tool arguments, or validating inputs before execution.

```ts
// Example: Log tool invocation with arguments
onToolStart: async ({ agent, tool, args, context }) => {
  console.log(`Agent ${agent.name} invoking tool '${tool.name}'`);
  console.log(`Tool arguments:`, args);
};
```

### `onToolEnd`

- **Triggered:** After a tool execution completes or throws an error.
- **Argument Object (`OnToolEndHookArgs`):** `{ agent: Agent, tool: AgentTool, output: unknown | undefined, error: VoltAgentError | undefined, context: OperationContext }`
- **Use Cases:** Logging tool results or errors, post-processing output, triggering actions based on success or failure.

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

- **Triggered:** When one agent delegates a task to another agent via the `delegate_task` tool.
- **Argument Object (`OnHandoffHookArgs`):** `{ agent: Agent, sourceAgent: Agent }`
- **Use Cases:** Tracking workflow in multi-agent systems, logging agent collaboration.

```ts
// Example: Log agent handoffs
onHandoff: async ({ agent, sourceAgent }) => {
  console.log(`Task handed off from agent '${sourceAgent.name}' to agent '${agent.name}'`);
};
```

## Hook Execution and Error Handling

- **Async Execution:** Hooks can be `async` functions. VoltAgent awaits completion before proceeding. Long-running operations in hooks add latency to agent response time.
- **Error Handling:** Errors thrown inside hooks may interrupt agent execution. Use `try...catch` within hooks or design them to be reliable.
- **Hook Merging:** When hooks are passed to both the Agent constructor and a method call:
  - Most hooks (`onStart`, `onEnd`, `onError`, `onHandoff`, `onToolStart`, `onToolEnd`, `onStepFinish`) execute both: method-level first, then agent-level.
  - Message hooks (`onPrepareMessages`, `onPrepareModelMessages`) do not merge: method-level replaces agent-level entirely.

## Additional Hooks

Two additional hooks exist for advanced use cases:

- **`onError`**: Called when an error occurs during agent execution. Receives `{ agent: Agent, error: Error, context: OperationContext }`.
- **`onStepFinish`**: Called after each step in multi-step agent execution. Receives `{ agent: Agent, step: any, context: OperationContext }`.

## Common Use Cases

1.  **Logging & Observability**: Track execution steps, timings, inputs, outputs, and errors.
2.  **Analytics**: Collect usage data (token counts, tool usage frequency, success/error rates).
3.  **Message Transformation**: Modify messages before they reach the LLM or provider.
4.  **State Management**: Initialize or clean up request-specific resources.
5.  **Workflow Orchestration**: Trigger external actions based on agent events.
6.  **UI Integration**: Convert `OperationContext` to messages for the Vercel AI SDK using `@voltagent/vercel-ui`.

## Examples

### Message Transformation with onPrepareMessages

Transform messages before they reach the LLM using `onPrepareMessages` and message helper functions:

```ts
import { Agent, createHooks, messageHelpers } from "@voltagent/core";

const enhancedHooks = createHooks({
  onPrepareMessages: async ({ messages, context }) => {
    const enhanced = messages.map((msg) => {
      // Add timestamps to user messages
      if (msg.role === "user") {
        const timestamp = new Date().toLocaleTimeString();
        msg = messageHelpers.addTimestampToMessage(msg, timestamp);
      }

      // Redact sensitive data
      msg = messageHelpers.mapMessageContent(msg, (text) => {
        text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN-REDACTED]");
        text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CC-REDACTED]");
        return text;
      });

      return msg;
    });

    // Add context based on user
    if (context.context?.get && context.context.get("userId")) {
      const systemContext = {
        role: "system" as const,
        content: `User ID: ${context.context.get("userId")}. Provide personalized responses.`,
      };
      enhanced.unshift(systemContext);
    }

    return { messages: enhanced };
  },

  onEnd: async ({ output, context }) => {
    console.log(`Messages processed for operation ${context.operationId}`);
    if (output?.usage) {
      console.log(`Tokens used: ${output.usage.totalTokens}`);
    }
  },
});

const agent = new Agent({
  name: "Privacy-Aware Assistant",
  instructions: "A helpful assistant that protects user privacy",
  model: "openai/gpt-4o-mini",
  hooks: enhancedHooks,
});

// User message: "My SSN is 123-45-6789"
// LLM receives: "[10:30:45] My SSN is [SSN-REDACTED]"
```

### Inspecting Output in onEnd

The `output` parameter structure depends on the agent method called. Check for `text` or `object` fields:

```ts
const hooks = createHooks({
  onEnd: async ({ output }) => {
    if (!output) return; // operation failed or was aborted

    // Log usage if available
    if (output.usage) {
      console.log(`Total tokens: ${output.usage.totalTokens}`);
    }

    // Handle text results
    if ("text" in output && output.text) {
      console.log("Final text:", output.text);
      return;
    }

    // Handle object results
    if ("object" in output && output.object) {
      console.log("Final object keys:", Object.keys(output.object));
    }
  },
});
```
