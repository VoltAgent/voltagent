---
id: authentication
title: Authentication
slug: authentication
description: Add JWT authentication to your VoltAgent server.
---

# Authentication

Protect your VoltAgent endpoints with JWT authentication.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer, jwtAuth } from "@voltagent/server-hono";

const agent = new Agent({
  name: "Protected Agent",
  instructions: "A secure assistant",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer({
    auth: jwtAuth({
      secret: process.env.JWT_SECRET || "your-secret-key",
      defaultPrivate: true,
      publicRoutes: ["GET /api/health"],
    }),
  }),
});
```

## Making Authenticated Requests

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3141/api/agents/agent/chat
```

## Custom Public Routes

Define routes that don't require authentication:

```typescript
jwtAuth({
  secret: "your-secret",
  defaultPrivate: true,
  publicRoutes: ["GET /api/health", "GET /api/status"],
});
```

## Adding Custom Endpoints

```typescript
server: honoServer({
  auth: jwtAuth({ secret: "your-secret", defaultPrivate: true }),
  configureApp: (app) => {
    app.get("/api/health", (c) => c.json({ status: "ok" }));
    app.get("/api/protected", (c) => c.json({ message: "Authenticated!" }));
  },
});
```

## Full Example

See the complete example: [with-auth on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-auth)
