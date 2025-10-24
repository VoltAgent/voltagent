---
"@voltagent/server-hono": patch
---

feat: automatic detection and display of custom routes in console logs and Swagger UI

Custom routes added via `configureApp` callback are now automatically detected and displayed in both server startup logs and Swagger UI documentation.

## What Changed

Previously, only OpenAPI-registered routes were visible in:

- Server startup console logs
- Swagger UI documentation (`/ui`)

Now **all custom routes** are automatically detected, including:

- Regular Hono routes (`app.get()`, `app.post()`, etc.)
- OpenAPI routes with full documentation
- Routes with path parameters (`:id`, `{id}`)

## Usage Example

```typescript
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    configureApp: (app) => {
      // These routes are now automatically detected!
      app.get("/api/health", (c) => c.json({ status: "ok" }));
      app.post("/api/calculate", async (c) => {
        const { a, b } = await c.req.json();
        return c.json({ result: a + b });
      });
    },
  }),
});
```

## Console Output

```
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ✓ Swagger UI:   http://localhost:3141/ui

  ✓ Registered Endpoints: 2 total

    Custom Endpoints
      GET    /api/health
      POST   /api/calculate
══════════════════════════════════════════════════
```

## Improvements

- ✅ Extracts routes from `app.routes` array (includes all Hono routes)
- ✅ Merges with OpenAPI document routes for descriptions
- ✅ Filters out built-in VoltAgent paths using exact matching (not regex)
- ✅ Custom routes like `/agents-dashboard` or `/workflows-manager` are now correctly detected
- ✅ Normalizes path formatting (removes duplicate slashes)
- ✅ Handles both `:param` and `{param}` path parameter formats
- ✅ Adds custom routes to Swagger UI with auto-generated schemas
- ✅ Comprehensive test coverage (44 unit tests)

## Implementation Details

The `extractCustomEndpoints()` function now:

1. Extracts all routes from `app.routes` (regular Hono routes)
2. Merges with OpenAPI document routes (for descriptions)
3. Deduplicates and filters built-in VoltAgent routes
4. Returns a complete list of custom endpoints

The `getEnhancedOpenApiDoc()` function:

1. Adds custom routes to OpenAPI document for Swagger UI
2. Generates response schemas for undocumented routes
3. Preserves existing OpenAPI documentation
4. Supports path parameters and request bodies
