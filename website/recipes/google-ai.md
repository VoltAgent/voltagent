---
id: google-ai
title: Google AI
slug: google-ai
description: Use Google's Gemini models with your VoltAgent agents.
---

# Google AI

Use Google's Gemini models as your agent's LLM provider.

## Installation

```bash
npm install @ai-sdk/google
```

## Quick Setup

```typescript
import { google } from "@ai-sdk/google";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const searchTool = createTool({
  name: "search",
  description: "Search for information",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    return { results: [`Result for: ${query}`] };
  },
});

const agent = new Agent({
  name: "Gemini Agent",
  instructions: "A helpful assistant powered by Gemini",
  model: google("gemini-2.0-flash"),
  tools: [searchTool],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Environment Variables

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
```

## Available Models

| Model              | Description        |
| ------------------ | ------------------ |
| `gemini-2.0-flash` | Fast and efficient |
| `gemini-1.5-pro`   | Advanced reasoning |
| `gemini-1.5-flash` | Quick responses    |

## Full Example

See the complete example: [with-google-ai on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-ai)
