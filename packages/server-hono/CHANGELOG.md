# @voltagent/server-hono

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
