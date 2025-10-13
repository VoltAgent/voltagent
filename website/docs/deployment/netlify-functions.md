---
title: Netlify Functions
description: Deploy VoltAgent to Netlify Functions with a single serverless entry point.
---

This guide explains how to run VoltAgent on Netlify Functions by reusing the same Hono-powered HTTP API that the Cloudflare Workers example exposes. The instructions mirror the `examples/with-netlify-functions` project.

## Prerequisites

- Node.js 20+
- `pnpm` or `npm`
- Netlify account and the `netlify` CLI (`npm install -g netlify-cli`)
- OpenAI API key (VoltOps keys optional)

## 1. Generate project files

### Option A: VoltAgent CLI

```bash
npm run volt deploy --target netlify
```

The command scaffolds a `netlify.toml` file with function defaults. Add `netlify/functions/voltagent.ts` and a VoltAgent entry file (`src/index.ts`) following the example below.

### Option B: Manual setup

1. Create `netlify.toml` (see sample in step 4).
2. Add `netlify/functions/voltagent.ts` with the Netlify handler.
3. Configure VoltAgent in `src/index.ts` and import it from the handler.

## 2. Environment variables

Netlify Functions expose secrets through `process.env`, so you can rely on VoltAgent's default environment detection. Use the CLI to define keys:

```bash
netlify secrets:set OPENAI_API_KEY
netlify secrets:set VOLTAGENT_PUBLIC_KEY
netlify secrets:set VOLTAGENT_SECRET_KEY
```

## 3. VoltAgent setup

Create the agent once and reuse it across invocations. The example keeps the serverless Hono provider so the same HTTP routes (agents, workflows, observability) stay available.

```ts title="src/index.ts"
import { Agent, VoltAgent } from "@voltagent/core";
import { serverlessHono } from "@voltagent/serverless-hono";
import { openai } from "@ai-sdk/openai";
import { weatherTool } from "./tools";

const assistant = new Agent({
  name: "netlify-function-agent",
  instructions: "Answer user questions and call tools when needed.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

const voltAgent = new VoltAgent({
  agents: { assistant },
  serverless: serverlessHono(),
});

export function getVoltAgent() {
  return voltAgent;
}
```

## 4. Netlify function handler

Use the helper exported from `@voltagent/serverless-hono` to convert Lambda events into Fetch requests automatically.

```ts title="netlify/functions/voltagent.ts"
import { createNetlifyFunctionHandler } from "@voltagent/serverless-hono";
import { getVoltAgent } from "../src/index";

const voltAgent = getVoltAgent();

export const handler = createNetlifyFunctionHandler(voltAgent);
```

## 5. `netlify.toml`

```toml
[functions]
  node_bundler = "esbuild"
  directory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/voltagent/:splat"
  status = 200
  force = true
```

The redirect sends every HTTP route (`/agents`, `/observability`, `/workflows`, …) to the same function, mimicking the Cloudflare Workers routing behaviour.

## 6. Run locally

```bash
pnpm install
pnpm netlify dev
```

Use `curl` against `http://localhost:8888/agents` or other routes to validate.

## 7. Deploy

```bash
pnpm netlify deploy --prod
```

Netlify prints the production URL when the deploy finishes. If you need build steps (TypeScript, bundling) add them to your Netlify build command.

## Observability notes

- The example keeps the in-memory span/log storage by default, exposed through `/observability/*` routes.
- When VoltOps credentials are present, OTLP exports run via fetch with retry; the Lambda execution waits for the response, so keep an eye on cold-start durations.
- VoltOps Console still falls back to HTTP polling because WebSockets are not available in the Netlify Function runtime.

## Feature limitations

- **Model Context Protocol** still requires a Node server. The current Netlify Function runtime does not expose stdio transports.
- **libSQL memory adapter** needs a TCP socket. For Netlify Functions use the in-memory adapter or an external Postgres/Supabase database.

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
```

  </TabItem>
</Tabs>

Use `netlify logs --target=production` to tail production logs and confirm your agent runs as expected.
