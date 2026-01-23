---
title: Tool Routing
---

# Tool Routing

Tool routing exposes a small set of router tools to the model and keeps the full tool pool hidden. A router receives a query, selects tools from the pool, and runs them. The router itself is a tool, so it appears in the agent tool list and can be called by the model.

## How Tool Routing Works

- A router is created with `createToolRouter` or via `toolRouting.embedding`.
- The router selects tools from the pool based on a strategy.
- The router executes selected tools and returns their results as its own tool output.
- Only routers and any tools listed in `toolRouting.expose` are visible to the model.

## Quick Setup With Embedding Routing

This configuration creates a default router named `tool_router` and uses embeddings to rank tools in the pool.

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const getWeather = createTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => ({
    location,
    temperatureC: 22,
    condition: "sunny",
  }),
});

const getTimeZone = createTool({
  name: "get_time_zone",
  description: "Get the time zone offset for a city",
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => ({
    location,
    timeZone: "UTC+1",
  }),
});

const agent = new Agent({
  name: "Tool Routing Agent",
  instructions: "Use tool_router when you need a tool. Pass the user request as the query.",
  model: "openai/gpt-4o-mini",
  tools: [getWeather, getTimeZone],
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    topK: 2,
  },
});
```

Notes:

- If `toolRouting.pool` is not set, the pool defaults to all non-router tools registered in the agent.
- If `toolRouting.expose` is not set, only routers are visible to the model.

## Tool Pool and Exposed Tools

Use `pool` to define the hidden tool set and `expose` to keep a subset visible.

```ts
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const getWeather = createTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => ({ location, temperatureC: 22 }),
});

const getStatus = createTool({
  name: "get_status",
  description: "Return the service status",
  parameters: z.object({}),
  execute: async () => ({ status: "ok" }),
});

const agent = new Agent({
  name: "Support Agent",
  instructions: "Use tool_router for tool lookups.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: "text-embedding-3-small",
    pool: [getWeather],
    expose: [getStatus],
  },
});
```

## Multiple Routers With Custom Strategy

You can register multiple routers and define a custom strategy per router. A router strategy receives the query and the full list of tool candidates and returns tool names.

```ts
import { Agent, createToolRouter, type ToolRouterStrategy } from "@voltagent/core";

const weatherStrategy: ToolRouterStrategy = {
  select: async ({ tools, topK, query }) => {
    const candidates = tools.filter(
      (tool) => tool.tags?.includes("weather") || tool.name.startsWith("weather_")
    );
    return candidates.slice(0, topK).map((tool) => ({
      name: tool.name,
      reason: `matched weather tags for query: ${query}`,
    }));
  },
};

const financeStrategy: ToolRouterStrategy = {
  select: async ({ tools, topK }) => {
    const candidates = tools.filter((tool) => tool.tags?.includes("finance"));
    return candidates.slice(0, topK).map((tool) => ({ name: tool.name }));
  },
};

const weatherRouter = createToolRouter({
  name: "weather_router",
  description: "Route weather-related requests",
  strategy: weatherStrategy,
});

const financeRouter = createToolRouter({
  name: "finance_router",
  description: "Route finance-related requests",
  strategy: financeStrategy,
});

const agent = new Agent({
  name: "Multi Router Agent",
  instructions: "Use weather_router or finance_router based on the request.",
  model: "openai/gpt-4o-mini",
  tools: [weatherRouter, financeRouter],
  toolRouting: {
    pool: [
      /* tools and toolkits */
    ],
    topK: 1,
  },
});
```

## Resolver Mode

Resolver mode bypasses LLM argument generation and uses a function to produce tool arguments.

```ts
import { Agent, createToolRouter, type ToolArgumentResolver } from "@voltagent/core";

const resolver: ToolArgumentResolver = async ({ query, tool }) => {
  if (tool.name === "get_weather") {
    return { location: query };
  }
  return {};
};

const router = createToolRouter({
  name: "tool_router",
  description: "Route requests with a resolver",
  embedding: "text-embedding-3-small",
  mode: "resolver",
  resolver,
});

const agent = new Agent({
  name: "Resolver Agent",
  instructions: "Use tool_router for tools.",
  model: "openai/gpt-4o-mini",
  tools: [router],
  toolRouting: {
    pool: [
      /* tools and toolkits */
    ],
  },
});
```

## Execution Model Override

Router argument generation (agent mode) and provider-tool fallback use the router execution model if provided.

```ts
const agent = new Agent({
  name: "Model Override Agent",
  instructions: "Use tool_router for tools.",
  model: "openai/gpt-4o-mini",
  tools: [
    /* tools */
  ],
  toolRouting: {
    embedding: "text-embedding-3-small",
    executionModel: "openai/gpt-4o",
  },
});
```

## Provider Tools and MCP Tools

Pool and expose lists accept Vercel AI SDK tools, including provider-defined tools. MCP tools can be added if they are represented as Vercel tools.

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const localTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a city",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => ({ location, temperatureC: 22 }),
});

const webSearch = openai.tools.webSearch();

const agent = new Agent({
  name: "Mixed Pool Agent",
  instructions: "Use tool_router for tools.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    pool: [localTool, webSearch],
  },
});
```

## Embedding Configuration

The embedding router accepts several model forms and supports a custom tool text format.

- `"openai/text-embedding-3-small"`
- `"text-embedding-3-small"`

Provider-qualified strings use the same model registry and type list as agent model strings.

```ts
import { createToolRouter } from "@voltagent/core";

const router = createToolRouter({
  name: "tool_router",
  description: "Route with custom embedding text",
  embedding: {
    model: "openai/text-embedding-3-small",
    topK: 3,
    toolText: (tool) => {
      const tags = tool.tags?.join(", ") ?? "";
      return [tool.name, tool.description, tags].filter(Boolean).join("\n");
    },
  },
});
```

The embedding strategy caches vectors in memory. The cache is reset when the process restarts. A tool text change for a given tool name triggers a new embedding for that tool.

## Per-Call Overrides

You can disable tool routing for a single call or provide a temporary routing config.

```ts
const result = await agent.generateText("List tools", {
  toolRouting: false,
});

const routed = await agent.generateText("What time is it in Berlin?", {
  toolRouting: {
    embedding: "text-embedding-3-small",
    topK: 1,
  },
});
```

## Hooks, Approval, and Error Handling

- `needsApproval`, input/output guardrails, and tool hooks still run when tools are executed via a router.
- If a selected tool is not in the pool, the router returns an error for that selection.
- If a provider tool requires approval, the router returns a tool error.
- When `parallel` is true (default), selected tools execute concurrently.

## Observability

Tool routing adds spans for selection and embedding steps:

- `tool.router.selection:*` spans include `tool.router.candidates`, `tool.router.selection.count`, and selected names.
- `tool.router.embedding:*` spans include `embedding.model`, `embedding.dimensions`, and cache hit/miss counts.

These spans appear under the router tool span in the execution trace.

## PlanAgent

`PlanAgent` accepts `toolRouting` in its options. It passes routing config to its internal agent.

```ts
import { PlanAgent } from "@voltagent/core";

const agent = new PlanAgent({
  name: "Planning Agent",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: "text-embedding-3-small",
  },
});
```
