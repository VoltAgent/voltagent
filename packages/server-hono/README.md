<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent Engineering Platform
</h3>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@voltagent/server-hono.svg)](https://www.npmjs.com/package/@voltagent/server-hono)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/server-hono.svg)](https://www.npmjs.com/package/@voltagent/server-hono)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/server-hono

The default VoltAgent server adapter, built on [Hono](https://hono.dev/). It wires up the routes, handlers, WebSocket support, and OpenAPI/Swagger UI provided by [`@voltagent/server-core`](https://github.com/VoltAgent/voltagent/tree/main/packages/server-core) into a runnable HTTP server.

---

## Install

```bash
npm install @voltagent/server-hono
# or
yarn add @voltagent/server-hono
# or
pnpm add @voltagent/server-hono
```

## Usage

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
});
```

This starts an HTTP server exposing the agent/workflow/tool/memory/observability routes defined in `@voltagent/server-core`, along with a Swagger UI for exploring the API.

## Configuration

`honoServer(config)` accepts a `HonoServerConfig`:

| Option            | Type                           | Default               | Description                                                                                                                       |
| ----------------- | ------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `port`            | `number`                       | `3141`                | Port to listen on                                                                                                                 |
| `hostname`        | `string`                       | `"0.0.0.0"`           | Hostname to bind the server to                                                                                                    |
| `cors`            | `CORSOptions \| false`         | allows all origins    | CORS configuration, or `false` to disable default CORS                                                                            |
| `enableSwaggerUI` | `boolean`                      | `true` in development | Enable the `/ui` Swagger UI route                                                                                                 |
| `resumableStream` | `{ adapter, defaultEnabled? }` | —                     | Configure a [`@voltagent/resumable-streams`](https://github.com/VoltAgent/voltagent/tree/main/packages/resumable-streams) adapter |
| `configureApp`    | `(app: Hono) => void`          | —                     | Register custom routes/middleware directly on the Hono app                                                                        |
| `auth`            | `AuthProvider`                 | —                     | Authentication provider for protecting execution endpoints. **Deprecated** — use `authNext` instead                               |
| `authNext`        | `AuthNextConfig`               | —                     | Next-gen authentication policy. All routes are protected by default; configure `publicRoutes` and console access via the config   |

```typescript
new VoltAgent({
  agents: { agent },
  server: honoServer({
    port: 8080,
    cors: {
      origin: "https://example.com",
      allowMethods: ["GET", "POST", "OPTIONS"],
    },
    configureApp: (app) => {
      app.get("/healthz", (c) => c.text("ok"));
    },
  }),
});
```

## Authentication

`jwtAuth` provides a ready-to-use JWT `AuthProvider`:

```typescript
import { jwtAuth } from "@voltagent/server-hono";

const auth = jwtAuth({
  secret: process.env.JWT_SECRET,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ auth }),
});
```

## Custom Endpoints & App Factory

- `extractCustomEndpoints`, `getEnhancedOpenApiDoc` — helpers for registering custom routes and extending the generated OpenAPI document.
- `createVoltAgentApp` — builds the underlying Hono app instance for embedding into existing Node.js servers (e.g. NestJS, Express) instead of using `honoServer` directly.

```typescript
import { createVoltAgentApp } from "@voltagent/server-hono";
import type { ServerProviderDeps } from "@voltagent/core";

// `deps` is the ServerProviderDeps object passed in by VoltAgent (agents, workflows, etc.)
// `config` is a HonoServerConfig — same options as honoServer()
// The function is async and returns { app } — a configured Hono instance

// Example: embed into an existing Node.js server
async function bootstrap(deps: ServerProviderDeps) {
  const { app } = await createVoltAgentApp(deps, {
    port: 3141,
    enableSwaggerUI: false,
    configureApp: (honoApp) => {
      honoApp.get("/healthz", (c) => c.text("ok"));
    },
  });

  // `app` is a plain Hono app — mount it, serve it, or pass it to your framework
  return app;
}
```

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [`@voltagent/server-core`](https://github.com/VoltAgent/voltagent/tree/main/packages/server-core) — the framework-agnostic server core this adapter builds on
- [Agent Overview](https://voltagent.dev/docs/agents/overview/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
