# @voltagent/edge-hono

Edge runtime provider for VoltAgent using the [Hono](https://hono.dev) framework. This package exposes an `edge` factory that plugs into `VoltAgent` so you can deploy agents to Cloudflare Workers, Vercel Edge Functions, Netlify Edge Functions, or Deno Deploy with minimal boilerplate.

```ts
import { VoltAgent } from "@voltagent/core";
import { edgeHono } from "@voltagent/edge-hono";

const voltAgent = new VoltAgent({
  agents: {
    /* ... */
  },
  edge: edgeHono({ corsOrigin: "*" }),
});

export default voltAgent.edge().toCloudflareWorker();
```

## Build

```bash
pnpm --filter @voltagent/edge-hono build
```
