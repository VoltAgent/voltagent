<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="VoltAgent banner" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br />
<br />

<div align="center">
  <a href="https://voltagent.dev">Home Page</a> |
  <a href="https://voltagent.dev/docs/">Documentation</a> |
  <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
  <a href="https://s.voltagent.dev/discord">Discord</a> |
  <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br />

<div align="center">
  <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br />
  Escape the limitations of no-code builders and the complexity of starting from scratch.
  <br />
  <br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](../../CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br />

# VoltAgent MCP Server Example

This example shows how to expose VoltAgent agents, workflows, and tools over the **Model Context Protocol (MCP)** using the `@voltagent/mcp-server` package. It also demonstrates how to host the MCP transports behind the Hono HTTP server so MCP-compatible IDEs (Cursor, Windsurf, VS Code extensions, …) can discover and invoke your VoltAgent components.

## Try the example

```bash
npm create voltagent-app@latest -- --example with-mcp-server
```

## What you get

- A minimal VoltAgent project with an `Assistant` agent and a `status` tool.
- An `MCPServer` instance that mirrors your VoltAgent registries to MCP clients.
- Hono routes wired via `@voltagent/server-hono` that proxy MCP HTTP/SSE traffic.
- Stdio transport support so you can connect the server directly to an IDE.

## Project structure

```
examples/with-mcp-server
├── src/
│   ├── agents/assistant.ts      # Example agent that calls the status tool
│   ├── mcp/server.ts            # MCPServer configuration (agents/workflows/tools + filters)
│   └── index.ts                 # VoltAgent bootstrap + Hono server
└── README.md                    # You are here
```

## Prerequisites

- Node.js 20+
- `pnpm`
- `OPENAI_API_KEY` in your environment (for the sample agent)

## Run locally

Install dependencies and start VoltAgent with the Hono HTTP server (port `3141` by default):

```bash
pnpm install
pnpm --filter voltagent-example-with-mcp-server dev
```

The REST + MCP routes are now available under `/mcp/*`. Visit `http://localhost:3141/mcp/servers` to list registered MCP servers and inspect their metadata.

## Start an MCP stdio session

To expose the same `MCPServer` over stdio (for IDEs that spawn subprocesses), run:

```bash
pnpm --filter voltagent-example-with-mcp-server start -- --stdio
```

The process stays attached to stdin/stdout so an MCP client can negotiate transports and invoke tools. Use this mode when integrating with editors that expect a local MCP binary.

## Key MCP configuration (excerpt)

```ts title="src/mcp/server.ts"
import { MCPServer } from "@voltagent/mcp-server";
import { Agent, createTool } from "@voltagent/core";
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
  model: "openai/gpt-4o-mini",
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

The `agents`, `workflows`, and `tools` objects let you surface MCP-only entries or mirror existing VoltAgent registries. Optional `filter*` functions run per transport, allowing you to hide or reorder items without touching the global registry.

## Next steps

- Connect the running server to [VoltOps MCP Console](https://console.voltagent.dev/mcp) and inspect the exposed tools.
- Add more agents or workflows, then return them from the `agents` / `workflows` maps to make them available to MCP clients.
- Customize transports by registering your own controllers via `transportRegistry` if you need an alternative to stdio/HTTP/SSE.

Happy hacking! 🚀
