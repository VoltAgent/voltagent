---
title: MCP Server
description: Quick start guide for exposing VoltAgent over the Model Context Protocol.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# VoltAgent MCP Server

Follow these steps to expose your VoltAgent project over MCP so you can browse tools, prompts, and resources from VoltOps Console (`https://console.voltagent.dev/mcp`) or an MCP-compatible IDE.

## 1. Install the MCP server package

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @voltagent/mcp-server
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @voltagent/mcp-server
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @voltagent/mcp-server
    ```
  </TabItem>
</Tabs>

## 2. Create an MCP server instance

```ts title="src/mcp/server.ts"
import { MCPServer } from "@voltagent/mcp-server";

export const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP example",
});
```

> 📘 **Tip:** When you expose agents through MCP, their `purpose` field becomes the tool description shown in clients. Keep it short and user-facing (fallback is the agent instructions if `purpose` is empty).

This minimal configuration:

- Names the server `voltagent-example` (used in URLs and IDE listings).
- Registers server metadata so clients can discover it even before you add tools/agents.
- Enables all transports (`stdio`, `http`, `sse`) by default. Override `protocols` to disable transports you do not need.

```ts title="src/mcp/server.ts"
export const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP stdio example",
  protocols: {
    stdio: true,
    http: false,
    sse: false,
  },
});
```

The snippet above shows how to run in stdio-only mode (ideal for IDE integrations or command-line tooling).

## 3. Register the server with VoltAgent

```ts title="src/voltagent.ts"
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { mcpServer } from "./mcp/server";
import { assistant } from "./agents/assistant";
import { expenseApprovalWorkflow } from "./workflows/expense";
import { logger } from "./logger";

export const voltAgent = new VoltAgent({
  agents: {
    assistant,
  },
  workflows: {
    expenseApprovalWorkflow,
  },
  mcpServers: {
    mcpServer,
  },
  server: honoServer({ port: 3141 }),
  logger,
});
```

- `mcpServers` registers your MCP server alongside the agent/workflow registries.
- Passing `server: honoServer(...)` makes VoltAgent expose MCP HTTP and SSE routes automatically. With the server running, visit [`https://console.voltagent.dev/mcp`](https://console.voltagent.dev/mcp) to browse, invoke, and debug tools.

## 4. Find the MCP endpoint (HTTP + SSE)

When you start the VoltAgent server, MCP transport endpoints are exposed per server ID:

- **Streamable HTTP**: `POST /mcp/{serverId}/mcp`
- **SSE** (if enabled): `GET /mcp/{serverId}/sse` and `POST /mcp/{serverId}/messages`

The `{serverId}` is a normalized version of the `name` (lowercased, spaces replaced) and may get a numeric suffix if there are duplicates. You can always discover it via the registry endpoint:

```bash
curl http://localhost:3141/mcp/servers
```

Example response (trimmed):

```json
{
  "servers": [
    {
      "id": "voltagent-example",
      "name": "voltagent-example",
      "version": "0.1.0"
    }
  ]
}
```

Once you have the `id`, the HTTP MCP URL becomes:

```
http://localhost:3141/mcp/voltagent-example/mcp
```

## 5. Connect via stdio (local process)

STDIO does not use an HTTP URL. The MCP client spawns your server process and communicates over stdin/stdout. In the startup log you should see a line like:

```
STDIO  uses stdin/stdout. Example client: { type: "stdio", command: "node", args: ["dist/index.js"] }
```

Client example (MCPClient):

```ts
import { MCPClient } from "@voltagent/core";

const client = new MCPClient({
  clientInfo: { name: "local-client", version: "0.1.0" },
  server: {
    type: "stdio",
    command: "node",
    args: ["dist/index.js"],
    cwd: process.cwd(),
    env: { ...process.env },
  },
});

await client.connect();
const tools = await client.listTools();
```

Replace `command`/`args` with the entry that starts your VoltAgent + MCP server (for example `pnpm start -- --stdio` or `node dist/index.js` after build).

## 6. Connect via HTTP

Use the MCP URL in `MCPConfiguration`:

```ts
import { MCPConfiguration } from "@voltagent/core";

const mcpConfig = new MCPConfiguration({
  servers: {
    local: {
      type: "http",
      url: "http://localhost:3141/mcp/voltagent-example/mcp",
    },
  },
});

const tools = await mcpConfig.getTools();
```

## 7. Optional: add MCP-only entries

Sometimes you want MCP clients to see helpers that are not (yet) registered with VoltAgent. Provide them as keyed objects (just like the main `VoltAgent` config) via the `agents`, `workflows`, or `tools` fields to append entries that live only on the MCP side:

