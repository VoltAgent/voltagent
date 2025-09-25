# @voltagent/serverless-hono

Serverless (fetch-based) runtime provider for VoltAgent using the [Hono](https://hono.dev) framework. This package exposes a `serverless` factory that plugs into `VoltAgent` so you can deploy agents to Cloudflare Workers, Vercel Edge Functions, Deno Deploy, or Netlify Functions with minimal boilerplate.

```ts
import { VoltAgent } from "@voltagent/core";
import { serverlessHono } from "@voltagent/serverless-hono";

const voltAgent = new VoltAgent({
  agents: {
    /* ... */
  },
  serverless: serverlessHono({ corsOrigin: "*" }),
});

export default voltAgent.serverless().toCloudflareWorker();
```

## Build

```bash
pnpm --filter @voltagent/serverless-hono build
```
