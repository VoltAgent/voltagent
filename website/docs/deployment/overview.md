---
title: Deployment Overview
description: Deployment options for VoltAgent apps across serverful and serverless runtimes.
---

You can run VoltAgent in classic Node.js servers or in serverless (edge) runtimes. This section explains the options and links to detailed guides.

## Supported scenarios

- **Server (Node.js)** – use `@voltagent/server-hono` (or another HTTP layer) and deploy on any host such as Fly.io, Render, AWS, Railway. Note: For IPv6-enabled platforms like Railway and Fly.io, configure `hostname: "::"` for dual-stack networking.
- **Serverless (edge runtimes)** – run VoltAgent on platforms like Cloudflare Workers, Vercel Edge, or Deno Deploy for low latency responses while using the shared serverless provider.
- **Serverless Functions** – deploy to Node-based functions such as Netlify Functions when you need Node compatibility but prefer managed cold starts over dedicated servers.
- **Hybrid** – keep heavy work on a Node server and expose lightweight endpoints from the edge.

## When to pick which?

- Choose **Node.js** if you need long-running tasks, heavy state, or many open connections.
- Choose **Serverless (edge)** when global reach and very low latency are more important than local disk access or Node-specific libraries.
- **Observability** works in both modes. On serverless runtimes, VoltAgent falls back to HTTP polling instead of WebSocket streaming.

## Network Configuration

When deploying to Node.js servers, you may need to configure the network binding depending on your platform:

### IPv6 and Dual-Stack Support

Modern cloud platforms like Railway and Fly.io use IPv6 or dual-stack networking. Configure your server to bind to both IPv4 and IPv6:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: parseInt(process.env.PORT || "3141"),
    hostname: "::", // Binds to both IPv4 and IPv6
  }),
});
```

For more details on network binding configuration, see the [Server Architecture](../api/server-architecture.md#network-binding-configuration) documentation.

## Tooling

- The VoltAgent CLI can scaffold deployment files (Wrangler config, Netlify/Vercel templates, etc.).
- The `examples/` directory contains ready-to-run templates, including Cloudflare Workers and Netlify Functions setups.

## Guides

- [Cloudflare Workers](./cloudflare-workers.md)
- [Netlify Functions](./netlify-functions.md)
- Vercel Edge and Deno Deploy guides will follow soon.

## Next steps

Review your dependencies: serverless edge runtimes do not support Node-only APIs like `fs` or `net`. VoltAgent core avoids those APIs, but custom code must honor the same limits.

After that, pick the guide for your target platform and deploy using the appropriate CLI (`wrangler`, `vercel`, `netlify`, etc.).