```ts title="src/mcp/server.ts"
import { Agent, createTool, createWorkflowChain } from "@voltagent/core";
import { MCPServer } from "@voltagent/mcp-server";
import { z } from "zod";

const statusTool = createTool({
  name: "status",
  description: "Return the current time",
  parameters: z.object({}),
  async execute() {
    return { status: "ok", time: new Date().toISOString() };
  },
});

const supportAgent = new Agent({
  name: "Support Agent",
  purpose: "Route customer tickets to the correct queue.",
  instructions:
    "Use internal knowledge to triage customer tickets and respond with routing guidance.",
  model: "openai/gpt-4o-mini",
  tools: [statusTool],
});

const incidentWorkflow = createWorkflowChain({
  id: "incident-triage",
  name: "Incident Triage",
  purpose: "Placeholder entry for an external workflow.",
  input: z.object({ ticketId: z.string() }),
}).andThen({
  id: "acknowledge",
  execute: async ({ data }) => ({ ...data, acknowledged: true }),
});

export const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP stdio example",
  tools: {
    statusTool,
  },
  agents: {
    supportAgent,
  },
  workflows: {
    incidentWorkflow,
  },
});
```

These configured entries behave like regular VoltAgent components for MCP clients, they appear in listings and can be invoked-yet they are not registered with the main `VoltAgent` instance.

## 8. Optional: filter exposed agents/workflows/tools

By default, every agent, workflow, and tool registered with `VoltAgent` is visible to MCP clients. Provide filter functions when you need to hide or reorder the registry output for a specific transport:

```ts title="src/mcp/server.ts"
export const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP stdio example",
  filterAgents: ({ items }) => items.filter((agent) => agent.id !== "internal"),
  filterWorkflows: ({ items }) => items,
  filterTools: ({ items }) => items,
});
```

Filters receive the list of components sourced from the VoltAgent registries (plus any configured additions) and must return the array you want to expose. They are intended for pruning or sorting, use the `agents`/`workflows`/`tools` fields when you need to introduce brand-new entries.

## 9. Optional: stream prompts and resources

MCP clients can ask a server for structured prompt templates (`prompts/list`, `prompts/get`) and arbitrary resources (`resources/list`, `resources/read`). VoltAgent lets you seed static content and/or forward to a dynamic source via the new `adapters` field:

```ts title="src/mcp/server.ts"
import { MCPServer } from "@voltagent/mcp-server";

// Replace these placeholders with your own services or data sources
const voltOps = {
  prompts: {
    list: async () => [
      {
        name: "triage",
        description: "Short ticket triage message",
        arguments: [],
      },
    ],
    get: async (name: string, version?: string) => ({
      description: `Prompt ${name}`,
      messages: [{ role: "user", content: { type: "text", text: "Summarise ticket {{id}}" } }],
      version,
    }),
  },
};

const knowledgeBase = {
  list: async () => [
    {
      uri: "volt://docs/runbook",
      name: "On-call runbook",
      description: "Operational checklist",
      mimeType: "text/markdown",
    },
  ],
  read: async (uri: string) => ({
    uri,
    mimeType: "text/markdown",
    text: "# On-call runbook\n...",
  }),
};

export const mcpServer = new MCPServer({
  name: "voltagent-example",
  version: "0.1.0",
  description: "VoltAgent MCP with prompts/resources",
  adapters: {
    prompts: {
      listPrompts: async () => voltOps.prompts.list(),
      getPrompt: async (params) => voltOps.prompts.get(params.name, params.version),
    },
    resources: {
      listResources: async () => knowledgeBase.list(),
      readResource: async (uri) => knowledgeBase.read(uri),
    },
  },
});
```

- The `adapters` block forwards MCP requests to any backend (VoltOps Prompt Manager, a documentation service, your own REST API).
- When you change external data, call `await mcpServer.notifyPromptListChanged()` or `await mcpServer.notifyResourceListChanged()` so connected IDEs receive the standard `list_changed` notifications. If you update a specific resource at runtime, invoke `await mcpServer.notifyResourceUpdated("volt://docs/runbook")` to push an incremental update only to subscribers.
- If an adapter provides a `sendRequest` method, MCP clients can make `elicitation/create` calls. VoltAgent forwards these requests to the adapter so you can collect data from the user and return an `ElicitResult`. Tools can consume the bridge via `operationContext.elicitation`:

```ts
const confirmAction = createTool({
  name: "confirm-action",
  description: "Ask the operator to approve a risky step",
  parameters: z.object({ description: z.string() }),
  async execute(args, operationContext) {
    const handler = operationContext?.elicitation;

    if (!handler) {
      throw new Error("Elicitation bridge unavailable");
    }

    return handler({
      schema: {
        type: "object",
        properties: {
          confirmed: { type: "boolean" },
        },
        required: ["confirmed"],
      },
      message: `Approve the following action: ${args.description}`,
    });
  },
});
```

That’s it! Your VoltAgent stack now speaks MCP. Start the agent, open VoltOps Console (or your preferred MCP client), and you’ll see the server listed with its tools, prompts, resources, and workflows ready to debug.
