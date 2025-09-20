# @voltagent/mcp-server

## 1.0.1

### Patch Changes

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
