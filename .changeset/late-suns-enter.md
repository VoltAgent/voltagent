---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/mcp-server": patch
"@voltagent/internal": patch
"@voltagent/core": patch
---

- Ship `@voltagent/mcp-server`, a transport-agnostic MCP provider that surfaces VoltAgent agents, workflows, tools, prompts, and resources over stdio, SSE, and HTTP.
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
