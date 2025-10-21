---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

feat: add defaultPrivate option to AuthProvider for protecting all routes by default

## The Problem

When using VoltAgent with third-party auth providers (like Clerk, Auth0, or custom providers), custom routes added via `configureApp` were public by default. This meant:

- Only routes explicitly in `PROTECTED_ROUTES` required authentication
- Custom endpoints needed manual middleware to be protected
- The `publicRoutes` property couldn't make all routes private by default

This was especially problematic when integrating with enterprise auth systems where security-by-default is expected.

## The Solution

Added `defaultPrivate` option to `AuthProvider` interface, enabling two authentication modes:

- **Opt-In Mode** (default, `defaultPrivate: false`): Only specific routes require auth
- **Opt-Out Mode** (`defaultPrivate: true`): All routes require auth unless explicitly listed in `publicRoutes`

## Usage Example

### Protecting All Routes with Clerk

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer, jwtAuth } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    auth: jwtAuth({
      secret: process.env.CLERK_JWT_KEY,
      defaultPrivate: true, // 🔒 Protect all routes by default
      publicRoutes: ["GET /health", "POST /webhooks/clerk"],
      mapUser: (payload) => ({
        id: payload.sub,
        email: payload.email,
      }),
    }),
    configureApp: (app) => {
      // ✅ Public (in publicRoutes)
      app.get("/health", (c) => c.json({ status: "ok" }));

      // 🔒 Protected automatically (defaultPrivate: true)
      app.get("/api/user/data", (c) => {
        const user = c.get("authenticatedUser");
        return c.json({ user });
      });
    },
  }),
});
```

### Default Behavior (Backward Compatible)

```typescript
// Without defaultPrivate, behavior is unchanged
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  // defaultPrivate: false (default)
});

// Custom routes are public unless you add your own middleware
configureApp: (app) => {
  app.get("/api/data", (c) => {
    // This is PUBLIC by default
    return c.json({ data: "anyone can access" });
  });
};
```

## Benefits

- ✅ **Fail-safe security**: Routes are protected by default when enabled
- ✅ **No manual middleware**: Custom endpoints automatically protected
- ✅ **Perfect for third-party auth**: Ideal for Clerk, Auth0, Supabase
- ✅ **Backward compatible**: No breaking changes, opt-in feature
- ✅ **Fine-grained control**: Use `publicRoutes` to selectively allow access
