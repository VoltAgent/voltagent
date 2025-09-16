# @voltagent/server-core

## 1.0.6

### Patch Changes

- [#562](https://github.com/VoltAgent/voltagent/pull/562) [`2886b7a`](https://github.com/VoltAgent/voltagent/commit/2886b7aab5bda296cebc0b8b2bd56d684324d799) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: using `safeStringify` instead of `JSON.stringify`

## 1.0.5

### Patch Changes

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10

## 1.0.4

### Patch Changes

- [`78658de`](https://github.com/VoltAgent/voltagent/commit/78658de30e71c586df7391d52b4fe657fe4dc2b0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add ModelMessage format support to server API endpoints

  Server endpoints now accept ModelMessage format (messages with `role` and `content` fields) in addition to UIMessage format and plain strings. This allows clients to send messages in either format:
  - **String**: Direct text input
  - **UIMessage[]**: AI SDK UIMessage format with `parts` structure
  - **ModelMessage[]**: AI SDK ModelMessage format with `role` and `content` structure

  The change adopts a flexible validation approach similar to Mastra, where the server handlers pass input directly to agents which handle the conversion. API schemas and documentation have been updated to reflect this support.

  Example:

  ```typescript
  // All three formats are now supported
  await fetch("/agents/assistant/text", {
    method: "POST",
    body: JSON.stringify({
      // Option 1: String
      input: "Hello",

      // Option 2: UIMessage format
      input: [{ role: "user", parts: [{ type: "text", text: "Hello" }] }],

      // Option 3: ModelMessage format
      input: [{ role: "user", content: "Hello" }],
    }),
  });
  ```

## 1.0.3

### Patch Changes

- [`3177a60`](https://github.com/VoltAgent/voltagent/commit/3177a60a2632c200150e8a71d706b44df508cc66) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: version bump

## 2.0.0

### Patch Changes

- Updated dependencies [[`63d4787`](https://github.com/VoltAgent/voltagent/commit/63d4787bd92135fa2d6edffb3b610889ddc0e3f5)]:
  - @voltagent/core@1.1.0

## 1.0.2

### Patch Changes

- [`c27b260`](https://github.com/VoltAgent/voltagent/commit/c27b260bfca007da5201eb2967e089790cab3b97) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod dependency moved from dependencies to devDependencies

## 1.0.1

### Patch Changes

- [#545](https://github.com/VoltAgent/voltagent/pull/545) [`5d7c8e7`](https://github.com/VoltAgent/voltagent/commit/5d7c8e7f3898fe84066d0dd9be7f573fca66f185) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve EADDRINUSE error on server startup by fixing race condition in port availability check - #544

  Fixed a critical issue where users would encounter "EADDRINUSE: address already in use" errors when starting VoltAgent servers. The problem was caused by a race condition in the port availability check where the test server wasn't fully closed before the actual server tried to bind to the same port.

  ## What was happening

  When checking if a port was available, the port manager would:
  1. Create a test server and bind to the port
  2. On successful binding, immediately close the server
  3. Return `true` indicating the port was available
  4. But the test server wasn't fully closed yet when `serve()` tried to bind to the same port

  ## The fix

  Modified the port availability check in `port-manager.ts` to:
  - Wait for the server's close callback before returning
  - Add a small delay (50ms) to ensure the OS has fully released the port
  - This prevents the race condition between test server closure and actual server startup

  ## Changes
  - **port-manager.ts**: Fixed race condition by properly waiting for test server to close
  - **hono-server-provider.ts**: Added proper error handling for server startup failures

  This ensures reliable server startup without port conflicts.

- [#546](https://github.com/VoltAgent/voltagent/pull/546) [`f12f344`](https://github.com/VoltAgent/voltagent/commit/f12f34405edf0fcb417ed098deba62570260fb81) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: align Zod to ^3.25.76 and fix type mismatch with AI SDK

  We aligned Zod versions across packages to `^3.25.76` to match AI SDK peer ranges and avoid multiple Zod instances at runtime.

  Why this matters
  - Fixes TypeScript narrowing issues in workflows when consuming `@voltagent/core` from npm with a different Zod instance (e.g., `ai` packages pulling newer Zod).
  - Prevents errors like "Spread types may only be created from object types" where `data` failed to narrow because `z.ZodTypeAny` checks saw different Zod identities.

  What changed
  - `@voltagent/server-core`, `@voltagent/server-hono`: dependencies.zod → `^3.25.76`.
  - `@voltagent/docs-mcp`, `@voltagent/core`: devDependencies.zod → `^3.25.76`.
  - Examples and templates updated to use `^3.25.76` for consistency (non-publishable).

  Notes for consumers
  - Ensure a single Zod version is installed (consider a workspace override to pin Zod to `3.25.76`).
  - This improves compatibility with `ai@5.x` packages that require `zod@^3.25.76 || ^4`.

- Updated dependencies [[`f12f344`](https://github.com/VoltAgent/voltagent/commit/f12f34405edf0fcb417ed098deba62570260fb81)]:
  - @voltagent/core@1.0.1

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
