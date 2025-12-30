# @voltagent/server-core

## 2.0.2

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505)]:
  - @voltagent/core@2.0.2
  - @voltagent/internal@1.0.2

## 2.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2)]:
  - @voltagent/core@2.0.1
  - @voltagent/internal@1.0.1

## 2.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/core@2.0.0
  - @voltagent/internal@1.0.0

## 1.0.36

### Patch Changes

- [#883](https://github.com/VoltAgent/voltagent/pull/883) [`9320326`](https://github.com/VoltAgent/voltagent/commit/93203262bf3ebcbc38fe4663c4b0cea27dd9ea16) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add authNext and deprecate legacy auth

  Add a new `authNext` policy that splits routes into public, console, and user access. All routes are protected by default; use `publicRoutes` to opt out.

  AuthNext example:

  ```ts
  import { jwtAuth } from "@voltagent/server-core";
  import { honoServer } from "@voltagent/server-hono";

  const server = honoServer({
    authNext: {
      provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
      publicRoutes: ["GET /health"],
    },
  });
  ```

  Behavior summary:
  - When `authNext` is set, all routes are private by default.
  - Console endpoints (agents, workflows, tools, docs, observability, updates) require a Console Access Key.
  - Execution endpoints require a user token (JWT).

  Console access uses `VOLTAGENT_CONSOLE_ACCESS_KEY`:

  ```bash
  VOLTAGENT_CONSOLE_ACCESS_KEY=your-console-key
  ```

  ```bash
  curl http://localhost:3141/agents \
    -H "x-console-access-key: your-console-key"
  ```

  Legacy `auth` remains supported but is deprecated. Use `authNext` for new integrations.

## 1.0.35

### Patch Changes

- [`b663dce`](https://github.com/VoltAgent/voltagent/commit/b663dceb57542d1b85475777f32ceb3671cc1237) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: dedupe MCP endpoints in server startup output and include MCP transport paths (streamable HTTP/SSE) so the actual server endpoint is visible.

- Updated dependencies [[`b663dce`](https://github.com/VoltAgent/voltagent/commit/b663dceb57542d1b85475777f32ceb3671cc1237)]:
  - @voltagent/core@1.5.1

## 1.0.34

### Patch Changes

- [#865](https://github.com/VoltAgent/voltagent/pull/865) [`77833b8`](https://github.com/VoltAgent/voltagent/commit/77833b848fbb1ae99e79c955e25442f9ebdd162f) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: make GET /tools endpoint public when auth is enabled

  Previously, `GET /tools` was listed in `PROTECTED_ROUTES`, requiring authentication even though it only returns tool metadata (name, description, parameters). This was inconsistent with `GET /agents` and `GET /workflows` which are publicly accessible for discovery.

  ## Changes
  - Moved `GET /tools` from `PROTECTED_ROUTES` to `DEFAULT_PUBLIC_ROUTES`
  - Tool execution (`POST /tools/:name/execute`) remains protected and requires authentication

  This allows VoltOps Console and other clients to discover available tools without authentication, while still requiring auth to actually execute them.

## 1.0.33

### Patch Changes

- [#847](https://github.com/VoltAgent/voltagent/pull/847) [`d861c17`](https://github.com/VoltAgent/voltagent/commit/d861c17e72f2fb6368778970a56411fadabaf9a5) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add first-class REST tool endpoints and UI support - #638
  - Server: list and execute registered tools over HTTP (`GET /tools`, `POST /tools/:name/execute`) with zod-validated inputs and OpenAPI docs.
  - Auth: Both GET and POST tool endpoints are behind the same auth middleware as agent/workflow execution (protected by default).
  - Multi-agent tools: tools now report all owning agents via `agents[]` (no more single `agentId`), including tags when provided.
  - Safer handlers: input validation via safeParse guard, tag extraction without `any`, and better error shaping.
  - Serverless: update install route handles empty bodies and `/updates/:packageName` variant.
  - Console: Unified list surfaces tools, tool tester drawer with Monaco editors and default context, Observability page adds a Tools tab with direct execution.
  - Docs: New tools endpoint page and API reference entries for listing/executing tools.

## 1.0.32

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
  - @voltagent/core@1.2.17

## 1.0.31

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

## 1.0.30

### Patch Changes

- [#840](https://github.com/VoltAgent/voltagent/pull/840) [`9e88658`](https://github.com/VoltAgent/voltagent/commit/9e88658c2c26aff972bdd2da6e7ac2e34958c47d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: webSocket authentication now uses same logic as HTTP routes

  ## The Problem

  WebSocket endpoints were using a different authentication logic than HTTP endpoints:
  - HTTP routes used `requiresAuth()` function which respects `publicRoutes`, `DEFAULT_PUBLIC_ROUTES`, `PROTECTED_ROUTES`, and `defaultPrivate` configuration
  - WebSocket routes only checked for console access key or JWT token, ignoring the `publicRoutes` configuration entirely

  This meant that setting `publicRoutes: ["/ws/**"]` in your auth configuration had no effect on WebSocket connections.

  ## The Solution

  Updated `setupWebSocketUpgrade` in `packages/server-core/src/websocket/setup.ts` to:
  1. Check console access first (console always has access via `VOLTAGENT_CONSOLE_ACCESS_KEY`)
  2. Use the same `requiresAuth()` function that HTTP routes use
  3. Respect `publicRoutes`, `PROTECTED_ROUTES`, and `defaultPrivate` configuration

  ## Impact
  - **Consistent auth behavior:** WebSocket and HTTP routes now follow the same authentication rules
  - **publicRoutes works for WebSocket:** You can now make WebSocket paths public using the `publicRoutes` configuration
  - **Console access preserved:** Console with `VOLTAGENT_CONSOLE_ACCESS_KEY` continues to work on all WebSocket paths

  ## Example

  ```typescript
  const server = new VoltAgent({
    auth: {
      defaultPrivate: true,
      publicRoutes: ["/ws/public/**"], // Now works for WebSocket too!
    },
  });
  ```

- Updated dependencies [[`93e5a8e`](https://github.com/VoltAgent/voltagent/commit/93e5a8ed03d2335d845436752b476881c24931ba)]:
  - @voltagent/core@1.2.16

## 1.0.29

### Patch Changes

- [#824](https://github.com/VoltAgent/voltagent/pull/824) [`92f8d46`](https://github.com/VoltAgent/voltagent/commit/92f8d466db683f5c8bc000d034c441fc3b9e3ad5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: ensure `jwtAuth` respects `defaultPrivate` option

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

- Updated dependencies [[`fd1428b`](https://github.com/VoltAgent/voltagent/commit/fd1428b73abfcac29c238e0cee5229ff227cb72b)]:
  - @voltagent/core@1.2.13

## 1.0.28

### Patch Changes

- [`28661fc`](https://github.com/VoltAgent/voltagent/commit/28661fc24f945b0e52c12703a5a09a033317d8fa) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enable persistence for live evaluations

- Updated dependencies [[`28661fc`](https://github.com/VoltAgent/voltagent/commit/28661fc24f945b0e52c12703a5a09a033317d8fa)]:
  - @voltagent/core@1.2.12

## 1.0.27

### Patch Changes

- [`2cb5464`](https://github.com/VoltAgent/voltagent/commit/2cb5464f15a6e2b2e7b5649c1db3ed7298b633eb) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: trigger duplicate span issue

- Updated dependencies [[`148f550`](https://github.com/VoltAgent/voltagent/commit/148f550ceafa412534fd2d1c4cfb44c8255636ab)]:
  - @voltagent/core@1.2.10

## 1.0.26

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
  - @voltagent/core@1.2.9

## 1.0.25

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
  - @voltagent/core@1.2.6

## 1.0.24

### Patch Changes

- [`b4e98f5`](https://github.com/VoltAgent/voltagent/commit/b4e98f5220f3beab08d8a1abad5e05a1f8166c3e) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent NoOutputSpecifiedError when experimental_output is not provided

  ## The Problem

  When `experimental_output` parameter was added to HTTP text endpoints but not provided in requests, accessing `result.experimental_output` would throw `AI_NoOutputSpecifiedError`. This happened because AI SDK's `experimental_output` getter throws an error when the output schema is not defined.

  ## The Solution

  Wrapped `experimental_output` access in a try-catch block in `handleGenerateText()` to safely handle cases where the parameter is not provided:

  ```typescript
  // Safe access pattern
  ...(() => {
    try {
      return result.experimental_output ? { experimental_output: result.experimental_output } : {};
    } catch {
      return {};
    }
  })()
  ```

  ## Impact
  - **No Breaking Changes:** Endpoints work correctly both with and without `experimental_output`
  - **Better Error Handling:** Gracefully handles missing output schemas instead of throwing errors
  - **Backward Compatible:** Existing API calls continue to work without modification

## 1.0.23

### Patch Changes

- [#791](https://github.com/VoltAgent/voltagent/pull/791) [`57bff8b`](https://github.com/VoltAgent/voltagent/commit/57bff8bef675d9d1b9f60a7aea8d11cbf4fb7a15) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add experimental_output support to HTTP text endpoints - #790

  ## What Changed

  The HTTP API now supports AI SDK's `experimental_output` feature for structured generation! You can now use `/agents/{id}/text`, `/agents/{id}/stream`, and `/agents/{id}/chat` endpoints to generate type-safe structured data while maintaining full tool calling capabilities.

  ## The Problem

  Previously, to get structured output from VoltAgent's HTTP API, you had two options:
  1. Use `/agents/{id}/object` endpoint - BUT this doesn't support tool calling
  2. Use direct method calls with `experimental_output` - BUT this requires running code in the same process

  Users couldn't get structured output with tool calling through the HTTP API.

  ## The Solution

  **HTTP API (server-core):**
  - Added `experimental_output` field to `GenerateOptionsSchema` (accepts `{ type: "object"|"text", schema?: {...} }`)
  - Updated `processAgentOptions` to convert JSON schema → Zod schema → `Output.object()` or `Output.text()`
  - Modified `handleGenerateText` to return `experimental_output` in response
  - Moved `BasicJsonSchema` definition to be reused across object and experimental_output endpoints
  - All existing endpoints (`/text`, `/stream`, `/chat`) now support this feature

  **What Gets Sent:**

  ```json
  {
    "input": "Create a recipe",
    "options": {
      "experimental_output": {
        "type": "object",
        "schema": {
          "type": "object",
          "properties": { ... },
          "required": [...]
        }
      }
    }
  }
  ```

  **What You Get Back:**

  ```json
  {
    "success": true,
    "data": {
      "text": "Here's a recipe...",
      "experimental_output": {
        "name": "Pasta Carbonara",
        "ingredients": ["eggs", "bacon", "pasta"],
        "steps": ["Boil pasta", "Cook bacon", ...],
        "prepTime": 20
      },
      "usage": { ... }
    }
  }
  ```

  ## Usage Examples

  ### Object Type - Structured JSON Output

  **Request:**

  ```bash
  curl -X POST http://localhost:3141/agents/my-agent/text \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Create a recipe for pasta carbonara",
      "options": {
        "experimental_output": {
          "type": "object",
          "schema": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "ingredients": {
                "type": "array",
                "items": { "type": "string" }
              },
              "steps": {
                "type": "array",
                "items": { "type": "string" }
              },
              "prepTime": { "type": "number" }
            },
            "required": ["name", "ingredients", "steps"]
          }
        }
      }
    }'
  ```

  **Response:**

  ```json
  {
    "success": true,
    "data": {
      "text": "Here is a classic pasta carbonara recipe...",
      "experimental_output": {
        "name": "Classic Pasta Carbonara",
        "ingredients": [
          "400g spaghetti",
          "200g guanciale or pancetta",
          "4 large eggs",
          "100g Pecorino Romano cheese",
          "Black pepper"
        ],
        "steps": [
          "Bring a large pot of salted water to boil",
          "Cook pasta according to package directions",
          "While pasta cooks, dice guanciale and cook until crispy",
          "Beat eggs with grated cheese and black pepper",
          "Drain pasta, reserving 1 cup pasta water",
          "Off heat, toss pasta with guanciale and fat",
          "Add egg mixture, tossing quickly with pasta water"
        ],
        "prepTime": 20
      },
      "usage": {
        "promptTokens": 145,
        "completionTokens": 238,
        "totalTokens": 383
      },
      "finishReason": "stop",
      "toolCalls": [],
      "toolResults": []
    }
  }
  ```

  ### Text Type - Constrained Text Output

  **Request:**

  ```bash
  curl -X POST http://localhost:3141/agents/my-agent/text \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Write a short poem about coding",
      "options": {
        "experimental_output": {
          "type": "text"
        }
      }
    }'
  ```

  **Response:**

  ```json
  {
    "success": true,
    "data": {
      "text": "Lines of code dance on the screen...",
      "experimental_output": "Lines of code dance on the screen,\nLogic flows like streams pristine,\nBugs debug with patience keen,\nCreating worlds we've never seen.",
      "usage": { ... },
      "finishReason": "stop"
    }
  }
  ```

  ### With Streaming (SSE)

  The `/agents/{id}/stream` and `/agents/{id}/chat` endpoints also support `experimental_output`:

  **Request:**

  ```bash
  curl -X POST http://localhost:3141/agents/my-agent/stream \
    -H "Content-Type: application/json" \
    -d '{
      "input": "Create a recipe",
      "options": {
        "experimental_output": {
          "type": "object",
          "schema": { ... }
        }
      }
    }'
  ```

  **Response (Server-Sent Events):**

  ```
  data: {"type":"text-delta","textDelta":"Here"}
  data: {"type":"text-delta","textDelta":" is"}
  data: {"type":"text-delta","textDelta":" a recipe..."}
  data: {"type":"finish","finishReason":"stop","experimental_output":{...}}
  ```

  ## Comparison: generateObject vs experimental_output

  | Feature           | `/agents/{id}/object`  | `/agents/{id}/text` + `experimental_output` |
  | ----------------- | ---------------------- | ------------------------------------------- |
  | Structured output | ✅                     | ✅                                          |
  | Tool calling      | ❌                     | ✅                                          |
  | Streaming         | Partial objects        | Partial objects                             |
  | Use case          | Simple data extraction | Complex workflows with tools                |

  **When to use which:**
  - Use `/object` for simple schema validation without tool calling
  - Use `/text` with `experimental_output` when you need structured output **and** tool calling

  ## Important Notes
  - **Backward Compatible:** `experimental_output` is optional - existing API calls work unchanged
  - **Tool Calling:** Unlike `/object` endpoint, this supports full tool calling capabilities
  - **Type Safety:** JSON schema is automatically converted to Zod schema for validation
  - **Zod Version:** Supports both Zod v3 and v4 (automatic detection)
  - **Experimental:** This uses AI SDK's experimental features and may change in future versions

  ## Technical Details

  **Files Changed:**
  - `packages/server-core/src/schemas/agent.schemas.ts` - Added `experimental_output` schema
  - `packages/server-core/src/utils/options.ts` - Added JSON→Zod conversion logic
  - `packages/server-core/src/handlers/agent.handlers.ts` - Added response field

  **Schema Format:**

  ```typescript
  experimental_output: z.object({
    type: z.enum(["object", "text"]),
    schema: BasicJsonSchema.optional(), // for type: "object"
  }).optional();
  ```

  ## Impact
  - ✅ **HTTP API Parity:** HTTP endpoints now have feature parity with direct method calls
  - ✅ **Tool Calling + Structure:** Combine structured output with tool execution
  - ✅ **Better DX:** Type-safe outputs through HTTP API
  - ✅ **Backward Compatible:** No breaking changes

  ## Related

  This feature complements the `experimental_output` support added to `@voltagent/core` in v1.1.6, bringing the same capabilities to HTTP endpoints.

## 1.0.22

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

- Updated dependencies [[`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0)]:
  - @voltagent/core@1.2.3

## 1.0.21

### Patch Changes

- [#767](https://github.com/VoltAgent/voltagent/pull/767) [`cc1f5c0`](https://github.com/VoltAgent/voltagent/commit/cc1f5c032cd891ed4df0b718885f70853c344690) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add tunnel command

  ## New: `volt tunnel`

  Expose your local VoltAgent server over a secure public URL with a single command:

  ```bash
  pnpm volt tunnel 3141
  ```

  The CLI handles tunnel creation for `localhost:3141` and keeps the connection alive until you press `Ctrl+C`. You can omit the port argument to use the default.

## 1.0.20

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

- Updated dependencies [[`348bda0`](https://github.com/VoltAgent/voltagent/commit/348bda0f0fffdcbd75c8a6aa2c2d8bd15195cd22)]:
  - @voltagent/core@1.1.36

## 1.0.19

### Patch Changes

- [`907cc30`](https://github.com/VoltAgent/voltagent/commit/907cc30b8cbe655ae6e79fd25494f246663fd8ad) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core dependency

## 1.0.18

### Patch Changes

- Updated dependencies [[`461ecec`](https://github.com/VoltAgent/voltagent/commit/461ecec60aa90b56a413713070b6e9f43efbd74b)]:
  - @voltagent/core@1.1.31

## 1.0.17

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

## 1.0.16

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12
  - @voltagent/core@1.1.30

## 1.0.15

### Patch Changes

- [#637](https://github.com/VoltAgent/voltagent/pull/637) [`b7ee693`](https://github.com/VoltAgent/voltagent/commit/b7ee6936280b5d09b893db6500ad58b4ac80eaf2) Thanks [@marinoska](https://github.com/marinoska)! - - Introduced tests and documentation for the `ToolDeniedError`.
  - Added a feature to terminate the process flow when the `onToolStart` hook triggers a `ToolDeniedError`.
  - Enhanced error handling mechanisms to ensure proper flow termination in specific error scenarios.
- Updated dependencies [[`4c42bf7`](https://github.com/VoltAgent/voltagent/commit/4c42bf72834d3cd45ff5246ef65d7b08470d6a8e), [`b7ee693`](https://github.com/VoltAgent/voltagent/commit/b7ee6936280b5d09b893db6500ad58b4ac80eaf2)]:
  - @voltagent/core@1.1.24

## 1.0.14

### Patch Changes

- [`ca6160a`](https://github.com/VoltAgent/voltagent/commit/ca6160a2f5098f296729dcd842a013558d14eeb8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: updates endpoint

## 1.0.13

### Patch Changes

- [#629](https://github.com/VoltAgent/voltagent/pull/629) [`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add memory observability

## 1.0.12

### Patch Changes

- [#621](https://github.com/VoltAgent/voltagent/pull/621) [`f4fa7e2`](https://github.com/VoltAgent/voltagent/commit/f4fa7e297fec2f602c9a24a0c77e645aa971f2b9) Thanks [@omeraplak](https://github.com/omeraplak)! - ## @voltagent/core
  - Folded the serverless runtime entry point into the main build – importing `@voltagent/core` now auto-detects the runtime and provisions either the Node or serverless observability pipeline.
  - Rebuilt serverless observability on top of `BasicTracerProvider`, fetch-based OTLP exporters, and an execution-context `waitUntil` hook. Exports run with exponential backoff, never block the response, and automatically reuse VoltOps credentials (or fall back to the in-memory span/log store) so VoltOps Console transparently swaps to HTTP polling when WebSockets are unavailable.
  - Hardened the runtime utilities for Workers/Functions: added universal `randomUUID`, base64, and event-emitter helpers, and taught the default logger to emit OpenTelemetry logs without relying on Node globals. This removes the last Node-only dependencies from the serverless bundle.

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { serverlessHono } from "@voltagent/serverless-hono";
  import { openai } from "@ai-sdk/openai";

  import { weatherTool } from "./tools";

  const assistant = new Agent({
    name: "serverless-assistant",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  const voltAgent = new VoltAgent({
    agents: { assistant },
    serverless: serverlessHono(),
  });

  export default voltAgent.serverless().toCloudflareWorker();
  ```

  ## @voltagent/serverless-hono
  - Renamed the edge provider to **serverless** and upgraded it to power any fetch-based runtime (Cloudflare Workers, Vercel Edge Functions, Deno Deploy, Netlify Functions).
  - Wrapped the Cloudflare adapter in a first-class `HonoServerlessProvider` that installs a scoped `waitUntil` bridge, reuses the shared routing layer, and exposes a `/ws` health stub so VoltOps Console can cleanly fall back to polling.
  - Dropped the manual environment merge – Workers should now enable the `nodejs_compat_populate_process_env` flag (documented in the new deployment guide) instead of calling `mergeProcessEnv` themselves.

  ## @voltagent/server-core
  - Reworked the observability handlers around the shared storage API, including a new `POST /setup-observability` helper that writes VoltOps keys into `.env` and expanded trace/log queries that match the serverless storage contract.

  ## @voltagent/cli
  - Added `volt deploy --target <cloudflare|vercel|netlify>` to scaffold the right config files. The Cloudflare template now ships with the required compatibility flags (`nodejs_compat`, `nodejs_compat_populate_process_env`, `no_handle_cross_request_promise_resolution`) so new projects run on Workers without extra tweaking.

## 1.0.11

### Patch Changes

- [`c738241`](https://github.com/VoltAgent/voltagent/commit/c738241fea017eeb3c6e3ceb27436ab2f027c48d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod@4 swagger doc issue

## 1.0.10

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

## 1.0.9

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

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11

## 1.0.8

### Patch Changes

- [#581](https://github.com/VoltAgent/voltagent/pull/581) [`05ddac1`](https://github.com/VoltAgent/voltagent/commit/05ddac1ac9404cd6062d2e448b0ce4df90ecd748) Thanks [@wayneg123](https://github.com/wayneg123)! - fix(server-core): add missing /chat endpoint to protected routes for JWT auth

  The /agents/:id/chat endpoint was missing from PROTECTED_ROUTES, causing it to bypass JWT authentication while other execution endpoints (/text, /stream, /object, /stream-object) correctly required authentication.

  This fix ensures all agent execution endpoints consistently require JWT authentication when jwtAuth is configured.

  Fixes authentication bypass vulnerability on chat endpoint.

- [`9cc4ea4`](https://github.com/VoltAgent/voltagent/commit/9cc4ea4a4985320139e33e8029f299c7ec8329a6) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/core peerDependency version

## 1.0.7

### Patch Changes

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

## 1.0.7-next.1

### Patch Changes

- [`78a5046`](https://github.com/VoltAgent/voltagent/commit/78a5046ca4d768a96650ebee63ae1630b0dff7a7) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

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

## 1.0.7-next.0

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

  The change adopts a flexible validation, where the server handlers pass input directly to agents which handle the conversion. API schemas and documentation have been updated to reflect this support.

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
