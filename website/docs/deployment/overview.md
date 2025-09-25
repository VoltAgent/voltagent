---
title: Deployment Overview
description: Deployment options for VoltAgent apps across serverful and edge runtimes.
---

You can run VoltAgent in classic Node.js servers or in edge runtimes. This section explains the options and links to detailed guides.

## Supported scenarios

- **Server (Node.js)** – use `@voltagent/server-hono` (or another HTTP layer) and deploy on any host such as Fly.io, Render, AWS, Railway.
- **Edge** – run VoltAgent on platforms like Cloudflare Workers, Vercel Edge, Netlify Edge, or Deno Deploy for low latency responses.
- **Hybrid** – keep heavy work on a Node server and expose lightweight endpoints from the edge.

## When to pick which?

- Choose **Node.js** if you need long-running tasks, heavy state, or many open connections.
- Choose **Edge** when global reach and very low latency are more important than local disk access or Node-specific libraries.
- **Observability** works in both modes. On edge, VoltAgent falls back to HTTP polling instead of WebSocket streaming.

## Tooling

- The VoltAgent CLI can scaffold deployment files (wrangler config, edge entry points, etc.).
- The `examples/` directory contains ready-to-run templates, including an edge sample for Cloudflare.

## Guides

- [Cloudflare Workers](./cloudflare-workers.md)
- Vercel Edge, Netlify Edge, and Deno Deploy guides will follow soon.

## Next steps

Review your dependencies: edge runtimes do not support Node-only APIs like `fs` or `net`. VoltAgent core is edge-safe, but custom code must honor the same limits.

After that, pick the guide for your target platform and deploy using the appropriate CLI (`wrangler`, `vercel`, `netlify`, etc.).
