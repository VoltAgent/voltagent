# @voltagent/server-hono

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
