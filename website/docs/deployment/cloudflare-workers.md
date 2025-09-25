---
title: Cloudflare Workers
description: Deploying VoltAgent to Cloudflare Workers in a few steps.
---

This guide shows how to run VoltAgent on Cloudflare Workers. We cover both the VoltAgent CLI flow and manual setup.

## Prerequisites

- Node.js 18+
- `pnpm` or `npm`
- Cloudflare account and the `wrangler` CLI (`npm install -g wrangler`)
- API key for your LLM provider (for example `OPENAI_API_KEY`)
- Optional: `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY` if you use VoltOps observability

## 1. Generate project files

### Option A: VoltAgent CLI

```bash
npm run volt deploy --target cloudflare
```

The CLI writes a sample `wrangler.toml`, an edge entry file, and notes on required env vars. It works with empty or existing projects.

### Option B: Manual setup

1. Install and log in with `wrangler` (`wrangler login`).
2. Create a `wrangler.toml` in your project folder (see example below).
3. Add an edge entry file that bootstraps VoltAgent with `edgeHono()`.

## 2. Environment variables

Define the keys that your agent needs. Example values:

```bash
OPENAI_API_KEY=sk-...
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
```

Store them using `wrangler secret put`, or add them under `vars` / `env.production` inside `wrangler.toml`.

## 3. Edge entry file

Edge mode uses the `edge` option instead of a Node server. Below is a minimal TypeScript file you can adapt:

```ts title="src/index.ts"
import { VoltAgent, Agent, mergeProcessEnv } from "@voltagent/core";
import { edgeHono } from "@voltagent/edge-hono";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "./tools";

type Env = {
  OPENAI_API_KEY: string;
  VOLTAGENT_PUBLIC_KEY?: string;
  VOLTAGENT_SECRET_KEY?: string;
};

const agent = new Agent({
  name: "edge-assistant",
  instructions: "Answer user questions quickly.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

let cachedAgent: VoltAgent | undefined;

function getAgent(env: Env) {
  mergeProcessEnv(env as Record<string, unknown>);
  if (!cachedAgent) {
    cachedAgent = new VoltAgent({
      agents: { agent },
      edge: edgeHono(),
    });
  }
  return cachedAgent;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const voltAgent = getAgent(env);
    const worker = voltAgent.edge().toCloudflareWorker();
    return worker.fetch(request, env as Record<string, unknown>, ctx);
  },
};
```

> Tip: On the edge runtime, WebSocket streaming is not available. VoltOps Console uses HTTP polling instead.

## 4. `wrangler.toml`

```toml
name = "voltagent-worker"
main = "dist/index.js"
compatibility_date = "2025-01-01"
workers_dev = true
compatibility_flags = ["nodejs_compat", "no_handle_cross_request_promise_resolution"]
```

- `nodejs_compat` enables the Node APIs that VoltAgent relies on.
- `no_handle_cross_request_promise_resolution` silences noise from background exports and aligns with the way we call `waitUntil`.

If you ship TypeScript, add a build script like `tsc --project tsconfig.json`, or use Wrangler’s `--bundle` support.

## 5. Run locally

```bash
pnpm install
pnpm wrangler dev
```

`wrangler dev` runs your Worker in an edge-like sandbox. Use `--local` only if you need Node-specific debugging.

## 6. Deploy

```bash
pnpm wrangler deploy
```

You will receive the worker URL after the deploy. Test it with:

```bash
curl https://<your-worker>.workers.dev/
```

## Observability notes

- In-memory span/log storage is active by default. You can fetch traces through the `/observability` REST endpoints.
- If VoltOps credentials are present, the worker exports telemetry via OTLP fetch calls. These calls run through `waitUntil`, so they do not block your responses.
- VoltOps Console falls back to HTTP polling. There is no WebSocket streaming on edge yet.

Monitor your deployment with `wrangler tail` and adjust the worker as needed. After these steps your VoltAgent app is live on Cloudflare Workers.
