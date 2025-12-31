---
title: Authentication
sidebar_label: Authentication
---

# Authentication

VoltAgent supports optional authentication. For new integrations, use **authNext**, which treats all routes as private by default and separates **console access** from **user access**. The legacy `auth` option is still supported but deprecated.

## Quick Start

### Option 1: No Authentication (Default)

Use for development and internal tools:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer(), // No auth configuration needed
});
```

All endpoints are publicly accessible.

### Option 2: authNext (Recommended)

Protect everything by default. Explicitly allow public routes, and use a Console Access Key for management endpoints.

#### Using Hono

```typescript
import { jwtAuth } from "@voltagent/server-core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    authNext: {
      provider: jwtAuth({
        secret: process.env.JWT_SECRET!,
      }),
      publicRoutes: ["GET /health"],
    },
  }),
});
```

#### Using Elysia

```typescript
import { jwtAuth } from "@voltagent/server-elysia";
import { elysiaServer } from "@voltagent/server-elysia";

new VoltAgent({
  agents: { myAgent },
  server: elysiaServer({
    authNext: {
      provider: jwtAuth({
        secret: process.env.JWT_SECRET!,
      }),
      publicRoutes: ["GET /health"],
    },
  }),
});
```

Legacy `auth` is still supported for existing integrations. See the **Legacy auth** section at the end for details.

## Concepts

- **User token**: A JWT from your identity provider, sent in `Authorization: Bearer <token>`.
- **Console access key**: A static key for management, docs, observability, and updates endpoints. Set `VOLTAGENT_CONSOLE_ACCESS_KEY` and send `x-console-access-key` (or `?key=` for WebSocket).
- **Public routes**: Endpoints that bypass auth. You control them.
- **Dev bypass**: `x-voltagent-dev: true` is accepted only when `NODE_ENV` is not `"production"`.

## How Authentication Works

When auth is enabled, VoltAgent evaluates each request based on the configured mode.

### authNext

1. Match `publicRoutes` (authNext + provider). If matched, request is public.
2. Match `consoleRoutes` (authNext or defaults). If matched, require console key or dev bypass.
3. Everything else requires a user token (JWT) or dev bypass.

### Legacy auth

1. Routes in `DEFAULT_LEGACY_PUBLIC_ROUTES` (alias `DEFAULT_PUBLIC_ROUTES`) are always public.
2. Routes in `PROTECTED_ROUTES` require a user token (JWT).
3. `defaultPrivate: true` applies to custom routes only.

## Route Access Summary

Default access by endpoint group:

| Endpoint Group | Examples                                                                        | authNext Access             | Legacy auth Access |
| -------------- | ------------------------------------------------------------------------------- | --------------------------- | ------------------ |
| Execution      | `POST /agents/:id/text`, `POST /workflows/:id/run`, `POST /tools/:name/execute` | User token (JWT)            | User token (JWT)   |
| Management     | `GET /agents`, `GET /workflows`, `GET /tools`                                   | Console key                 | Public             |
| Docs + UI      | `GET /`, `GET /doc`, `GET /ui`                                                  | Console key                 | Public             |
| Discovery      | `GET /mcp/servers`, `GET /agents/:id/card`                                      | Console key                 | Public             |
| Observability  | `/observability/*`, `GET /api/logs`, `WS /ws/observability/**`                  | Console key                 | Console key or JWT |
| Updates        | `GET /updates`, `POST /updates`, `POST /updates/:packageName`                   | Console key                 | Console key or JWT |
| Custom routes  | `GET /health`, `POST /webhooks/*`                                               | User token (JWT) by default | Public by default  |

Notes:

- WebSocket console endpoints require `?key=<key>` or `?dev=true` in non-production.
- In legacy auth, `defaultPrivate: true` changes custom routes only; it does not change default public routes.

## authNext: Policy Model (Recommended)

authNext is a policy layer that decides **how each route is accessed**:

- **public**: No authentication required
- **console**: Requires Console Access Key (or dev bypass)
- **user**: Requires a valid user token (JWT)

Console routes cover management, docs, and observability endpoints used by the VoltAgent Console UI.

### Access Resolution Order

authNext resolves access in this order:

1. **public** routes (from `authNext.publicRoutes` + `provider.publicRoutes`)
2. **console** routes (from `authNext.consoleRoutes` or defaults)
3. **user** routes (everything else)

If a route matches both public and console, **public wins**.

When using authNext, define public routes on `authNext.publicRoutes`. `provider.publicRoutes` is merged in for provider defaults.

### Default Console Routes

By default, authNext treats these as **console** routes (Console Key required):

**Management**

- `GET /agents`
- `GET /agents/:id`
- `GET /workflows`
- `GET /workflows/:id`
- `GET /tools`
- `GET /agents/:id/history`
- `GET /workflows/executions`
- `GET /workflows/:id/executions/:executionId/state`

**Docs + Landing**

- `GET /`
- `GET /doc`
- `GET /ui`

**Discovery**

- `GET /agents/:id/card`
- `GET /mcp/servers`
- `GET /mcp/servers/:serverId`
- `GET /mcp/servers/:serverId/tools`

**Observability + Updates**

- `/observability/*`
- `GET /api/logs`
- `GET /updates`
- `POST /updates`
- `POST /updates/:packageName`

**WebSocket (Console Channels)**

- `WS /ws`
- `WS /ws/logs`
- `WS /ws/observability/**`

This list is defined in `packages/server-core/src/auth/defaults.ts`.

### Route Pattern Syntax

Route patterns support:

- Method prefix: `GET /agents/:id`
- Path params: `/agents/:id`
- Single wildcard: `/observability/*` (matches `/observability/x` and deeper)
- Double-star: `/ws/observability/**` (matches `/ws/observability` and children)

### Making Routes Public

Add routes to `authNext.publicRoutes`:

```typescript
authNext: {
  provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
  publicRoutes: [
    "GET /health",
    "POST /webhooks/*",
  ],
},
```

### Custom Console Routes

`authNext.consoleRoutes` **replaces** the default console list:

```typescript
authNext: {
  provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
  consoleRoutes: [
    "/observability/*",
    "GET /updates",
    "POST /updates",
  ],
},
```

If you want the defaults plus custom routes, include the defaults explicitly.

```typescript
import { DEFAULT_CONSOLE_ROUTES } from "@voltagent/server-core";

authNext: {
  provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
  consoleRoutes: [...DEFAULT_CONSOLE_ROUTES, "GET /admin/metrics"],
},
```

### Console Access Key

In production, set a Console Access Key:

```bash
NODE_ENV=production
VOLTAGENT_CONSOLE_ACCESS_KEY=your-console-key
```

Provide the key via:

- Header: `x-console-access-key: <key>`
- Query: `?key=<key>` (required for WebSocket)

### Development Bypass

In non-production, the dev bypass is allowed:

```bash
# HTTP requests
x-voltagent-dev: true

# WebSocket connections
?dev=true
```

This bypass works for both **console** and **user** routes.

## Auth Providers

VoltAgent includes a JWT provider and supports custom providers via the `AuthProvider` interface.
Providers validate tokens and return a user object; role and tenant checks live in your handlers or middleware.

### JWT (`jwtAuth`)

`jwtAuth` can be used with **authNext** or legacy `auth`:

```typescript
import { jwtAuth } from "@voltagent/server-core";

const provider = jwtAuth({
  secret: process.env.JWT_SECRET!,
  mapUser: (payload) => ({
    id: payload.sub,
    email: payload.email,
    tenantId: payload.tenant_id,
    role: payload.role,
  }),
  verifyOptions: {
    algorithms: ["HS256"],
    audience: "voltagent-api",
    issuer: "my-auth-service",
  },
});
```

**Note**: `defaultPrivate` only affects legacy `auth`. For authNext, use `authNext.publicRoutes`.

### Custom Providers (AuthProvider)

If you use a different identity system, implement `AuthProvider` and plug it into `authNext`:

```typescript
import { VoltAgent } from "@voltagent/core";
import type { AuthProvider } from "@voltagent/server-core";
import { honoServer } from "@voltagent/server-hono";

const provider: AuthProvider = {
  type: "my-provider",
  async verifyToken(token, _request) {
    // Validate token and return your user object
    return { id: "user-id", role: "user" };
  },
};

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    authNext: { provider },
  }),
});
```

### Provider Recipes

VoltAgent does not ship official packages for these providers yet, but you can wire them up
by implementing `AuthProvider`. Use the examples below as starting points.

All examples assume:

```typescript
import type { AuthProvider } from "@voltagent/server-core";
```

#### Auth0 (JWKS)

Env:

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

const domain = process.env.AUTH0_DOMAIN!;
const audience = process.env.AUTH0_AUDIENCE!;
const jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));

const provider: AuthProvider = {
  type: "auth0",
  async verifyToken(token) {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${domain}/`,
      audience,
    });
    return payload;
  },
};
```

#### Clerk (JWKS)

Env:

- `CLERK_JWKS_URI` (from Clerk dashboard)
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

const jwks = createRemoteJWKSet(new URL(process.env.CLERK_JWKS_URI!));

const provider: AuthProvider = {
  type: "clerk",
  async verifyToken(token) {
    const { payload } = await jwtVerify(token, jwks);
    return payload;
  },
};
```

If you need organization membership or user lookups, use `@clerk/backend` with the secret and publishable keys.

#### WorkOS (JWKS)

Env:

- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`

```typescript
import { WorkOS } from "@workos-inc/node";
import { createRemoteJWKSet, jwtVerify } from "jose";

const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
});
const jwksUrl = workos.userManagement.getJwksUrl(process.env.WORKOS_CLIENT_ID!);
const jwks = createRemoteJWKSet(new URL(jwksUrl));

const provider: AuthProvider = {
  type: "workos",
  async verifyToken(token) {
    const { payload } = await jwtVerify(token, jwks);
    return payload;
  },
};
```

#### Firebase

Env:

- `FIREBASE_SERVICE_ACCOUNT` (path to service account JSON)
- `FIRESTORE_DATABASE_ID` or `FIREBASE_DATABASE_ID` (optional)

```typescript
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = initializeApp({
  credential: cert(process.env.FIREBASE_SERVICE_ACCOUNT!),
});

const provider: AuthProvider = {
  type: "firebase",
  async verifyToken(token) {
    return getAuth(app).verifyIdToken(token);
  },
};
```

#### Supabase

Env:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

```typescript
import { createClient } from "@supabase/supabase-js";

const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

const provider: AuthProvider = {
  type: "supabase",
  async verifyToken(token) {
    const { data, error } = await client.auth.getUser(token);
    if (error) {
      throw error;
    }
    return data.user;
  },
};
```

#### Better Auth

Env:

- `DATABASE_URL` (or whatever your Better Auth setup requires)

```typescript
import { betterAuth } from "better-auth";

const auth = betterAuth({
  // Your Better Auth configuration
});

const provider: AuthProvider = {
  type: "better-auth",
  async verifyToken(token, request) {
    const headers = new Headers();
    const authHeader = request?.headers?.get("authorization");
    headers.set("Authorization", authHeader ?? `Bearer ${token}`);

    const cookie = request?.headers?.get("cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    const result = await auth.api.getSession({ headers });
    if (!result?.user) {
      return null;
    }

    return result.user;
  },
};
```

These providers authenticate **user routes** only. Console routes still use the Console Access Key.

## WebSocket Authentication

VoltAgent WebSocket endpoints are used by the Console (logs, observability). Browsers cannot send headers in the handshake, so use query params:

```javascript
// Console auth (observability, logs)
const wsConsole = new WebSocket(`ws://localhost:3141/ws/observability?key=${consoleKey}`);

// Dev bypass (non-production only)
const wsDev = new WebSocket("ws://localhost:3141/ws/observability?dev=true");
```

If you expose **custom WebSocket endpoints**, include them in your authNext route patterns and use `?token=` for user access or `?key=` for console access.

## Testing Your Authentication

### Generate a Test Token

Create `generate-token.js`:

```javascript
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const token = jwt.sign(
  {
    id: "test-user",
    email: "test@example.com",
    role: "admin",
  },
  process.env.JWT_SECRET,
  { expiresIn: "24h" }
);

console.log("Token:", token);
```

### Test Protected Endpoints (authNext)

```bash
# Execution requires JWT
curl -X POST http://localhost:3141/agents/my-agent/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"input": "Hello"}'

# Management requires Console Key
curl http://localhost:3141/agents \
  -H "x-console-access-key: YOUR_CONSOLE_KEY"
```

## Troubleshooting

### Console Shows 401 Errors

**Production**:

```bash
export NODE_ENV=production
export VOLTAGENT_CONSOLE_ACCESS_KEY=your-key
```

Then provide the same key via header or `?key=`.

**Development**:

```bash
# Ensure NODE_ENV is not "production"
unset NODE_ENV
```

### WebSocket Connection Fails

Common causes:

1. Missing `?key=` (console) or `?token=` (custom user WS)
2. `NODE_ENV=production` with dev bypass headers
3. Using console key on user routes or JWT on console routes

### Mixed Authentication Issues

Remember the authNext split:

- **User routes** (execution) -> JWT
- **Console routes** (management, docs, observability, updates) -> Console Key
- **Public routes** -> no auth

## Security Best Practices

### 1. Use Environment Variables

```typescript
// Good: Environment variable
const provider = jwtAuth({
  secret: process.env.JWT_SECRET!,
});
```

### 2. Generate Strong Secrets

```bash
openssl rand -hex 32
```

### 3. Use HTTPS in Production

```typescript
if (process.env.NODE_ENV === "production") {
  app.use(async (c, next) => {
    if (c.req.header("x-forwarded-proto") !== "https") {
      return c.redirect(`https://${c.req.header("host")}${c.req.url}`);
    }
    await next();
  });
}
```

## Next Steps

- Learn about [Custom Endpoints](./custom-endpoints.md)
- See [Streaming](./streaming.md)
- Read about [Agent Endpoints](./endpoints/agents.md)
- Set up [Observability](../observability/developer-console.md)

## Legacy `auth` (Deprecated)

Legacy auth uses two default lists:

- **DEFAULT_LEGACY_PUBLIC_ROUTES** (alias `DEFAULT_PUBLIC_ROUTES`): management, docs, discovery
- **PROTECTED_ROUTES**: execution, tool execution, observability, updates

When `auth` is enabled:

- **Execution endpoints** require JWT
- **Management and docs** remain public
- `defaultPrivate: true` only protects **custom/unknown routes**, but does **not** override `DEFAULT_LEGACY_PUBLIC_ROUTES` (alias `DEFAULT_PUBLIC_ROUTES`)

If you need `/agents`, `/workflows`, `/doc`, or `/ui` protected, use **authNext**.

### Legacy Behavior Summary

| Endpoint Type                     | Legacy Auth (Default) | Legacy Auth (defaultPrivate: true) |
| --------------------------------- | --------------------- | ---------------------------------- |
| Execution (`POST /agents/*/text`) | Protected             | Protected                          |
| Management (`GET /agents`)        | Public                | Public                             |
| Docs (`/doc`, `/ui`)              | Public                | Public                             |
| Custom routes                     | Public                | Protected                          |

Observability and updates still require Console Access Key in production.

### Legacy Usage

Minimal setup with JWT:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { jwtAuth } from "@voltagent/server-core";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    auth: jwtAuth({
      secret: process.env.JWT_SECRET!,
    }),
  }),
});
```

### Legacy Route Controls

`auth` supports `publicRoutes` and `defaultPrivate` on the provider:

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET!,

  // Protect all unknown/custom routes by default
  defaultPrivate: true,

  // Add additional public routes
  publicRoutes: ["GET /health", "POST /webhooks/*"],
}),
```

Important behavior:

- `publicRoutes` are **added** to the default public list
- `defaultPrivate: true` does **not** make default public routes private
- To protect management or docs endpoints, switch to **authNext**

### Legacy Route Pattern Syntax

Legacy route patterns use the same matcher as authNext:

- `GET /agents/:id`
- `/observability/*`
- `/ws/observability/**`
