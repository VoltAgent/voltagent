---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

feat: add authNext and deprecate legacy auth

Add a new `authNext` policy that splits routes into public, console, and user access. All routes are protected by default; use `publicRoutes` to opt out.

AuthNext example:

```ts
import { jwtAuth } from "@voltagent/server-core";
import { honoServer } from "@voltagent/server-hono";

const server = honoServer({
  authNext: {
    provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
    publicRoutes: ["GET /health"],
  },
});
```

Behavior summary:

- When `authNext` is set, all routes are private by default.
- Console endpoints (agents, workflows, tools, docs, observability, updates) require a Console Access Key.
- Execution endpoints require a user token (JWT).

Console access uses `VOLTAGENT_CONSOLE_ACCESS_KEY`:

```bash
VOLTAGENT_CONSOLE_ACCESS_KEY=your-console-key
```

```bash
curl http://localhost:3141/agents \
  -H "x-console-access-key: your-console-key"
```

Legacy `auth` remains supported but is deprecated. Use `authNext` for new integrations.
