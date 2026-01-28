---
title: Tool Routing
---

# Tool Routing

Tool routing keeps the full tool pool hidden and exposes two system tools to the model:

- `searchTools` returns tool metadata and schemas for a query.
- `callTool` executes a tool by name with validated arguments.

Only `searchTools`, `callTool`, and any tools listed in `toolRouting.expose` are visible to the model.

## How Tool Routing Works

- Tool routing builds a hidden pool from `toolRouting.pool` or all registered tools (by default).
- The model calls `searchTools` with the user request and receives tool details.
- The model calls `callTool` with the exact tool name and schema-compliant arguments.
- Pool tools stay hidden unless explicitly exposed.

## Quick Setup With Embedding Search

This configuration enables embedding-based tool search and exposes only `searchTools` and `callTool` to the model.

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
  instructions:
    "When you need a tool, call searchTools with the user request, then call callTool with the exact tool name and schema-compliant arguments.",
  model: "openai/gpt-4o-mini",
  tools: [getWeather, getTimeZone],
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    topK: 2,
  },
});
```

Notes:

- If `toolRouting.pool` is not set, the pool defaults to all tools registered in the agent.
- If `toolRouting.expose` is not set, only `searchTools` and `callTool` are visible to the model.

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
  instructions:
    "Use searchTools to find tool schemas, then call callTool with validated arguments.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: "text-embedding-3-small",
    pool: [getWeather],
    expose: [getStatus],
  },
});
```

## Enforcing Search Before Call

By default, `callTool` requires the tool to appear in a prior `searchTools` result.
You can disable this behavior:

```ts
const agent = new Agent({
  name: "Relaxed Agent",
  instructions: "Use searchTools before callTool when possible.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    pool: [
      /* tools and toolkits */
    ],
    enforceSearchBeforeCall: false,
  },
});
```

## Embedding Configuration

`toolRouting.embedding` accepts either a model string or an object with extra options.

- `"openai/text-embedding-3-small"`
- `"text-embedding-3-small"`

Provider-qualified strings use the same registry and type list as agent model strings.

```ts
const agent = new Agent({
  name: "Custom Embedding Agent",
  instructions:
    "Use searchTools to discover tool schemas, then call callTool with the right arguments.",
  model: "openai/gpt-4o-mini",
  toolRouting: {
    embedding: {
      model: "openai/text-embedding-3-small",
      topK: 3,
      toolText: (tool) => {
        const tags = tool.tags?.join(", ") ?? "";
        return [tool.name, tool.description, tags].filter(Boolean).join("\n");
      },
    },
  },
});
```

The embedding search caches vectors in memory. The cache is reset when the process restarts.
A tool text change for a given tool name triggers a new embedding for that tool.

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

- `needsApproval`, input/output guardrails, and tool hooks still run when tools are executed via `callTool`.
- If a tool is not in the pool, `callTool` returns a tool error.
- `callTool` validates arguments against the target schema and surfaces validation errors for retries.
- Provider tools and MCP tools can be pooled; execution still runs through approvals and hooks.

## Observability

Tool routing adds spans for selection and embedding steps:

- `tool.search.selection:*` spans include `tool.search.candidates`, `tool.search.selection.count`, and selected names.
- `tool.search.embedding:*` spans include `embedding.model`, `embedding.dimensions`, and cache hit/miss counts.

These spans appear under the `searchTools` tool span in the execution trace.

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
