---
id: hooks
title: Hooks
slug: hooks
description: Add lifecycle hooks to monitor and control agent behavior.
---

# Hooks

Hooks let you intercept and modify agent behavior at key points in the execution lifecycle.

## Available Hooks

| Hook                | When it fires               |
| ------------------- | --------------------------- |
| `onStart`           | Agent begins processing     |
| `onPrepareMessages` | Before messages sent to LLM |
| `onToolStart`       | Before tool execution       |
| `onToolEnd`         | After tool execution        |
| `onEnd`             | Agent finishes processing   |
| `onHandoff`         | Agent hands off to another  |

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, ToolDeniedError } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "HooksDemo",
  instructions: "Agent with lifecycle hooks",
  model: openai("gpt-4o-mini"),

  hooks: {
    onStart: async ({ agent, context }) => {
      console.log(`Agent ${agent.name} started`);
    },

    onToolStart: async ({ tool, args, context }) => {
      console.log(`Tool ${tool.name} starting with args:`, args);

      // Block tools based on conditions
      if (tool.name === "expensive_tool" && context.userId === "guest") {
        throw new ToolDeniedError({
          toolName: tool.name,
          message: "Pro plan required",
          code: "TOOL_FORBIDDEN",
          httpStatus: 403,
        });
      }
    },

    onToolEnd: async ({ tool, output, error }) => {
      if (error) {
        console.error(`Tool ${tool.name} failed:`, error);
      } else {
        console.log(`Tool ${tool.name} completed:`, output);
      }
    },

    onEnd: async ({ conversationId, output, error }) => {
      console.log("Agent finished:", { conversationId, output, error });
    },
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Transform Messages Before LLM

```typescript
hooks: {
  onPrepareMessages: async ({ messages }) => {
    // Add timestamp to user messages
    const enhanced = messages.map((msg) =>
      messageHelpers.addTimestampToMessage(msg, new Date().toISOString())
    );
    return { messages: enhanced };
  },
}
```

## Full Example

See the complete example: [with-hooks on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-hooks)
