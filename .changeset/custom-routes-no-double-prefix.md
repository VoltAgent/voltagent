---
"@voltagent/server-hono": patch
---

fix(server-hono): don't double-prefix basePath when Hono already merged it into route.path

When a sub-app is mounted via `app.route(basePath, subApp)` or `app.basePath(basePath)`,
Hono's internal `_addRoute` calls `mergePath(basePath, path)` and stores the merged
result in `route.path`, while still keeping `basePath` on the route as metadata.
`extractCustomEndpoints` blindly prepended `basePath` to `route.path`, so a route
registered as `/api/hello` with `basePath: "/api"` was logged as `GET /api/api/hello`
even though Hono served it correctly at `/api/hello`. Only prepend `basePath` when
`route.path` does not already include it.
