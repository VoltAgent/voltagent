# @voltagent/server-hono

## 1.2.7

### Patch Changes

- [#845](https://github.com/VoltAgent/voltagent/pull/845) [`5432f13`](https://github.com/VoltAgent/voltagent/commit/5432f13bddebd869522ebffbedd9843b4476f08b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: workflow execution listing - #844

  Added a unified way to list workflow runs so teams can audit executions across every storage backend and surface them via the API and console.

  ## What changed
  - `queryWorkflowRuns` now exists on all memory adapters (in-memory, libsql, Postgres, Supabase, voltagent-memory) with filters for `workflowId`, `status`, `from`, `to`, `limit`, and `offset`.
  - Server routes are consolidated under `/workflows/executions` (no path param needed); `GET /workflows/:id` also returns the workflow result schema for typed clients. Handler naming is standardized to `listWorkflowRuns`.
  - VoltOps Console observability panel lists the new endpoint; REST docs updated with query params and sample responses. New unit tests cover handlers and every storage adapter.

  ## Quick fetch

  ```ts
  await fetch(
    "http://localhost:3141/workflows/executions?workflowId=expense-approval&status=completed&from=2024-01-01&to=2024-01-31&limit=20&offset=0"
  );
  ```

- Updated dependencies [[`5432f13`](https://github.com/VoltAgent/voltagent/commit/5432f13bddebd869522ebffbedd9843b4476f08b)]:
  - @voltagent/server-core@1.0.32
  - @voltagent/core@1.2.17

## 1.2.6

### Patch Changes

- [`d3e0995`](https://github.com/VoltAgent/voltagent/commit/d3e09950fb8708db8beb9db2f1b8eafbe47686ea) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add CLI announcements system for server startup

  VoltAgent server now displays announcements during startup, keeping developers informed about new features and updates.

  ## How It Works

  When the server starts, it fetches announcements from a centralized GitHub-hosted JSON file and displays them in a minimal, non-intrusive format:

  ```
    ⚡ Introducing VoltOps Deployments → https://console.voltagent.dev/deployments
  ```

  ## Key Features
  - **Dynamic updates**: Announcements are fetched from GitHub at runtime, so new announcements appear without requiring a package update
  - **Non-blocking**: Uses a 3-second timeout and fails silently to never delay server startup
  - **Minimal footprint**: Single-line format inspired by Next.js, doesn't clutter the console
  - **Toggle support**: Each announcement has an `enabled` flag for easy control

  ## Technical Details
  - Announcements source: `https://raw.githubusercontent.com/VoltAgent/voltagent/main/announcements.json`
  - New `showAnnouncements()` function exported from `@voltagent/server-core`
  - Integrated into both `BaseServerProvider` and `HonoServerProvider` startup flow

- [#837](https://github.com/VoltAgent/voltagent/pull/837) [`3bdb4ad`](https://github.com/VoltAgent/voltagent/commit/3bdb4ad24d0c9cb5eb9143b303752b22b4727457) Thanks [@venatir](https://github.com/venatir)! - feat: enhance app configuration - adding `configureFullApp`

- Updated dependencies [[`d3e0995`](https://github.com/VoltAgent/voltagent/commit/d3e09950fb8708db8beb9db2f1b8eafbe47686ea)]:
  - @voltagent/server-core@1.0.31

## 1.2.5

### Patch Changes

- [#812](https://github.com/VoltAgent/voltagent/pull/812) [`0f64363`](https://github.com/VoltAgent/voltagent/commit/0f64363a2b577e025fae41276cc0d85ef7fc0644) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: comprehensive authentication system with JWT, Console Access, and WebSocket support

  ## The Problem

  VoltAgent's authentication system had several critical gaps that made it difficult to secure production deployments:
  1. **No Authentication Support:** The framework lacked built-in authentication, forcing developers to implement their own security
  2. **WebSocket Security:** WebSocket connections for observability had no authentication, exposing sensitive telemetry data
  3. **Browser Limitations:** Browsers cannot send custom headers during WebSocket handshake, making authentication impossible
  4. **Development vs Production:** No clear separation between development convenience and production security
  5. **Console Access:** No secure way for the VoltAgent Console to access observability endpoints in production

  ## The Solution

  **JWT Authentication (`@voltagent/server-core`, `@voltagent/server-hono`):**
  - Added pluggable `jwtAuth` provider with configurable secret and options
  - Implemented `mapUser` function to transform JWT payloads into user objects
  - Created flexible route protection with `defaultPrivate` mode (opt-out vs opt-in)
  - Added `publicRoutes` configuration for fine-grained control

  **WebSocket Authentication:**
  - Implemented query parameter authentication for browser WebSocket connections
  - Added dual authentication support (headers for servers, query params for browsers)
  - Created WebSocket-specific authentication helpers for observability endpoints
  - Preserved user context throughout WebSocket connection lifecycle

  **Console Access System:**
  - Introduced `VOLTAGENT_CONSOLE_ACCESS_KEY` environment variable for production Console access
  - Added `x-console-access-key` header support for HTTP requests
  - Implemented query parameter `?key=` for WebSocket connections
  - Created `hasConsoleAccess()` utility for unified access checking

  **Development Experience:**
  - Enhanced `x-voltagent-dev` header to work with both HTTP and WebSocket
  - Added `isDevRequest()` helper that requires both header AND non-production environment
  - Implemented query parameter `?dev=true` for browser WebSocket connections
  - Maintained zero-config development mode while ensuring production security

  **Route Matching Improvements:**
  - Added wildcard support with `/observability/*` pattern for all observability endpoints
  - Implemented double-star pattern `/api/**` for path and all children
  - Enhanced `pathMatches()` function with proper segment matching
  - Protected all observability, workflow control, and system update endpoints by default

  ## Impact
  - ✅ **Production Ready:** Complete authentication system for securing VoltAgent deployments
  - ✅ **WebSocket Security:** Browser-compatible authentication for real-time observability
  - ✅ **Console Integration:** Secure access for VoltAgent Console in production environments
  - ✅ **Developer Friendly:** Zero-config development with automatic authentication bypass
  - ✅ **Flexible Security:** Choose between opt-in (default) or opt-out authentication modes
  - ✅ **User Context:** Automatic user injection into agent and workflow execution context

  ## Technical Details

  **Protected Routes (Default):**

  ```typescript
  // Agent/Workflow Execution
  POST /agents/:id/text
  POST /agents/:id/stream
  POST /workflows/:id/run

  // All Observability Endpoints
  /observability/*  // Traces, logs, memory - all methods

  // Workflow Control
  POST /workflows/:id/executions/:executionId/suspend
  POST /workflows/:id/executions/:executionId/resume

  // System Updates
  GET /updates
  POST /updates/:packageName
  ```

  **Authentication Modes:**

  ```typescript
  // Opt-in mode (default) - Only execution endpoints protected
  auth: jwtAuth({
    secret: process.env.JWT_SECRET,
  });

  // Opt-out mode - Everything protected except specified routes
  auth: jwtAuth({
    secret: process.env.JWT_SECRET,
    defaultPrivate: true,
    publicRoutes: ["GET /health", "POST /webhooks/*"],
  });
  ```

  **WebSocket Authentication Flow:**

  ```typescript
  // Browser WebSocket with query params
  new WebSocket("ws://localhost:3000/ws/observability?key=console-key");
  new WebSocket("ws://localhost:3000/ws/observability?dev=true");

  // Server WebSocket with headers
  ws.connect({
    headers: {
      "x-console-access-key": "console-key",
      "x-voltagent-dev": "true",
    },
  });
  ```

  ## Migration Notes

  **For Existing Users:**
  1. **No Breaking Changes:** Authentication is optional. Existing deployments continue to work without configuration.
  2. **To Enable Authentication:**

     ```typescript
     import { jwtAuth } from "@voltagent/server-hono";

     new VoltAgent({
       server: honoServer({
         auth: jwtAuth({
           secret: process.env.JWT_SECRET,
         }),
       }),
     });
     ```

  3. **For Production Console:**

     ```bash
     # .env
     VOLTAGENT_CONSOLE_ACCESS_KEY=your-secure-key
     NODE_ENV=production
     ```

  4. **Generate Secrets:**

     ```bash
     # JWT Secret
     openssl rand -hex 32

     # Console Access Key
     openssl rand -hex 32
     ```

  5. **Test Token Generation:**
     ```javascript
     // generate-token.js
     import jwt from "jsonwebtoken";
     const token = jwt.sign({ id: "user-1", email: "test@example.com" }, process.env.JWT_SECRET, {
       expiresIn: "24h",
     });
     console.log(token);
     ```

  ## Documentation

  Comprehensive authentication documentation has been added to `/website/docs/api/authentication.md` covering:
  - Getting started with three authentication options
  - Common use cases with code examples
  - Advanced configuration with `mapUser` function
  - Console and observability authentication
  - Security best practices
  - Troubleshooting guide

- Updated dependencies [[`0f64363`](https://github.com/VoltAgent/voltagent/commit/0f64363a2b577e025fae41276cc0d85ef7fc0644)]:
  - @voltagent/server-core@1.0.26
  - @voltagent/core@1.2.9

## 1.2.4

### Patch Changes

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add triggers DSL improvements and event payload simplification
  - Introduce the new `createTriggers` DSL and expose trigger events via sensible provider names (e.g. `on.airtable.recordCreated`) rather than raw catalog IDs.
  - Add trigger span metadata propagation so VoltAgent agents receive trigger context automatically without manual mapping.
  - Simplify action dispatch payloads: `payload` now contains only the event’s raw data while trigger context lives in the `event`/`metadata` blocks, reducing boilerplate in handlers.

  ```ts
  import { VoltAgent, createTriggers } from "@voltagent/core";

  new VoltAgent({
    // ...
    triggers: createTriggers((on) => {
      on.airtable.recordCreated(({ payload, event }) => {
        console.log("New Airtable row", payload, event.metadata);
      });

      on.gmail.newEmail(({ payload }) => {
        console.log("New Gmail message", payload);
      });
    }),
  });
  ```

- Updated dependencies [[`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749), [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749)]:
  - @voltagent/server-core@1.0.25
  - @voltagent/core@1.2.6

## 1.2.3

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

- Updated dependencies [[`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0)]:
  - @voltagent/server-core@1.0.22
  - @voltagent/core@1.2.3

## 1.2.2

### Patch Changes

- [#734](https://github.com/VoltAgent/voltagent/pull/734) [`2084fd4`](https://github.com/VoltAgent/voltagent/commit/2084fd491db4dbc89c432d1e72a633ec0c42d92b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add URL path support for single package updates and resolve 404 errors

  ## The Problem

  The update endpoint only accepted package names via request body (`POST /updates` with `{ "packageName": "@voltagent/core" }`), but users expected to be able to specify the package name directly in the URL path (`POST /updates/@voltagent/core`). This caused 404 errors when trying to update individual packages using the more intuitive URL-based approach.

  ## The Solution

  Added a new route `POST /updates/:packageName` that accepts the package name as a URL parameter, providing a more RESTful API design while maintaining backward compatibility with the existing body-based approach.

  **New Routes Available:**
  - `POST /updates/@voltagent/core` - Update single package (package name in URL path)
  - `POST /updates` with body `{ "packageName": "@voltagent/core" }` - Update single package (package name in body)
  - `POST /updates` with no body - Update all VoltAgent packages

  **Package Manager Detection:**
  The system automatically detects your package manager based on lock files:
  - `pnpm-lock.yaml` → uses `pnpm add`
  - `yarn.lock` → uses `yarn add`
  - `package-lock.json` → uses `npm install`
  - `bun.lockb` → uses `bun add`

  ## Usage Example

  ```typescript
  // Update a single package using URL path
  fetch("http://localhost:3141/updates/@voltagent/core", {
    method: "POST",
  });

  // Or using the body parameter (backward compatible)
  fetch("http://localhost:3141/updates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packageName: "@voltagent/core" }),
  });

  // Update all packages
  fetch("http://localhost:3141/updates", {
    method: "POST",
  });
  ```

- [#736](https://github.com/VoltAgent/voltagent/pull/736) [`348bda0`](https://github.com/VoltAgent/voltagent/commit/348bda0f0fffdcbd75c8a6aa2c2d8bd15195cd22) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: respect configured log levels for console output while sending all logs to OpenTelemetry - #646

  ## The Problem

  When users configured a custom logger with a specific log level (e.g., `level: "error"`), DEBUG and INFO logs were still appearing in console output, cluttering the development environment. This happened because:
  1. `LoggerProxy` was forwarding all log calls to the underlying logger without checking the configured level
  2. Multiple components (agents, workflows, retrievers, memory adapters, observability) were logging at DEBUG level unconditionally
  3. OpenTelemetry logs were also being filtered by the same level, preventing observability platforms from receiving all logs

  ## The Solution

  **Framework Changes:**
  - Updated `LoggerProxy` to check configured log level before forwarding to console/stdout
  - Added `shouldLog(level)` method that inspects the underlying logger's level (supports both Pino and ConsoleLogger)
  - Separated console output filtering from OpenTelemetry emission:
    - **Console/stdout**: Respects configured level (error level → only shows error/fatal)
    - **OpenTelemetry**: Always receives all logs (debug, info, warn, error, fatal)

  **What Gets Fixed:**

  ```typescript
  const logger = createPinoLogger({ level: "error" });

  logger.debug("Agent created");
  // Console: ❌ Hidden (keeps dev environment clean)
  // OpenTelemetry: ✅ Sent (full observability)

  logger.error("Generation failed");
  // Console: ✅ Shown (important errors visible)
  // OpenTelemetry: ✅ Sent (full observability)
  ```

  ## Impact
  - **Cleaner Development**: Console output now respects configured log levels
  - **Full Observability**: OpenTelemetry platforms receive all logs regardless of console level
  - **Better Debugging**: Debug/trace logs available in observability tools even in production
  - **No Breaking Changes**: Existing code works as-is with improved behavior

  ## Usage

  No code changes needed - the fix applies automatically:

  ```typescript
  // Create logger with error level
  const logger = createPinoLogger({
    level: "error",
    name: "my-app",
  });

  // Use it with VoltAgent
  new VoltAgent({
    agents: { myAgent },
    logger, // Console will be clean, OpenTelemetry gets everything
  });
  ```

  ## Migration Notes

  If you were working around this issue by:
  - Filtering console output manually
  - Using different loggers for different components
  - Avoiding debug logs altogether

  You can now remove those workarounds and use a single logger with your preferred console level while maintaining full observability.

- Updated dependencies [[`2084fd4`](https://github.com/VoltAgent/voltagent/commit/2084fd491db4dbc89c432d1e72a633ec0c42d92b), [`348bda0`](https://github.com/VoltAgent/voltagent/commit/348bda0f0fffdcbd75c8a6aa2c2d8bd15195cd22)]:
  - @voltagent/server-core@1.0.20
  - @voltagent/core@1.1.36

## 1.2.1

### Patch Changes

- [#728](https://github.com/VoltAgent/voltagent/pull/728) [`3952b4b`](https://github.com/VoltAgent/voltagent/commit/3952b4b2f4315eba80a06ba2596b74e00bf57735) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: automatic detection and display of custom routes in console logs and Swagger UI

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

- Updated dependencies [[`59da0b5`](https://github.com/VoltAgent/voltagent/commit/59da0b587cd72ff6065fa7fde9fcaecf0a92d830)]:
  - @voltagent/core@1.1.34

## 1.2.0

### Minor Changes

- [#720](https://github.com/VoltAgent/voltagent/pull/720) [`91c7269`](https://github.com/VoltAgent/voltagent/commit/91c7269bb703e4e0786d6afe179b2fd986e9d95a) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: simplify CORS configuration and ensure custom routes are auth-protected

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

### Patch Changes

- Updated dependencies [[`efe4be6`](https://github.com/VoltAgent/voltagent/commit/efe4be634f52aaef00d6b188a9146b1ad00b5968)]:
  - @voltagent/core@1.1.33

## 1.1.0

### Minor Changes

- [#681](https://github.com/VoltAgent/voltagent/pull/681) [`683318f`](https://github.com/VoltAgent/voltagent/commit/683318f8671d7c5028d51169650555d2694afd05) Thanks [@ekas-7](https://github.com/ekas-7)! - feat: add support for custom endpoints

### Patch Changes

- Updated dependencies [[`3a1d214`](https://github.com/VoltAgent/voltagent/commit/3a1d214790cf49c5020eac3e9155a6daab2ff1db)]:
  - @voltagent/core@1.1.32

## 1.0.26

### Patch Changes

- [`907cc30`](https://github.com/VoltAgent/voltagent/commit/907cc30b8cbe655ae6e79fd25494f246663fd8ad) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core dependency

- Updated dependencies [[`907cc30`](https://github.com/VoltAgent/voltagent/commit/907cc30b8cbe655ae6e79fd25494f246663fd8ad)]:
  - @voltagent/server-core@1.0.19

## 1.0.25

### Patch Changes

- [#714](https://github.com/VoltAgent/voltagent/pull/714) [`f20cdf1`](https://github.com/VoltAgent/voltagent/commit/f20cdf1c9cc84daa6c4002c1dfa2c2085f2ed2ca) Thanks [@{...}](https://github.com/{...})! - fix: auth middleware now preserves conversationId and all client options

  ## The Problem

  When using custom auth providers with VoltAgent, the auth middleware was completely replacing the `body.options` object instead of merging with it. This caused critical client-provided options to be lost, including:
  - `conversationId` - essential for conversation continuity and hooks
  - `temperature`, `maxSteps`, `topP` - LLM configuration parameters
  - Any other options sent by the client in the request body

  This happened because the middleware created a brand new `options` object containing only auth-related fields (`context.user` and `userId`), completely discarding the original `body.options`.

  **Example of the bug:**

  ```typescript
  // Client sends:
  {
    input: "Hello",
    options: {
      conversationId: "conv-abc-123",
      temperature: 0.7
    }
  }

  // After auth middleware (BEFORE FIX):
  {
    input: "Hello",
    options: {
      // ❌ conversationId LOST!
      // ❌ temperature LOST!
      context: { user: {...} },
      userId: "user-123"
    }
  }

  // Result: conversationId missing in onStart hook's context
  ```

  This was especially problematic when:
  - Using hooks that depend on `conversationId` (like `onStart`, `onEnd`)
  - Configuring LLM parameters from the client side
  - Tracking conversations across multiple agent calls

  ## The Solution

  Changed the auth middleware to **merge** auth data into the existing `body.options` instead of replacing it. Now all client options are preserved while auth context is properly added.

  **After the fix:**

  ```typescript
  // Client sends:
  {
    input: "Hello",
    options: {
      conversationId: "conv-abc-123",
      temperature: 0.7
    }
  }

  // After auth middleware (AFTER FIX):
  {
    input: "Hello",
    options: {
      ...body.options,  // ✅ All original options preserved
      conversationId: "conv-abc-123",  // ✅ Preserved
      temperature: 0.7,  // ✅ Preserved
      context: {
        ...body.options?.context,  // ✅ Existing context merged
    // ✅ Auth user added
      },
      userId: "user-123"  // ✅ Auth userId added
    }
  }

  // Result: conversationId properly available in hooks!
  ```

  ## Technical Changes

  **Before (packages/server-hono/src/auth/middleware.ts:82-90):**

  ```typescript
  options: {
    context: {
      ...body.context,
      user,
    },
    userId: user.id || user.sub,
  }
  // ❌ Creates NEW options object, loses body.options
  ```

  **After:**

  ```typescript
  options: {
    ...body.options,  // ✅ Preserve all existing options
    context: {
      ...body.options?.context,  // ✅ Merge existing context
      ...body.context,
      user,
    },
    userId: user.id || user.sub,
  }
  // ✅ Merges auth data into existing options
  ```

  ## Impact
  - ✅ **Fixes missing conversationId in hooks**: `onStart`, `onEnd`, and other hooks now receive the correct `conversationId` from client
  - ✅ **Preserves LLM configuration**: Client-side `temperature`, `maxSteps`, `topP`, etc. are no longer lost
  - ✅ **Context merging works correctly**: Both custom context and auth user context coexist
  - ✅ **Backward compatible**: Existing code continues to work, only fixes the broken behavior
  - ✅ **Proper fallback chain**: `userId` uses `user.id` → `user.sub` → `body.options.userId`

  ## Testing

  Added comprehensive test suite (`packages/server-hono/src/auth/middleware.spec.ts`) with 12 test cases covering:
  - conversationId preservation
  - Multiple options preservation
  - Context merging
  - userId priority logic
  - Empty options handling
  - Public routes
  - Authentication failures

  All tests passing ✅

## 1.0.24

### Patch Changes

- Updated dependencies [[`461ecec`](https://github.com/VoltAgent/voltagent/commit/461ecec60aa90b56a413713070b6e9f43efbd74b)]:
  - @voltagent/core@1.1.31
  - @voltagent/server-core@1.0.18

## 1.0.23

### Patch Changes

- [#709](https://github.com/VoltAgent/voltagent/pull/709) [`8b838ec`](https://github.com/VoltAgent/voltagent/commit/8b838ecf085f13efacb94897063de5e7087861e6) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add defaultPrivate option to AuthProvider for protecting all routes by default

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

- [`5a0728d`](https://github.com/VoltAgent/voltagent/commit/5a0728d888b48169cdadabb62641cdcf437f4ee4) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: correct CORS middleware detection to use actual function name 'cors2'

  Fixed a critical bug where custom CORS middleware was not being properly detected, causing both custom and default CORS to be applied simultaneously. This resulted in the default CORS (`origin: "*"`) overwriting custom CORS headers on actual POST/GET requests, while OPTIONS (preflight) requests worked correctly.

  ## The Problem

  The middleware detection logic was checking for `middleware.name === "cors"`, but Hono's cors middleware function is actually named `"cors2"`. This caused:
  - Detection to always fail → `userConfiguredCors` stayed `false`
  - Default CORS (`app.use("*", cors())`) was applied even when users configured custom CORS
  - **Both** middlewares executed: custom CORS on specific paths + default CORS on `"*"`
  - OPTIONS requests returned correct custom CORS headers ✅
  - POST/GET requests had custom headers **overwritten** by default CORS (`*`) ❌

  ## The Solution

  Updated the detection logic to check for the actual function name:

  ```typescript
  // Before: middleware.name === "cors"
  // After:  middleware.name === "cors2"
  ```

  Now when users configure custom CORS in `configureApp`, it's properly detected and default CORS is skipped entirely.

  ## Impact
  - Custom CORS configurations now work correctly for **all** request types (OPTIONS, POST, GET, etc.)
  - No more default CORS overwriting custom CORS headers
  - Fixes browser CORS errors when using custom origins with credentials
  - Maintains backward compatibility - default CORS still applies when no custom CORS is configured

  ## Example

  This now works as expected:

  ```typescript
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";
  import { cors } from "hono/cors";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      configureApp: (app) => {
        app.use(
          "/agents/*",
          cors({
            origin: "http://localhost:3001",
            credentials: true,
          })
        );
      },
    }),
  });
  ```

  Both OPTIONS and POST requests now return:
  - `Access-Control-Allow-Origin: http://localhost:3001` ✅
  - `Access-Control-Allow-Credentials: true` ✅

- Updated dependencies [[`8b838ec`](https://github.com/VoltAgent/voltagent/commit/8b838ecf085f13efacb94897063de5e7087861e6)]:
  - @voltagent/server-core@1.0.17

## 1.0.22

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/server-core@1.0.16
  - @voltagent/a2a-server@1.0.2
  - @voltagent/mcp-server@1.0.3
  - @voltagent/internal@0.0.12
  - @voltagent/core@1.1.30

## 1.0.21

### Patch Changes

- [#703](https://github.com/VoltAgent/voltagent/pull/703) [`fbbb349`](https://github.com/VoltAgent/voltagent/commit/fbbb34932aeeaf6cede30228ded03df43df415ad) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve CORS middleware execution order issue preventing custom CORS configuration

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

## 1.0.20

### Patch Changes

- [#696](https://github.com/VoltAgent/voltagent/pull/696) [`69bc5bf`](https://github.com/VoltAgent/voltagent/commit/69bc5bf1c0ccedd65964f9b878cc57318b82a8a4) Thanks [@fav-devs](https://github.com/fav-devs)! - Add hostname configuration option to honoServer() to support IPv6 and dual-stack networking.

  The honoServer() function now accepts a `hostname` option that allows configuring which network interface the server binds to. This fixes deployment issues on platforms like Railway that require IPv6 binding for private networking.

  **Example usage:**

  ```typescript
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents,
    server: honoServer({
      port: 8080,
      hostname: "::", // Binds to IPv6/dual-stack
    }),
  });
  ```

  **Options:**
  - `"0.0.0.0"` - Binds to all IPv4 interfaces (default, maintains backward compatibility)
  - `"::"` - Binds to all IPv6 interfaces (dual-stack on most systems)
  - `"localhost"` or `"127.0.0.1"` - Only localhost access

  Fixes #694

## 1.0.19

### Patch Changes

- [#695](https://github.com/VoltAgent/voltagent/pull/695) [`66a1bff`](https://github.com/VoltAgent/voltagent/commit/66a1bfff1c7258c79935af4e4361b2fc043d2d1f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add hostname configuration support to honoServer - #694

  ## The Problem

  The `honoServer()` function hardcoded `hostname: "0.0.0.0"` which prevented binding to IPv6 addresses. This caused deployment issues on platforms like Railway that require IPv6 or dual-stack binding for private networking.

  ## The Solution

  Added a `hostname` configuration option to `HonoServerConfig` that allows users to specify which network interface to bind to. The default remains `"0.0.0.0"` for backward compatibility.

  ## Usage Examples

  **Default behavior (IPv4 only):**

  ```typescript
  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,
    }),
  });
  // Binds to 0.0.0.0 (all IPv4 interfaces)
  ```

  **IPv6 dual-stack (recommended for Railway, Fly.io):**

  ```typescript
  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,
      hostname: "::", // Binds to both IPv4 and IPv6
    }),
  });
  ```

  **Localhost only:**

  ```typescript
  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,
      hostname: "127.0.0.1", // Local development only
    }),
  });
  ```

  **Environment-based configuration:**

  ```typescript
  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: parseInt(process.env.PORT || "3141"),
      hostname: process.env.HOSTNAME || "::", // Default to dual-stack
    }),
  });
  ```

  This change is fully backward compatible and enables VoltAgent to work seamlessly on modern cloud platforms with IPv6 networking.

## 1.0.18

### Patch Changes

- [#676](https://github.com/VoltAgent/voltagent/pull/676) [`8781956`](https://github.com/VoltAgent/voltagent/commit/8781956ad86ec731684f0ca92ef28c65f26e1229) Thanks [@venatir](https://github.com/venatir)! - fix(auth-context): retain context in response body and options for user authentication

- Updated dependencies [[`78b9727`](https://github.com/VoltAgent/voltagent/commit/78b9727e85a31fd8eaa9c333de373d982f58b04f), [`6d00793`](https://github.com/VoltAgent/voltagent/commit/6d007938d31c6d928185153834661c50227af326), [`7fef3a7`](https://github.com/VoltAgent/voltagent/commit/7fef3a7ea1b3f7f8c780a528d3c3abce312f3be9), [`c4d13f2`](https://github.com/VoltAgent/voltagent/commit/c4d13f2be129013eed6392990863ae85cdbd8855)]:
  - @voltagent/core@1.1.26
  - @voltagent/mcp-server@1.0.2

## 1.0.17

### Patch Changes

- [#664](https://github.com/VoltAgent/voltagent/pull/664) [`f46aae9`](https://github.com/VoltAgent/voltagent/commit/f46aae9784b6a7e86a33b55d59d90a8f4f1489f4) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: vendored Hono OpenAPI adapters to eliminate pnpm alias requirement and auto-select Zod v3/v4 support; docs now clarify that installing `zod` is sufficient. #651

## 1.0.16

### Patch Changes

- [#637](https://github.com/VoltAgent/voltagent/pull/637) [`b7ee693`](https://github.com/VoltAgent/voltagent/commit/b7ee6936280b5d09b893db6500ad58b4ac80eaf2) Thanks [@marinoska](https://github.com/marinoska)! - - Introduced tests and documentation for the `ToolDeniedError`.
  - Added a feature to terminate the process flow when the `onToolStart` hook triggers a `ToolDeniedError`.
  - Enhanced error handling mechanisms to ensure proper flow termination in specific error scenarios.
- Updated dependencies [[`4c42bf7`](https://github.com/VoltAgent/voltagent/commit/4c42bf72834d3cd45ff5246ef65d7b08470d6a8e), [`b7ee693`](https://github.com/VoltAgent/voltagent/commit/b7ee6936280b5d09b893db6500ad58b4ac80eaf2)]:
  - @voltagent/core@1.1.24
  - @voltagent/server-core@1.0.15

## 1.0.15

### Patch Changes

- [`ca6160a`](https://github.com/VoltAgent/voltagent/commit/ca6160a2f5098f296729dcd842a013558d14eeb8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: updates endpoint

- Updated dependencies [[`ca6160a`](https://github.com/VoltAgent/voltagent/commit/ca6160a2f5098f296729dcd842a013558d14eeb8)]:
  - @voltagent/server-core@1.0.14

## 1.0.14

### Patch Changes

- [#629](https://github.com/VoltAgent/voltagent/pull/629) [`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add memory observability

- Updated dependencies [[`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48)]:
  - @voltagent/server-core@1.0.13
  - @voltagent/core@1.1.22

## 1.0.13

### Patch Changes

- [`d000689`](https://github.com/VoltAgent/voltagent/commit/d00068907428c407757e35f426746924e1617b61) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod@4 and zod@3 compability

## 1.0.12

### Patch Changes

- [`c738241`](https://github.com/VoltAgent/voltagent/commit/c738241fea017eeb3c6e3ceb27436ab2f027c48d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod@4 swagger doc issue

- Updated dependencies [[`c738241`](https://github.com/VoltAgent/voltagent/commit/c738241fea017eeb3c6e3ceb27436ab2f027c48d)]:
  - @voltagent/server-core@1.0.11

## 1.0.11

### Patch Changes

- [#609](https://github.com/VoltAgent/voltagent/pull/609) [`942663f`](https://github.com/VoltAgent/voltagent/commit/942663f74dca0df70cdac323102acb18c050fa65) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add workflow cancellation support, including cancellation metadata, default controller updates, and a new API endpoint for cancelling executions - #608

  ## Usage Example

  ```ts
  import { createSuspendController } from "@voltagent/core";

  const controller = createSuspendController();
  const stream = workflow.stream(input, { suspendController: controller });

  // Cancel from application code
  controller.cancel("User stopped the workflow");

  // Or via HTTP
  await fetch(`/api/workflows/${workflowId}/executions/${executionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "User stopped the workflow" }),
  });
  ```

- Updated dependencies [[`942663f`](https://github.com/VoltAgent/voltagent/commit/942663f74dca0df70cdac323102acb18c050fa65)]:
  - @voltagent/core@1.1.16
  - @voltagent/server-core@1.0.10

## 1.0.10

### Patch Changes

- [`8997e35`](https://github.com/VoltAgent/voltagent/commit/8997e3572113ebdab21ce4ccd7a15c4333f7e915) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod@4 compability

## 1.0.9

### Patch Changes

- [`325bc30`](https://github.com/VoltAgent/voltagent/commit/325bc303bd8e99b8f3e8ecd6ea011dcff3500809) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent Swagger/OpenAPI from registering MCP and A2A endpoints when no servers are configured and ensure path parameters declare required metadata, avoiding `/doc` errors in projects that omit those optional packages.

## 1.0.8

### Patch Changes

- [`e4d51da`](https://github.com/VoltAgent/voltagent/commit/e4d51da4161b69cbe0ac737aeca6842a48a4568c) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent Swagger/OpenAPI from registering MCP and A2A endpoints when no servers are configured, avoiding `/doc` errors in projects that omit those optional packages.

## 1.0.7

### Patch Changes

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - - add `@voltagent/a2a-server`, a JSON-RPC Agent-to-Agent (A2A) server that lets external agents call your VoltAgent instance over HTTP/SSE
  - teach `@voltagent/core`, `@voltagent/server-core`, and `@voltagent/server-hono` to auto-register configured A2A servers so adding `{ a2aServers: { ... } }` on `VoltAgent` and opting into `honoServer` instantly exposes discovery and RPC endpoints
  - forward request context (`userId`, `sessionId`, metadata) into agent invocations and provide task management hooks, plus allow filtering/augmenting exposed agents by default
  - document the setup in `website/docs/agents/a2a/a2a-server.md` and refresh `examples/with-a2a-server` with basic usage and task-store customization
  - A2A endpoints are now described in Swagger/OpenAPI and listed in the startup banner whenever an A2A server is registered, making discovery of `/.well-known/...` and `/a2a/:serverId` routes trivial.

  **Getting started**

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { A2AServer } from "@voltagent/a2a-server";
  import { honoServer } from "@voltagent/server-hono";

  const assistant = new Agent({
    name: "SupportAgent",
    purpose: "Handle support questions from partner agents.",
    model: myModel,
  });

  const a2aServer = new A2AServer({
    name: "support-agent",
    version: "0.1.0",
  });

  export const voltAgent = new VoltAgent({
    agents: { assistant },
    a2aServers: { a2aServer },
    server: honoServer({ port: 3141 }),
  });
  ```

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - ## ✨ New: first-class Model Context Protocol support

  We shipped a complete MCP integration stack:
  - `@voltagent/mcp-server` exposes VoltAgent registries (agents, workflows, tools) over stdio/HTTP/SSE transports.
  - `@voltagent/server-core` and `@voltagent/server-hono` gained ready-made route handlers so HTTP servers can proxy MCP traffic with a few lines of glue code.
  - `@voltagent/core` exports the shared types that the MCP layers rely on.

  ### Quick start

  ```ts title="src/mcp/server.ts"
  import { MCPServer } from "@voltagent/mcp-server";
  import { Agent, createTool } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";
  import { z } from "zod";

  const status = createTool({
    name: "status",
    description: "Return the current time",
    parameters: z.object({}),
    async execute() {
      return { status: "ok", time: new Date().toISOString() };
    },
  });

  const assistant = new Agent({
    name: "Support Agent",
    instructions: "Route customer tickets to the correct queue.",
    model: openai("gpt-4o-mini"),
    tools: [status],
  });

  export const mcpServer = new MCPServer({
    name: "voltagent-example",
    version: "0.1.0",
    description: "Expose VoltAgent over MCP",
    agents: { support: assistant },
    tools: { status },
    filterTools: ({ items }) => items.filter((tool) => tool.name !== "debug"),
  });
  ```

  With the server registered on your VoltAgent instance (and the Hono MCP routes enabled), the same agents, workflows, and tools become discoverable from VoltOps Console or any MCP-compatible IDE.

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - - Ship `@voltagent/mcp-server`, a transport-agnostic MCP provider that surfaces VoltAgent agents, workflows, tools, prompts, and resources over stdio, SSE, and HTTP.
  - Wire MCP registration through `@voltagent/core`, `@voltagent/server-core`, and `@voltagent/server-hono` so a single `VoltAgent` constructor opt-in (optionally with `honoServer`) exposes stdio mode immediately and HTTP/SSE endpoints when desired.
  - Filter child sub-agents automatically and lift an agent's `purpose` (fallback to `instructions`) into the MCP tool description for cleaner IDE listings out of the box.
  - Document the workflow in `website/docs/agents/mcp/mcp-server.md` and refresh `examples/with-mcp-server` with stdio-only and HTTP/SSE configurations.
  - When MCP is enabled we now publish REST endpoints in Swagger/OpenAPI and echo them in the startup banner so you can discover `/mcp/*` routes without digging through code.

  **Getting started**

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { MCPServer } from "@voltagent/mcp-server";
  import { honoServer } from "@voltagent/server-hono";

  const assistant = new Agent({
    name: "AssistantAgent",
    purpose: "Respond to support questions and invoke helper tools when needed.",
    model: myModel,
  });

  const mcpServer = new MCPServer({
    name: "support-mcp",
    version: "1.0.0",
    agents: { assistant },
    protocols: { stdio: true, http: false, sse: false },
  });

  export const voltAgent = new VoltAgent({
    agents: { assistant },
    mcpServers: { primary: mcpServer },
    server: honoServer({ port: 3141 }), // flip http/sse to true when you need remote clients
  });
  ```

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/server-core@1.0.9
  - @voltagent/a2a-server@1.0.1
  - @voltagent/internal@0.0.11
  - @voltagent/core@1.1.13
  - @voltagent/mcp-server@1.0.1

## 1.0.6

### Patch Changes

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

- Updated dependencies [[`05ddac1`](https://github.com/VoltAgent/voltagent/commit/05ddac1ac9404cd6062d2e448b0ce4df90ecd748), [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6)]:
  - @voltagent/server-core@1.0.8

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
