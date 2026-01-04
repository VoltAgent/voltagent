---
title: Cloudflare Workers
description: Deploying VoltAgent to Cloudflare Workers in a few steps.
---

This guide shows how to run VoltAgent on Cloudflare Workers. Workers are an edge runtime, but inside VoltAgent we refer to this mode as the **serverless** runtime because the same provider also powers Vercel Edge, Deno Deploy, and similar fetch-based platforms. We cover both the VoltAgent CLI flow and manual setup.

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

The CLI writes a sample `wrangler.toml`, a serverless entry file, and notes on required env vars. It works with empty or existing projects.

### Option B: Manual setup

1. Install and log in with `wrangler` (`wrangler login`).
2. Create a `wrangler.toml` in your project folder (see example below).
3. Add a serverless entry file that bootstraps VoltAgent with `serverlessHono()`.

## 2. Environment variables

Define the keys that your agent needs. Example values:

```bash
OPENAI_API_KEY=sk-...
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
```

Store them using `wrangler secret put`, or add them under `vars` / `env.production` inside `wrangler.toml`.

## 3. Serverless entry file

Serverless mode uses the `serverless` option instead of a Node server. Below is a minimal TypeScript file you can adapt:

```ts title="src/index.ts"
import { VoltAgent, Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";
import { serverlessHono } from "@voltagent/serverless-hono";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "./tools";

type Env = {
  OPENAI_API_KEY: string;
  VOLTAGENT_PUBLIC_KEY?: string;
  VOLTAGENT_SECRET_KEY?: string;
};

const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
});

const agent = new Agent({
  name: "serverless-assistant",
  instructions: "Answer user questions quickly.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});

const voltAgent = new VoltAgent({
  agents: { agent },
  serverless: serverlessHono(),
});

export default voltAgent.serverless().toCloudflareWorker();
```

> Tip: On the serverless runtime, WebSocket streaming is not available. VoltOps Console uses HTTP polling instead.

## 4. `wrangler.toml`

```toml
name = "voltagent-worker"
main = "dist/index.js"
compatibility_date = "2025-01-01"
workers_dev = true
compatibility_flags = [
  "nodejs_compat",
  "nodejs_compat_populate_process_env",
  "no_handle_cross_request_promise_resolution",
]
```

- `nodejs_compat` enables the Node APIs that VoltAgent relies on.
- `nodejs_compat_populate_process_env` mirrors Cloudflare env bindings into `process.env`, so VoltAgent can read secrets without extra setup.
- `no_handle_cross_request_promise_resolution` silences noise from background exports and aligns with the way we call `waitUntil`.

If you ship TypeScript, add a build script like `tsc --project tsconfig.json`, or use Wrangler’s `--bundle` support.

## 5. Cloudflare bindings (D1, KV, R2)

When you use `serverlessHono()` on Workers, VoltAgent injects the Worker `env` object into the execution context map. Access it via `SERVERLESS_ENV_CONTEXT_KEY` from `@voltagent/core`. This works for agent requests, workflow runs, and tool executions triggered through the serverless routes.

### D1 binding in `wrangler.toml`

```toml
[[d1_databases]]
binding = "DB"
database_name = "voltagent"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Use D1 in a tool

```ts
import { createTool, SERVERLESS_ENV_CONTEXT_KEY } from "@voltagent/core";
import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";

type Env = { DB: D1Database };

export const listUsers = createTool({
  name: "list-users",
  description: "Fetch users from D1",
  parameters: z.object({}),
  execute: async (_args, options) => {
    const env = options?.context?.get(SERVERLESS_ENV_CONTEXT_KEY) as Env | undefined;
    const db = env?.DB;
    if (!db) {
      throw new Error("D1 binding is missing (env.DB)");
    }

    const { results } = await db.prepare("SELECT id, name FROM users").all();
    return results;
  },
});
```

### Use D1 in a workflow step

```ts
import { andThen, SERVERLESS_ENV_CONTEXT_KEY } from "@voltagent/core";
import type { D1Database } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

andThen({
  id: "load-users",
  execute: async ({ state }) => {
    const env = state.context?.get(SERVERLESS_ENV_CONTEXT_KEY) as Env | undefined;
    const db = env?.DB;
    if (!db) {
      throw new Error("D1 binding is missing (env.DB)");
    }

    const { results } = await db.prepare("SELECT id, name FROM users").all();
    return { users: results };
  },
});
```

If you call an agent or workflow directly inside Worker code (not via the serverless routes), pass the binding manually with `context: new Map([[SERVERLESS_ENV_CONTEXT_KEY, env]])`.

## 6. Run locally

```bash
pnpm install
pnpm wrangler dev
```

`wrangler dev` runs your Worker in an edge-like sandbox. Use `--local` only if you need Node-specific debugging.

## 7. Deploy

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
- VoltOps Console falls back to HTTP polling. There is no WebSocket streaming on the serverless runtime yet.

## Feature limitations on serverless (edge)

- **MCP client/server** are not available on serverless runtimes today. The current MCP implementation depends on Node.js stdio/network APIs. Run MCP providers on a Node deployment instead.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Memory configuration examples

<Tabs>
  <TabItem value="in-memory" label="In-memory (default)" default>

```ts
import { Memory, InMemoryStorageAdapter } from "@voltagent/core";

const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
});

const agent = new Agent({
  name: "serverless-assistant",
  instructions: "Answer user questions quickly.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
  <TabItem value="postgres" label="PostgreSQL">

```ts
import { Memory } from "@voltagent/core";
import { PostgresMemoryAdapter, PostgresVectorAdapter } from "@voltagent/postgres";

const memory = new Memory({
  storage: new PostgresMemoryAdapter({
    connectionString: env.POSTGRES_URL,
  }),
  vector: new PostgresVectorAdapter({
    connectionString: env.POSTGRES_URL,
  }),
  // embedding adapter (e.g. AiSdkEmbeddingAdapter) stays the same
});

const agent = new Agent({
  name: "serverless-assistant",
  instructions: "Answer user questions quickly.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
  <TabItem value="supabase" label="Supabase">

```ts
import { Memory } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  }),
});

const agent = new Agent({
  name: "serverless-assistant",
  instructions: "Answer user questions quickly.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
  <TabItem value="turso" label="Turso (LibSQL)">

```ts
import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql/edge";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: env.TURSO_URL, // libsql://your-db.turso.io
    authToken: env.TURSO_AUTH_TOKEN,
  }),
});

const agent = new Agent({
  name: "serverless-assistant",
  instructions: "Answer user questions quickly.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
</Tabs>

Monitor your deployment with `wrangler tail` and adjust the worker as needed. After these steps your VoltAgent app is live on Cloudflare Workers.
