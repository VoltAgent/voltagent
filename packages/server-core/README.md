<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent Engineering Platform
</h3>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@voltagent/server-core.svg)](https://www.npmjs.com/package/@voltagent/server-core)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/server-core.svg)](https://www.npmjs.com/package/@voltagent/server-core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/server-core

Framework-agnostic server core for VoltAgent. This package provides the shared infrastructure — route definitions, request handlers, WebSocket support, authentication utilities, MCP/A2A protocol helpers, and a base server provider — that all VoltAgent server adapters (e.g. `@voltagent/server-hono`) build on top of.

You typically do not use this package directly. Instead, choose a server adapter for your framework (such as `@voltagent/server-hono`) and pass it to the `VoltAgent` constructor. If you are building a **custom server adapter**, this package gives you everything you need.

---

## Key Exports

### Base Server Provider

`BaseServerProvider` — Abstract class that handles the common server lifecycle (port allocation, WebSocket setup, graceful shutdown, startup banner). Extend it when building a custom adapter.

```ts
import { BaseServerProvider } from "@voltagent/server-core";
```

### Route Definitions

Pre-built, framework-agnostic route metadata objects you can use to register routes in any HTTP framework:

| Export                        | Routes covered                               |
| ----------------------------- | -------------------------------------------- |
| `AGENT_ROUTES`                | Agent management and generation              |
| `WORKFLOW_ROUTES`             | Workflow execute / stream / suspend / resume |
| `TOOL_ROUTES`                 | Tool listing and direct execution            |
| `MEMORY_ROUTES`               | Conversation and message management          |
| `LOG_ROUTES`                  | Log retrieval                                |
| `OBSERVABILITY_ROUTES`        | Traces, spans, and observability status      |
| `OBSERVABILITY_MEMORY_ROUTES` | Memory inspection for observability          |
| `MCP_ROUTES`                  | Model Context Protocol server endpoints      |
| `A2A_ROUTES`                  | Agent-to-Agent protocol endpoints            |
| `ALL_ROUTES`                  | All of the above combined                    |

Helper functions: `getAllRoutesArray()`, `getRoutesByTag(tag)`.

### Request Handlers

Framework-agnostic handler functions. Each handler receives a `ServerProviderDeps` context and returns a serialisable response object, making them easy to wrap in any HTTP framework:

- **Agent handlers** — `handleGenerateText`, `handleStreamText`, `handleChatStream`, `handleResumeChatStream`, `handleGenerateObject`, `handleStreamObject`
- **Workflow handlers** — `handleGetWorkflows`, `handleGetWorkflow`, `handleExecuteWorkflow`, `handleStreamWorkflow`, `handleAttachWorkflowStream`, `handleSuspendWorkflow`, `handleResumeWorkflow`, `handleListWorkflowRuns`, `handleGetWorkflowState`
- **Tool handlers** — `handleListTools`, `handleExecuteTool`
- **Memory handlers** — `handleListMemoryConversations`, `handleCreateMemoryConversation`, `handleSaveMemoryMessages`, and more
- **Observability handlers** — `handleGetTraces`, `handleGetTraceById`, `handleGetObservabilityStatus`, and more
- **Log handlers** — `handleGetLogs`

### Authentication

Plug-in auth via the `AuthProvider` interface. A built-in JWT provider is included:

```ts
import { jwtAuth, createJWT } from "@voltagent/server-core";
```

### WebSocket Utilities

`createWebSocketServer`, `setupWebSocketUpgrade` — set up real-time log and observability streaming over WebSocket.

### MCP & A2A Protocol Helpers

- `McpRegistry`, `buildMcpRoutePaths` — register and resolve MCP servers
- `A2ARegistry`, `resolveAgentCard`, `executeA2ARequest` — Agent-to-Agent protocol support

### App Setup Utilities

`getOpenApiDoc`, `shouldEnableSwaggerUI`, `getOrCreateLogger`, `DEFAULT_CORS_OPTIONS` — helpers shared by all server adapters.

### Edge Entry Point

A lighter entry point for edge runtimes (e.g. Cloudflare Workers, Vercel Edge) is available at the `./edge` export:

```ts
import { AGENT_ROUTES, handleGenerateText } from "@voltagent/server-core/edge";
```

---

## Usage Example — Custom Server Adapter

The snippet below shows the minimum required to build a custom server adapter on top of `@voltagent/server-core`:

```typescript
import { createServer, type Server } from "node:http";
import { BaseServerProvider, type ServerProviderConfig } from "@voltagent/server-core";
import type { ServerProviderDeps } from "@voltagent/core";

export class MyCustomServerProvider extends BaseServerProvider {
  constructor(deps: ServerProviderDeps, config: ServerProviderConfig = {}) {
    super(deps, config);
  }

  protected async startServer(port: number): Promise<Server> {
    const server = createServer((req, res) => {
      // Route incoming requests to the framework-agnostic handlers
      res.writeHead(404);
      res.end("Not found");
    });

    await new Promise<void>((resolve) => server.listen(port, resolve));
    return server;
  }

  protected async stopServer(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server?.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

// Factory function consumed by VoltAgent
export function myCustomServer(config?: ServerProviderConfig) {
  return (deps: ServerProviderDeps) => new MyCustomServerProvider(deps, config);
}
```

Pass the factory to `VoltAgent`:

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { myCustomServer } from "./my-custom-server";

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: myCustomServer({ port: 3141 }),
});
```

For a complete, production-ready server adapter see [`@voltagent/server-hono`](https://github.com/VoltAgent/voltagent/tree/main/packages/server-hono).

---

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Agent Overview](https://voltagent.dev/docs/agents/overview/)
- [MCP Integration](https://voltagent.dev/docs/agents/mcp/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
