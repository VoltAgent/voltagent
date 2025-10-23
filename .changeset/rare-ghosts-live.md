---
"@voltagent/server-hono": minor
---

fix: simplify CORS configuration and ensure custom routes are auth-protected

## Breaking Changes

### CORS Configuration

CORS configuration has been simplified. Instead of configuring CORS in `configureApp`, use the new `cors` field:

**Before:**

```typescript
server: honoServer({
  configureApp: (app) => {
    app.use(
      "*",
      cors({
        origin: "https://your-domain.com",
        credentials: true,
      })
    );

    app.get("/api/health", (c) => c.json({ status: "ok" }));
  },
});
```

**After (Simple global CORS):**

```typescript
server: honoServer({
  cors: {
    origin: "https://your-domain.com",
    credentials: true,
  },
  configureApp: (app) => {
    app.get("/api/health", (c) => c.json({ status: "ok" }));
  },
});
```

**After (Route-specific CORS):**

```typescript
import { cors } from "hono/cors";

server: honoServer({
  cors: false, // Disable default CORS for route-specific control

  configureApp: (app) => {
    // Different CORS for different routes
    app.use("/agents/*", cors({ origin: "https://agents.com" }));
    app.use("/api/public/*", cors({ origin: "*" }));

    app.get("/api/health", (c) => c.json({ status: "ok" }));
  },
});
```

### Custom Routes Authentication

Custom routes added via `configureApp` are now registered AFTER authentication middleware. This means:

- **Opt-in mode** (default): Custom routes follow the same auth rules as built-in routes
- **Opt-out mode** (`defaultPrivate: true`): Custom routes are automatically protected

**Before:** Custom routes bypassed authentication unless you manually added auth middleware.

**After:** Custom routes inherit authentication behavior automatically.

**Example with opt-out mode:**

```typescript
server: honoServer({
  auth: jwtAuth({
    secret: process.env.JWT_SECRET,
    defaultPrivate: true, // Protect all routes by default
    publicRoutes: ["GET /api/health"],
  }),
  configureApp: (app) => {
    // This is now automatically protected
    app.get("/api/user/profile", (c) => {
      const user = c.get("authenticatedUser");
      return c.json({ user }); // user is guaranteed to exist
    });
  },
});
```

## Why This Change?

1. **Security**: Custom routes are no longer accidentally left unprotected
2. **Simplicity**: CORS configuration is now a simple config field for common cases
3. **Flexibility**: Advanced users can still use route-specific CORS with `cors: false`
4. **Consistency**: Custom routes follow the same authentication rules as built-in routes
