---
id: tool-routing
title: Tool Routing
slug: tool-routing
description: Route a large tool pool through searchTools and callTool.
---

# Tool Routing

Tool routing keeps prompts small by exposing only `searchTools` and `callTool`. The model searches for tools, then calls the chosen tool with validated arguments.

## Quick Setup (Embedding Search)

```typescript
import { Agent, createTool, VoltAgent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => ({ location, temperature: 22 }),
});

const convertCurrencyTool = createTool({
  name: "convert_currency",
  description: "Convert money between currencies",
  parameters: z.object({
    amount: z.number().describe("Amount to convert"),
    from: z.string().describe("Source currency code"),
    to: z.string().describe("Target currency code"),
  }),
  execute: async ({ amount, from, to }) => ({ amount, from, to, rate: 0.92 }),
});

const agent = new Agent({
  name: "Assistant",
  instructions:
    "When you need a tool, call searchTools with the user request, then call callTool with the exact tool name and schema-compliant arguments.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, convertCurrencyTool],
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    topK: 3,
  },
});

new VoltAgent({ agents: { agent } });
```

If `toolRouting.pool` is not provided, VoltAgent uses the agent's registered tools as the pool (the routing helper tools are excluded).

## Explicit Pools (Two Categories)

```typescript
const weatherPool = [weatherTool];
const financePool = [convertCurrencyTool];

toolRouting: {
  embedding: "openai/text-embedding-3-small",
  pool: [...weatherPool, ...financePool],
}
```

## Expose Tools Directly

Expose specific tools to the model alongside `searchTools` and `callTool`:

```typescript
toolRouting: {
  embedding: "openai/text-embedding-3-small",
  expose: [healthCheckTool],
}
```

## Enforce Search Before Call

By default, `callTool` enforces a prior `searchTools` call. Disable it if needed:

```typescript
toolRouting: {
  pool: [weatherTool, convertCurrencyTool],
  enforceSearchBeforeCall: false,
}
```

## Global Defaults

```typescript
new VoltAgent({
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
  },
  agents: { agent },
});
```

## Pooling Provider and MCP Tools

```typescript
import { MCPConfiguration } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const mcp = new MCPConfiguration({
  servers: [{ name: "zapier", url: process.env.ZAPIER_MCP_URL ?? "" }],
});

// MCP docs: /docs/agents/mcp/mcp/
const mcpTools = await mcp.getTools();

toolRouting: {
  pool: [
    openai.tools.webSearch(),
    ...mcpTools,
  ],
}
```
