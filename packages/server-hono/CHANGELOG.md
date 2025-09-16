# @voltagent/server-hono

## 1.0.5

### Patch Changes

- [#571](https://github.com/VoltAgent/voltagent/pull/571) [`b801a8d`](https://github.com/VoltAgent/voltagent/commit/b801a8da47da5cad15b8637635f83acab5e0d6fc) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add Zod v3/v4 compatibility layer for @hono/zod-openapi
  - Added dynamic detection of Zod version using `toJSONSchema` method check
  - Conditionally loads correct @hono/zod-openapi version based on installed Zod
  - Fixed route definitions to use enhanced `z` from zod-openapi-compat instead of extending base schemas
  - Resolves `.openapi()` method not found errors when using Zod v4

- [#571](https://github.com/VoltAgent/voltagent/pull/571) [`b801a8d`](https://github.com/VoltAgent/voltagent/commit/b801a8da47da5cad15b8637635f83acab5e0d6fc) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

- Updated dependencies [[`b801a8d`](https://github.com/VoltAgent/voltagent/commit/b801a8da47da5cad15b8637635f83acab5e0d6fc)]:
  - @voltagent/server-core@1.0.7

## 1.0.5-next.2

### Patch Changes

- [`7d05717`](https://github.com/VoltAgent/voltagent/commit/7d057172029e594b8fe7c77e7fe49fdb3c937ac3) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add Zod v3/v4 compatibility layer for @hono/zod-openapi
  - Added dynamic detection of Zod version using `toJSONSchema` method check
  - Conditionally loads correct @hono/zod-openapi version based on installed Zod
  - Fixed route definitions to use enhanced `z` from zod-openapi-compat instead of extending base schemas
  - Resolves `.openapi()` method not found errors when using Zod v4

## 1.0.5-next.1

### Patch Changes

- [#551](https://github.com/VoltAgent/voltagent/pull/551) [`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

- Updated dependencies [[`78a5046`](https://github.com/VoltAgent/voltagent/commit/78a5046ca4d768a96650ebee63ae1630b0dff7a7)]:
  - @voltagent/server-core@1.0.7-next.1

## 1.0.5-next.0

### Patch Changes

- [#551](https://github.com/VoltAgent/voltagent/pull/551) [`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

- Updated dependencies [[`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3)]:
  - @voltagent/core@1.1.7-next.0
  - @voltagent/server-core@1.0.7-next.0

## 1.0.4

### Patch Changes

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10
  - @voltagent/server-core@1.0.5

## 1.0.3

### Patch Changes

- [`3177a60`](https://github.com/VoltAgent/voltagent/commit/3177a60a2632c200150e8a71d706b44df508cc66) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: version bump

- Updated dependencies [[`3177a60`](https://github.com/VoltAgent/voltagent/commit/3177a60a2632c200150e8a71d706b44df508cc66)]:
  - @voltagent/server-core@1.0.3

## 2.0.0

### Patch Changes

- Updated dependencies [[`63d4787`](https://github.com/VoltAgent/voltagent/commit/63d4787bd92135fa2d6edffb3b610889ddc0e3f5)]:
  - @voltagent/core@1.1.0
  - @voltagent/server-core@2.0.0

## 1.0.2

### Patch Changes

- [`c27b260`](https://github.com/VoltAgent/voltagent/commit/c27b260bfca007da5201eb2967e089790cab3b97) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod dependency moved from dependencies to devDependencies

- Updated dependencies [[`c27b260`](https://github.com/VoltAgent/voltagent/commit/c27b260bfca007da5201eb2967e089790cab3b97)]:
  - @voltagent/server-core@1.0.2

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

- Updated dependencies [[`5d7c8e7`](https://github.com/VoltAgent/voltagent/commit/5d7c8e7f3898fe84066d0dd9be7f573fca66f185), [`f12f344`](https://github.com/VoltAgent/voltagent/commit/f12f34405edf0fcb417ed098deba62570260fb81)]:
  - @voltagent/server-core@1.0.1
  - @voltagent/core@1.0.1

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Server Hono 1.x — pluggable HTTP server

  Core no longer embeds an HTTP server. Use the Hono provider.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Basic setup

  ```ts
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { agent },
    server: honoServer({ port: 3141, enableSwaggerUI: true }),
  });
  ```

  ## Custom routes and auth

  ```ts
  import { honoServer, jwtAuth } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { agent },
    server: honoServer({
      configureApp: (app) => {
        app.get("/api/health", (c) => c.json({ status: "ok" }));
      },
      auth: jwtAuth({
        secret: process.env.JWT_SECRET!,
        publicRoutes: ["/health", "/metrics"],
      }),
    }),
  });
  ```

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93), [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/core@1.0.0
  - @voltagent/server-core@1.0.0

## 1.0.0-next.2

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Server Hono 1.x — pluggable HTTP server

  Core no longer embeds an HTTP server. Use the Hono provider.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Basic setup

  ```ts
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { agent },
    server: honoServer({ port: 3141, enableSwaggerUI: true }),
  });
  ```

  ## Custom routes and auth

  ```ts
  import { honoServer, jwtAuth } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { agent },
    server: honoServer({
      configureApp: (app) => {
        app.get("/api/health", (c) => c.json({ status: "ok" }));
      },
      auth: jwtAuth({
        secret: process.env.JWT_SECRET!,
        publicRoutes: ["/health", "/metrics"],
      }),
    }),
  });
  ```

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93), [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/core@1.0.0-next.2
  - @voltagent/server-core@1.0.0-next.2

## 1.0.0-next.1

### Minor Changes

- [#514](https://github.com/VoltAgent/voltagent/pull/514) [`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce) Thanks [@omeraplak](https://github.com/omeraplak)! - # VoltAgent Server Architecture - Pluggable Server Providers

  VoltAgent's server architecture has been completely redesigned with a pluggable server provider pattern, removing the built-in server in favor of optional server packages.

  ## Breaking Changes

  ### Built-in Server Removed

  The built-in server has been removed from the core package. Server functionality is now provided through separate server packages.

  **Before:**

  ```typescript
  import { VoltAgent } from "@voltagent/core";

  // Server was built-in and auto-started
  const voltAgent = new VoltAgent({
    agents: { myAgent },
    port: 3000,
    enableSwaggerUI: true,
    autoStart: true, // Server auto-started
  });
  ```

  **After:**

  ```typescript
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";

  // Server is now optional and explicitly configured
  const voltAgent = new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3000,
      enableSwaggerUI: true,
    }),
  });
  ```

  ### Custom Endpoints Removed

  Custom endpoint registration methods have been removed. Custom routes should now be added through the server provider's `configureApp` option.

  **Before:**

  ```typescript
  voltAgent.registerCustomEndpoint({
    path: "/custom",
    method: "GET",
    handler: async (req) => {
      return { message: "Hello" };
    },
  });
  ```

  **After:**

  ```typescript
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3000,
      // Configure custom routes via configureApp callback
      configureApp: (app) => {
        app.get("/api/custom", (c) => {
          return c.json({ message: "Hello" });
        });

        app.post("/api/calculate", async (c) => {
          const { a, b } = await c.req.json();
          return c.json({ result: a + b });
        });
      },
    }),
  });
  ```

  ### Server Management Methods Changed

  **Before:**

  ```typescript
  // Server started automatically or with:
  voltAgent.startServer();
  // No stop method available
  ```

  **After:**

  ```typescript
  // Server starts automatically if provider is configured
  voltAgent.startServer(); // Still available
  voltAgent.stopServer(); // New method for graceful shutdown
  ```

  ## New Server Provider Pattern

  ### IServerProvider Interface

  Server providers must implement the `IServerProvider` interface:

  ```typescript
  interface IServerProvider {
    start(): Promise<{ port: number }>;
    stop(): Promise<void>;
    isRunning(): boolean;
  }
  ```

  ### Available Server Providers

  #### @voltagent/server-hono (Recommended)

  Edge-optimized server using Hono framework:

  ```typescript
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,
      enableSwaggerUI: true,
      auth: {
        provider: "jwt",
        secret: "your-secret",
      },
      configureApp: (app) => {
        // Add custom routes
        app.get("/api/health", (c) => {
          return c.json({ status: "healthy" });
        });
      },
    }),
  });
  ```

  Features:
  - **Built-in JWT Authentication**: Secure your API with JWT tokens
  - **Swagger UI Support**: Interactive API documentation
  - **WebSocket Support**: Real-time streaming capabilities
  - **Edge Runtime Compatible**: Deploy to Vercel Edge, Cloudflare Workers, etc.
  - **Fast and Lightweight**: Optimized for performance

  #### Authentication & Authorization

  The server-hono package includes comprehensive JWT authentication support:

  ```typescript
  import { honoServer, jwtAuth } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,

      // Configure JWT authentication
      auth: jwtAuth({
        secret: process.env.JWT_SECRET,

        // Map JWT payload to user object
        mapUser: (payload) => ({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions || [],
        }),

        // Define public routes (no auth required)
        publicRoutes: ["/health", "/metrics"],

        // JWT verification options
        verifyOptions: {
          algorithms: ["HS256"],
          audience: "your-app",
          issuer: "your-auth-server",
        },
      }),
    }),
  });
  ```

  **Accessing User Context in Agents:**

  ```typescript
  const agent = new Agent({
    name: "SecureAgent",
    instructions: "You are a secure assistant",
    model: openai("gpt-4o-mini"),

    // Access authenticated user in hooks
    hooks: {
      onStart: async ({ context }) => {
        const user = context.get("user");
        if (user?.role === "admin") {
          // Admin-specific logic
        }
      },
    },
  });
  ```

  **Making Authenticated Requests:**

  ```bash
  # Include JWT token in Authorization header
  curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    http://localhost:3141/api/agent/chat
  ```

  ### No Server Configuration

  For serverless or custom deployments:

  ```typescript
  new VoltAgent({
    agents: { myAgent },
    // No server property - runs without HTTP server
  });
  ```

  ## Migration Guide
  1. **Install server package**:

     ```bash
     npm install @voltagent/server-hono
     ```

  2. **Update imports**:

     ```typescript
     import { honoServer } from "@voltagent/server-hono";
     ```

  3. **Update VoltAgent configuration**:
     - Remove: `port`, `enableSwaggerUI`, `autoStart`, `customEndpoints`
     - Add: `server: honoServer({ /* config */ })`
  4. **Handle custom routes**:
     - Use `configureApp` callback in server config
     - Access full Hono app instance for custom routes

### Patch Changes

- Updated dependencies [[`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce), [`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce)]:
  - @voltagent/core@1.0.0-next.1
  - @voltagent/server-core@1.0.0-next.1
