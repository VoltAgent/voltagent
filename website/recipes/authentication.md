---
id: authentication
title: Authentication
slug: authentication
description: Configure authNext with JWT and a console access key.
---

# Authentication

Use `authNext` to split access into **public**, **console**, and **user** routes.

Defaults with authNext:

- All routes are private unless listed in `publicRoutes`.
- Console routes require `VOLTAGENT_CONSOLE_ACCESS_KEY`.
- Execution routes require a user token (JWT).

For details, see [Authentication API](/docs/api/authentication).

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { jwtAuth } from "@voltagent/server-core";

const agent = new Agent({
  name: "Agent",
  instructions: "Assistant for auth example",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer({
    authNext: {
      provider: jwtAuth({
        secret: process.env.JWT_SECRET || "your-secret-key",
      }),
      publicRoutes: ["GET /api/health"],
    },
  }),
});
```

## Console Access Key

Set the key on the server:

```bash
VOLTAGENT_CONSOLE_ACCESS_KEY=your-console-key
```

Send it for console routes (agents, workflows, tools, docs, observability, updates):

```bash
curl http://localhost:3141/agents \
  -H "x-console-access-key: your-console-key"
```

## User Auth Requests

Include the JWT token in the Authorization header:

```bash
curl -X POST http://localhost:3141/agents/agent/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"input":"Hello"}'
```

## Custom Public Routes

Define routes that don't require authentication:

```typescript
authNext: {
  provider: jwtAuth({ secret: "your-secret" }),
  publicRoutes: ["GET /api/health", "GET /api/status"],
},
```

## Adding Custom Endpoints

```typescript
server: honoServer({
  authNext: {
    provider: jwtAuth({ secret: "your-secret" }),
    publicRoutes: ["GET /api/health"],
  },
  configureApp: (app) => {
    app.get("/api/health", (c) => c.json({ status: "ok" }));
    app.get("/api/protected", (c) => c.json({ message: "Authenticated!" }));
  },
});
```

Custom endpoints are treated as **user** routes by default. Add them to `publicRoutes` if they should be public.

## Example

See the example: [with-auth on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-auth)
