# @voltagent/server-core

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Server Core 1.x — typed routes, schemas, utilities

  Server functionality lives outside core. Use `@voltagent/server-core` types/schemas with `@voltagent/server-hono`.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Example: extend the app

  ```ts
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";
  import { AgentRoutes } from "@voltagent/server-core"; // typed route defs (optional)

  new VoltAgent({
    agents: { agent },
    server: honoServer({
      configureApp: (app) => {
        // Add custom endpoints alongside the built‑ins
        app.get("/api/health", (c) => c.json({ status: "ok" }));
      },
    }),
  });
  ```

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/core@1.0.0

## 1.0.0-next.2

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Server Core 1.x — typed routes, schemas, utilities

  Server functionality lives outside core. Use `@voltagent/server-core` types/schemas with `@voltagent/server-hono`.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Example: extend the app

  ```ts
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";
  import { AgentRoutes } from "@voltagent/server-core"; // typed route defs (optional)

  new VoltAgent({
    agents: { agent },
    server: honoServer({
      configureApp: (app) => {
        // Add custom endpoints alongside the built‑ins
        app.get("/api/health", (c) => c.json({ status: "ok" }));
      },
    }),
  });
  ```

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/core@1.0.0-next.2

## 1.0.0-next.1

### Patch Changes

- Updated dependencies [[`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce), [`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce)]:
  - @voltagent/core@1.0.0-next.1
