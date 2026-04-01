---
title: Tool Routing in VoltAgent - Scaling Tool Use Without Stuffing Your Prompt
description: Why exposing every tool to the model does not scale, and how VoltAgent's Tool Routing keeps tool use fast, controlled, and observable.
tags: [agents]
slug: tool-routing
authors: necatiozmen
image: https://cdn.voltagent.dev/2026-01-23-tool-routing/social.png
---

Tool Routing is now available in VoltAgent.

When your agent has too many tools, the naive setup stops working: passing every tool schema and description to the model makes prompts heavy, cost and latency go up, and tool choice gets noisy.

This post explains the idea (tool search with embeddings) and how it shows up in VoltAgent as **Tool Routing**: a small, stable **search + call** surface backed by a larger hidden tool **pool** (plus optional `expose` for tools you still want visible).

If you just want the API reference: [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## The problem: just give the model all tools

Most agent setups start like this:

- you register tools,
- you pass them to the agent,
- the model picks one and calls it.

That is fine at 5-20 tools. It starts to get annoying at ~50. Past ~100 it gets messy:

- Your prompt/tool payload gets big (schemas + descriptions + params).
- Latency and cost go up.
- Tool selection quality goes down because the model is scanning a huge menu.
- You end up exposing tools you would rather keep internal unless needed.

The VoltAgent issue you shared describes exactly this: frameworks tend to expose the full tool set directly, and prompt size becomes the scaling bottleneck.

## The core idea: tool search with embeddings

Tool search with embeddings treats tools like documents you can retrieve.

You do the same thing you would do in RAG:

1. Turn each tool into text (name + description + tags + parameters).
2. Embed those texts and keep the vectors around (cache them).
3. Embed the user query.
4. Use cosine similarity to pick the top K tools.

Now the model does not need to see 500 tools up front. It can ask for the tools it needs.

## The pattern: search then call

The key design is two steps:

- **A small stable surface** exposed to the model (`searchTools` + `callTool`).
- **A large dynamic library** behind it (the tool pool).

The model asks for tools with `searchTools({ query, topK })`, reads the schemas, then calls `callTool({ name, args })`.

## The VoltAgent version: Tool Routing

VoltAgent bakes the same idea into the framework with **Tool Routing**.

Instead of giving the model every tool, you give it:

- `searchTools` to discover tool schemas,
- `callTool` to execute the chosen tool.

So from the model's point of view: "I search tools, then call one," not "I have 300 tools to choose from."

## Quick setup: embedding search

In VoltAgent you enable this via the `toolRouting` option on `Agent` (and `PlanAgent`).

This is the simplest setup: create an agent, register a couple tools, enable routing with embeddings.

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

What matters here:

- the model only sees `searchTools` and `callTool` (plus anything you explicitly expose),
- the search step picks from the hidden pool based on semantic similarity.

## Tool visibility: pool vs expose

Routing is most useful when you separate:

- tools the model can see,
- tools that exist but stay hidden unless searched.

`pool` is the hidden set the model can discover. `expose` is the small set that stays visible.

For the full `pool`/`expose` example, see the [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## Enforce search before call

By default, `callTool` requires the tool to appear in a prior `searchTools` result.
You can turn that off with `enforceSearchBeforeCall: false` when you need more freedom.

## Provider tools and MCP tools

The pool/expose lists accept Vercel AI SDK tools too (including provider-defined tools). Example: add `openai.tools.webSearch()` to the pool.

Again, skipping the full snippet here, see the [Tool Routing docs](https://voltagent.dev/docs/tools/tool-routing/).

## Hooks, approval, and errors

Routing does not bypass your safety rails:

- `needsApproval`, input/output guardrails, and tool hooks still apply.
- If a tool is not in the pool, `callTool` returns a tool error.
- `callTool` validates arguments against the target schema and surfaces validation errors for retries.

## Observability

Tool routing adds tracing spans for the selection and embedding steps (under the `searchTools` tool span), so you can see what happened during search and whether embeddings hit the cache.

## When to use it (and when not to)

Use Tool Routing when:

- you have lots of tools (or a tool library that keeps growing),
- you care about prompt size and token cost,
- you want a smaller tool surface exposed to the model,
- you want routing to be observable and policy-controlled.

Do not use it when:

- you only have a few tools and routing is just extra moving parts,
- your tool descriptions or tags are low quality (semantic search cannot fix that).
