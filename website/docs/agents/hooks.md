---
title: Hooks
slug: /agents/hooks
---

# Hooks

Hooks provide guardrails and extension points across the agent pipeline. As a developer you can intercept state before a call starts, reshape messages right before the LLM sees them, watch tool invocations, or react when a run finishes. Each hook gives you a predictable place to add observability, enforce policy, or tailor behaviour without forking the core runtime.

## Creating and Using Hooks

The recommended way to define hooks is using the `createHooks` helper function. This creates a typed hooks object that can be passed to one or more agents during initialization.

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
   * Runs after VoltAgent sanitizes UI messages but before the LLM sees them.
   * `rawMessages` exposes the unsanitized list if you need to diff or reuse metadata.
   */
  onPrepareMessages: async (args: OnPrepareMessagesHookArgs) => {
    const { messages, rawMessages, context } = args;
    console.log(`Preparing ${messages.length} sanitized messages for LLM`);

    // Example: copy over any safe metadata stripped during sanitization
    const timestamp = new Date().toLocaleTimeString();
    const enhanced = messages.map((msg) => messageHelpers.addTimestampToMessage(msg, timestamp));

    if (rawMessages) {
      // Inspect raw content for audit without mutating the sanitized payload
      console.debug(`First raw message parts:`, rawMessages[0]?.parts);
    }

    return { messages: enhanced };
  },

  /**
   * Runs once UI messages are converted into provider-specific ModelMessage objects.
   */
  onPrepareModelMessages: async (args: OnPrepareModelMessagesHookArgs) => {
    const { modelMessages, uiMessages } = args;
    console.log(`Model payload contains ${modelMessages.length} messages`);

    // Example: inject a final system reminder computed from the UI layer
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
   * Called after the agent finishes processing a request, successfully or with an error.
   */
  onEnd: async (args: OnEndHookArgs) => {
    const { agent, output, error, context } = args;
    if (error) {
      console.error(`[Hook] Agent ${agent.name} finished with error:`, error.message);
      console.error(`[Hook] Error Details:`, JSON.stringify(error, null, 2));
    } else if (output) {
      console.log(`[Hook] Agent ${agent.name} finished successfully.`);
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
// Choose an ai-sdk provider and model in your Agent via the `model` option

// Assign the hooks when creating an agent
const agentWithHooks = new Agent({
  name: "My Agent with Hooks",
  instructions: "An assistant demonstrating hooks",
  model: openai("gpt-4o"),
  // Pass the hooks object during initialization
  hooks: myAgentHooks,
});

// Alternatively, define hooks inline (less reusable)
const agentWithInlineHooks = new Agent({
  name: "Inline Hooks Agent",
  instructions: "Another assistant",
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

## Passing hooks to generate methods

You can pass hooks to the `generateText`, `streamText`, `generateObject`, and `streamObject` methods, directly to run the hooks only on that invocation.

:::warning
This will NOT override the hooks passed to the agent during initialization.
:::

```ts
const agent = new Agent({
  name: "My Agent with Hooks",
  instructions: "An assistant demonstrating hooks",
  model: openai("gpt-4o"),
  hooks: myAgentHooks,
});

await agent.generateText("Hello, how are you?", {
  hooks: {
    onEnd: async ({ context }) => {
      console.log("End of generation but only on this invocation!");
    },
  },
});
```

An example of this is you may want to only store the conversation history for a specific invocation, but not for all usages of the agent:

```ts
const agent = new Agent({
  name: "Translation Agent",
  instructions: "A translation agent that translates text from English to French",
  model: openai("gpt-4o"),
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

| Hook                     | Stage                                                              | When to use                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `onPrepareMessages`      | Operates on sanitized `UIMessage[]` built from memory + user input | Ideal when you need helper-friendly transforms (timestamps, filters) or access to the unsanitized list via `rawMessages` for analytics. |
| `onPrepareModelMessages` | Runs after `convertToModelMessages` on `ModelMessage[]`            | Use for provider quirks, payload compression, or last-minute system directives that rely on protocol-level structure.                   |

Most teams keep general business logic in `onPrepareMessages` and reserve `onPrepareModelMessages` for provider-specific adjustments. Both hooks can be combined; VoltAgent applies them in that order.

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

- **Triggered:** After VoltAgent assembles conversation history and sanitizes UI messages but before they are converted to provider-specific payloads.
- **Argument Object (`OnPrepareMessagesHookArgs`):** `{ messages: UIMessage[], rawMessages?: UIMessage[], context: OperationContext, agent: Agent }`
- **Use Cases:** Transform the sanitized payload (timestamps, sentiment tags), redact sensitive content, or read `rawMessages` to restore metadata that sanitization removed intentionally (file handles, custom fields) without pushing it to the LLM.
- **Return:** `{ messages: UIMessage[] }` to replace the sanitized list, or nothing to keep the sanitized version.
- **Notes:**
  - `messages` are guaranteed safe for the LLM (no blank text parts, no working-memory tool chatter).
  - `rawMessages` preserves the full structure before sanitization, which is useful for logging, comparisons, or reconstructing metadata needed elsewhere.

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

- **Triggered:** After UI messages are converted with `convertToModelMessages`, right before the provider receives them.
- **Argument Object (`OnPrepareModelMessagesHookArgs`):** `{ modelMessages: ModelMessage[], uiMessages: UIMessage[], context: OperationContext, agent: Agent }`
- **Use Cases:** Apply provider-specific tweaks (e.g., convert markdown to plain text for a brittle model), inject final system reminders, collapse conversation for cost savings, or append structured metadata understood by downstream infrastructure.
- **Return:** `{ modelMessages: ModelMessage[] }` with a replacement list, or nothing to ship the original conversion output.
- **Tip:** Combine this hook with `onPrepareMessages`—sanitize/augment in UI space, then do any provider quirks here so the two responsibilities stay separate.

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

### Message Transformation with onPrepareMessages

Here's an example using `onPrepareMessages` with message helpers to enhance messages before they reach the LLM:

```ts
import { Agent, createHooks, messageHelpers } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { openai } from "@ai-sdk/openai";

const enhancedHooks = createHooks({
  onPrepareMessages: async ({ messages, context }) => {
    // Use message helpers for cleaner transformations
    const enhanced = messages.map((msg) => {
      // Add timestamps to user messages
      if (msg.role === "user") {
        const timestamp = new Date().toLocaleTimeString();
        msg = messageHelpers.addTimestampToMessage(msg, timestamp);
      }

      // Filter sensitive data from all messages
      msg = messageHelpers.mapMessageContent(msg, (text) => {
        // Redact SSN patterns
        text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN-REDACTED]");
        // Redact credit card patterns
        text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CC-REDACTED]");
        return text;
      });

      return msg;
    });

    // Add dynamic context based on user
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
    // Log what transformations were applied
    console.log(`Messages processed for operation ${context.operationId}`);
    if (output?.usage) {
      console.log(`Tokens used: ${output.usage.totalTokens}`);
    }
  },
});

const agent = new Agent({
  name: "Privacy-Aware Assistant",
  instructions: "A helpful assistant that protects user privacy",
  model: openai("gpt-4o-mini"),
  model: openai("gpt-4o-mini"),
  hooks: enhancedHooks,
});

// User message: "My SSN is 123-45-6789"
// LLM receives: "[10:30:45] My SSN is [SSN-REDACTED]"
```

### Using output in onEnd

`output` is a union describing the successful result of the operation. You can check for `text` or `object` fields:

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
