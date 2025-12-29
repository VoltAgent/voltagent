---
id: groq
title: Groq
slug: groq
description: Use Groq's ultra-fast LLM inference with VoltAgent.
---

# Groq

Groq provides blazing-fast inference for open-source models like Llama.

## Installation

```bash
npm install @ai-sdk/groq
```

## Quick Setup

```typescript
import { groq } from "@ai-sdk/groq";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "Fast Agent",
  instructions: "A fast assistant powered by Groq",
  model: groq("llama-3.3-70b-versatile"),
  memory: new Memory({
    storage: new LibSQLMemoryAdapter(),
  }),
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Environment Variables

```env
GROQ_API_KEY=your-groq-api-key
```

## Available Models

| Model                     | Description             |
| ------------------------- | ----------------------- |
| `llama-3.3-70b-versatile` | Best quality, versatile |
| `llama-3.1-8b-instant`    | Fast, lightweight       |
| `mixtral-8x7b-32768`      | Good for long context   |
| `gemma2-9b-it`            | Google's Gemma model    |

## With Tools

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const searchTool = createTool({
  name: "search",
  description: "Search the web",
  parameters: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    return { results: [`Result for: ${query}`] };
  },
});

const agent = new Agent({
  name: "Search Agent",
  model: groq("llama-3.3-70b-versatile"),
  tools: [searchTool],
});
```

## Full Example

See the complete example: [with-groq-ai on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-groq-ai)
