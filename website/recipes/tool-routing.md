---
id: tool-routing
title: Tool Routing
slug: tool-routing
description: Route a large tool pool through a small set of router tools.
---

# Tool Routing

Tool routing keeps prompts small by exposing only a few router tools. Routers select and execute tools from a larger pool on demand.

## Quick Setup (Embedding Router)

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
  instructions: "Use tool_router for tool access.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool, convertCurrencyTool],
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    topK: 3,
  },
});

new VoltAgent({ agents: { agent } });
```

If `toolRouting.pool` is not provided, VoltAgent uses the agent's registered tools as the pool (router tools are excluded).

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

Expose specific tools to the model alongside routers:

```typescript
toolRouting: {
  embedding: "openai/text-embedding-3-small",
  expose: [healthCheckTool],
}
```

## Custom Router Strategy

```typescript
import { createToolRouter } from "@voltagent/core";

const router = createToolRouter({
  name: "tool_router",
  description: "Route to the best tool and execute it.",
  strategy: {
    select: async ({ query, tools, topK }) => {
      const matches = tools
        .filter((tool) => tool.description?.toLowerCase().includes(query.toLowerCase()))
        .slice(0, topK);
      return matches.map((tool, index) => ({ name: tool.name, score: 1 - index * 0.01 }));
    },
  },
  mode: "resolver",
  resolver: async ({ query, tool }) => {
    return { query, tool: tool.name };
  },
});

const agent = new Agent({
  name: "Custom Router Agent",
  instructions: "Route requests with tool_router.",
  model: openai("gpt-4o-mini"),
  toolRouting: {
    routers: [router],
    pool: [weatherTool, convertCurrencyTool],
  },
});
```

`mode: "agent"` is the default and uses the agent model to generate tool arguments. Use `resolver` when you want to build arguments deterministically.

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
