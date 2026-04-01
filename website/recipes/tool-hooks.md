---
id: tool-hooks
title: Tool Hooks
slug: tool-hooks
description: Override or post-process tool results with tool-level and agent-level hooks.
---

# Tool Hooks

Use tool hooks to observe execution and optionally replace tool outputs. Tool-level hooks run first, then agent `onToolEnd` runs and can override the result again.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, createTool, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const normalizeTool = createTool({
  name: "normalize_text",
  description: "Normalize and cap text length",
  parameters: z.object({ text: z.string() }),
  execute: async ({ text }) => text,
  hooks: {
    onStart: ({ tool }) => {
      console.log(`[tool] ${tool.name} starting`);
    },
    onEnd: ({ output }) => {
      if (typeof output === "string") {
        return { output: output.slice(0, 1000) };
      }
    },
  },
});

const agent = new Agent({
  name: "ToolHooksAgent",
  instructions: "Use tools when needed.",
  model: openai("gpt-4o-mini"),
  tools: [normalizeTool],
  hooks: {
    onToolEnd: ({ output }) => {
      if (typeof output === "string") {
        return { output: output.trim() };
      }
    },
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Notes

- Tool hook parameters:
  - `onStart`: `{ tool, args, options }`
  - `onEnd`: `{ tool, args, output, error, options }` (return `{ output }` to override)
- Agent `onToolEnd` receives `{ agent, tool, output, error, context, options }` and can also return `{ output }`.
- Overrides are re-validated if the tool has an `outputSchema`.
- For streaming tools (AsyncIterable), overrides apply to the final output only.
- These hooks also work with `PlanAgent`.
