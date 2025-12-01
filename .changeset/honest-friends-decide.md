---
"@voltagent/server-core": patch
---

fix: ensure `jwtAuth` respects `defaultPrivate` option

The `jwtAuth` helper function was ignoring the `defaultPrivate` option, causing custom routes to remain public even when `defaultPrivate: true` was set. This change ensures that the option is correctly passed to the authentication provider, enforcing security on all routes by default when enabled.

## Example

```typescript
// Custom routes are now properly secured
server: honoServer({
  auth: jwtAuth({
    secret: "...",
    defaultPrivate: true, // Now correctly enforces auth on all routes
    publicRoutes: ["GET /health"],
  }),
  configureApp: (app) => {
    // This route is now protected (returns 401 without token)
    app.get("/api/protected", (c) => c.json({ message: "Protected" }));
  },
}),
```
