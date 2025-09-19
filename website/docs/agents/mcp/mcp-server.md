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

This minimal configuration:

- Names the server `voltagent-example` (used in URLs and IDE listings).
- Ships a static prompt so clients immediately see helpful metadata even before wiring runtime adapters.
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

## 4. Optional: add MCP-only entries

Sometimes you want MCP clients to see helpers that are not (yet) registered with VoltAgent. Provide them as keyed objects (just like the main `VoltAgent` config) via the `agents`, `workflows`, or `tools` fields to append entries that live only on the MCP side:

```ts title="src/mcp/server.ts"
import { openai } from "@ai-sdk/openai";
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
  instructions: "Route customer tickets to the correct queue.",
  model: openai("gpt-4o-mini"),
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

## 5. Optional: filter exposed agents/workflows/tools

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

That’s it! Your VoltAgent stack now speaks MCP. Start the agent, open VoltOps Console (or your preferred MCP client), and you’ll see the server listed with its tools, prompts, and workflows ready to debug.
