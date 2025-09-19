---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/mcp-server": patch
"@voltagent/core": patch
---

## ✨ New: first-class Model Context Protocol support

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
