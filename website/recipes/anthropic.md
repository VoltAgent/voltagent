---
id: anthropic
title: Anthropic
slug: anthropic
description: Use Claude models with your VoltAgent agents.
---

# Anthropic

Use Anthropic's Claude models as your agent's LLM provider.

## Installation

```bash
npm install @ai-sdk/anthropic
```

## Quick Setup

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    return { location, temperature: 22 };
  },
});

const agent = new Agent({
  name: "Claude Agent",
  instructions: "A helpful assistant powered by Claude",
  model: anthropic("claude-sonnet-4-20250514"),
  tools: [weatherTool],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Environment Variables

```env
ANTHROPIC_API_KEY=your-api-key
```

## Available Models

| Model                       | Description          |
| --------------------------- | -------------------- |
| `claude-opus-4-1`           | Most capable model   |
| `claude-sonnet-4-20250514`  | Balanced performance |
| `claude-3-5-haiku-20241022` | Fast and efficient   |

## Full Example

See the complete example: [with-anthropic on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-anthropic)
