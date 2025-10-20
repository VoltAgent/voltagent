---
"@voltagent/server-hono": patch
---

fix: resolve CORS middleware execution order issue preventing custom CORS configuration

Fixed a critical issue where custom CORS middleware configured in `configureApp` was not being applied because the default CORS middleware was registered before user configuration.

## The Problem

When users configured custom CORS settings in `configureApp`, their configuration was ignored:

- Default CORS middleware (`origin: "*"`) was applied before `configureApp` was called
- Hono middleware executes in registration order, so default CORS handled OPTIONS requests first
- Custom CORS middleware never executed, causing incorrect CORS headers in responses

## The Solution

- Restructured middleware execution order to call `configureApp` **first**
- Added detection logic to identify when users configure custom CORS
- Default CORS now only applies if user hasn't configured custom CORS
- Custom CORS configuration takes full control when present

## Impact

- Custom CORS configurations in `configureApp` now work correctly
- Users can specify custom origins, headers, methods, and credentials
- Maintains backward compatibility - default CORS still applies when no custom CORS is configured
- Updated documentation with middleware execution order and CORS configuration examples

## Example Usage

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { cors } from "hono/cors";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    configureApp: (app) => {
      // Custom CORS configuration now works correctly
      app.use(
        "*",
        cors({
          origin: "https://your-domain.com",
          allowHeaders: ["X-Custom-Header", "Content-Type"],
          allowMethods: ["POST", "GET", "OPTIONS"],
          credentials: true,
        })
      );
    },
  }),
});
```
