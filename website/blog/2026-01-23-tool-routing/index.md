---
title: Tool Routing in VoltAgent - Scaling Tool Use Without Stuffing Your Prompt
description: Why exposing every tool to the model doesn’t scale, and how VoltAgent’s Tool Routing keeps tool use fast, controlled, and observable.
tags: [agents]
slug: tool-routing
authors: necatiozmen
image: https://cdn.voltagent.dev/2026-01-23-tool-routing/social.png
---

Tool Routing is now available in VoltAgent.

When your agent has “too many tools”, the naive setup stops working: passing every tool schema/description to the model makes prompts heavy, cost/latency go up, and tool choice gets noisy.

This post explains the idea (tool search with embeddings) and how it shows up in VoltAgent as **Tool Routing**: a small set of **router tools** the model can call, backed by a larger hidden tool **pool** (plus optional `expose` for tools you still want visible).

If you just want the API reference: [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## The problem: “just give the model all tools”

Most agent setups start like this:

- you register tools,
- you pass them to the agent,
- the model picks one and calls it.

That’s fine at 5–20 tools. It starts to get annoying at ~50. Past ~100 it gets messy:

- Your prompt/tool payload gets big (schemas + descriptions + params).
- Latency and cost go up.
- Tool selection quality goes down because the model is scanning a huge menu.
- You end up exposing tools you’d rather keep “internal” unless needed.

The VoltAgent issue you shared describes exactly this: frameworks tend to expose the full tool set directly, and prompt size becomes the scaling bottleneck.

## The core idea: tool search with embeddings

“Tool search with embeddings” treats tools like documents you can retrieve.

You do the same thing you’d do in RAG:

1. Turn each tool into text (name + description + tags + parameters).
2. Embed those texts and keep the vectors around (cache them).
3. Embed the user query.
4. Use cosine similarity to pick the top `K` tools.

Now the model doesn’t need to see 500 tools up front. It can ask for the tools it needs.

## The pattern: a `tool_search` meta-tool

In Claude’s cookbook, the UI is usually a single meta-tool: `tool_search`.

- The model starts with only `tool_search`.
- When it needs a capability, it calls `tool_search({ query, top_k })`.
- Your app returns “the tools that match”.
- The model uses the discovered tools right away.

The important part isn’t the name `tool_search`. It’s the two-layer design:

- **A small stable surface** exposed to the model.
- **A large dynamic library** behind it.

## The VoltAgent version: Tool Routing

VoltAgent bakes the same idea into the framework with **Tool Routing**.

Instead of giving the model `tool_search`, you give it a **router tool** (or multiple routers). The router:

- receives a `query`,
- selects tools from a hidden pool,
- executes them,
- returns results as the router’s tool output.

So from the model’s point of view: “I call `tool_router`”, not “I have 300 tools to choose from”.

## Quick setup: embedding routing

In VoltAgent you enable this via the `toolRouting` option on `Agent` (and `PlanAgent`).

This is the simplest setup: create an agent, register a couple tools, enable routing with embeddings. VoltAgent creates a default router named `tool_router`.

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

What matters here:

- the model only sees `tool_router` (plus anything you explicitly expose),
- the router picks from the pool based on semantic similarity.

## Tool visibility: `pool` vs `expose`

Routing is most useful when you separate:

- tools the model can _see_,
- tools that exist but stay hidden unless routed.

`pool` is the hidden set the router can use. `expose` is the small set that stays visible.

You’ll use this a lot when you want “a tiny visible tool surface” but still keep some utilities directly callable (like `get_status`).

For the full `pool`/`expose` example, see the [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## Multiple routers + custom strategy

You don’t have to do everything with embeddings. You can register multiple routers and plug in a custom selection strategy per router.

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

This is nice when you already know your domains and want predictable routing.

## Resolver mode: skip LLM argument generation

Sometimes “pick the tool” is the hard part, but “fill the args” is easy and should be deterministic.

Resolver mode lets you provide a function that turns `(query, tool)` into tool args, so you don’t rely on the LLM to generate parameters.

I’m not including the full resolver snippet here to keep the article short—see the [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/) for the complete example.

## Execution model override

If you want routing/argument steps to run with a different model, set `executionModel`.

This is a small knob, so I’ll just point you to the [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## Provider tools and MCP tools

The pool/expose lists accept Vercel AI SDK tools too (including provider-defined tools). Example: add `openai.tools.webSearch()` to the pool.

Again, skipping the full snippet here—see the [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## Hooks, approval, and errors

Routing doesn’t bypass your safety rails:

- `needsApproval`, input/output guardrails, and tool hooks still apply.
- If a selected tool isn’t in the pool, the router returns an error for that selection.
- If a provider tool requires approval, the router returns a tool error.
- When `parallel` is `true` (default), selected tools execute concurrently.

## Observability

Tool routing adds tracing spans for the selection and embedding steps (under the router tool span), so you can see what happened during routing and whether embeddings hit the cache.

## When to use it (and when not to)

Use Tool Routing when:

- you have lots of tools (or a tool library that keeps growing),
- you care about prompt size and token cost,
- you want a smaller “tool surface” exposed to the model,
- you want routing to be observable and policy-controlled.

Don’t use it when:

- you only have a few tools and routing is just extra moving parts,
- your tool descriptions/tags are low quality (semantic search can’t fix that),
- you need strict deterministic behavior but haven’t defined a resolver/strategy.

## Summary

Tool Routing keeps the model-facing tool list small, and moves “pick the right tool(s)” into a router layer that can use embeddings or your own strategy. It’s mainly about scaling tool use without bloating prompts, while keeping approvals/guardrails/hooks and tracing intact.
