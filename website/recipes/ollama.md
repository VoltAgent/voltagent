---
id: ollama
title: Ollama
slug: ollama
description: Run local LLMs with Ollama and VoltAgent.
---

# Ollama

Run open-source models locally with Ollama - no API keys needed.

## Prerequisites

1. Install Ollama: [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`

## Installation

```bash
npm install ollama-ai-provider-v2
```

## Quick Setup

```typescript
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_HOST ?? "http://localhost:11434/api",
});

const weatherTool = createTool({
  name: "get_weather",
  description: "Get weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    return { location, temperature: 22, condition: "sunny" };
  },
});

const agent = new Agent({
  name: "Local Agent",
  instructions: "A helpful local assistant",
  model: ollama("llama3.2:latest"),
  tools: [weatherTool],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Environment Variables

```env
OLLAMA_HOST=http://localhost:11434/api
```

## Popular Models

| Model              | Size | Use Case              |
| ------------------ | ---- | --------------------- |
| `llama3.2:latest`  | 3B   | General purpose, fast |
| `llama3.2:7b`      | 7B   | Better quality        |
| `codellama:latest` | 7B   | Code generation       |
| `mistral:latest`   | 7B   | Fast, good quality    |
| `mixtral:latest`   | 47B  | High quality, slower  |

## Pull More Models

```bash
ollama pull mistral
ollama pull codellama
ollama pull mixtral
```

## Full Example

See the complete example: [with-ollama on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ollama)
