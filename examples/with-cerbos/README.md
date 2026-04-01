# VoltAgent MCP Authorization with Cerbos

This example demonstrates how to use VoltAgent's pluggable MCP authorization layer with [Cerbos](https://cerbos.dev/) for fine-grained access control.

## Overview

The MCP authorization layer allows you to:

1. **Filter tools on discovery** - Hide tools from users who don't have permission to use them
2. **Check authorization on execution** - Verify permissions before each tool call

This example uses Cerbos as the Policy Decision Point (PDP) to enforce role-based access control on MCP tools.

## Prerequisites

- Node.js 18+
- Docker (for running Cerbos)
- OpenAI API key

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set environment variables

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and set your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start Cerbos PDP

```bash
pnpm cerbos:start
```

This starts a Cerbos container with the policies defined in `policies/mcp_tools.yaml`.

### 4. Run the example

```bash
pnpm dev
```

## How It Works

### Simple `can` Function with Cerbos

This example uses the simple `can` function API to integrate with Cerbos:

```typescript
import { GRPC } from "@cerbos/grpc";
import { MCPConfiguration } from "@voltagent/core";
import type { MCPCanParams } from "@voltagent/core";

// Create Cerbos client
const cerbos = new GRPC("localhost:3593", { tls: false });

// Create MCP configuration with authorization
const mcp = new MCPConfiguration({
  servers: {
    expenses: {
      type: "http",
      url: "http://localhost:3000/mcp",
    },
  },
  authorization: {
    // Simple `can` function that uses Cerbos for authorization
    // The `action` parameter tells you if this is for discovery or execution
    can: async ({
      toolName,
      serverName,
      action,
      arguments: args,
      userId,
      context,
    }: MCPCanParams) => {
      // Extract roles from context
      const roles = (context?.get("roles") as string[]) ?? ["user"];

      // action is either "discovery" or "execution"
      // - "discovery": Tool is being listed (getTools/getToolsets)
      // - "execution": Tool is being executed (callTool)

      // Check with Cerbos
      const result = await cerbos.checkResource({
        principal: {
          id: userId ?? "anonymous",
          roles,
          attr: context ? Object.fromEntries(context) : {},
        },
        resource: {
          kind: "mcp::tool",
          id: `${serverName}/${toolName}`,
          attr: args,
        },
        actions: ["execute"],
      });

      const allowed = result.isAllowed("execute");
      return {
        allowed,
        reason: allowed ? undefined : `Access denied for tool: ${toolName}`,
      };
    },
    filterOnDiscovery: true, // Hide unauthorized tools
    checkOnExecution: true, // Verify on each call
  },
});
```

### Getting Tools with Authorization Context

```typescript
// Tools visible to a manager
const tools = await mcp.getTools({
  userId: "manager-123",
  context: { roles: ["manager"] },
});
```

## Policy Structure

The Cerbos policy (`policies/mcp_tools.yaml`) defines access rules:

| Tool            | user | manager | admin |
| --------------- | ---- | ------- | ----- |
| list_expenses   | Yes  | Yes     | Yes   |
| add_expense     | Yes  | No      | No    |
| approve_expense | No   | Yes     | Yes   |
| reject_expense  | No   | Yes     | Yes   |
| delete_expense  | No   | No      | Yes   |
| superpower_tool | No   | No      | Yes   |

## Project Structure

```
with-cerbos/
├── src/
│   ├── index.ts           # Main demo with `can` function + Cerbos
│   └── mcp-server.ts      # Example MCP server with tools
├── policies/
│   └── mcp_tools.yaml     # Cerbos policy definitions
├── docker-compose.yml     # Cerbos container setup
├── package.json
└── README.md
```

## Using Your Own Authorization Logic

The `can` function makes it easy to integrate any authorization system:

```typescript
const mcp = new MCPConfiguration({
  servers: {
    /* ... */
  },
  authorization: {
    can: async ({ toolName, action, userId, context }) => {
      // Simple role-based example
      const roles = (context?.get("roles") as string[]) ?? [];

      // action is "discovery" or "execution"
      // You can use this to apply different rules
      console.log(`Checking ${action} permission for ${toolName}`);

      const toolPermissions: Record<string, string[]> = {
        list_items: ["user", "manager", "admin"],
        delete_item: ["admin"],
      };

      const allowedRoles = toolPermissions[toolName] ?? [];
      const hasPermission = roles.some((role) => allowedRoles.includes(role));

      return {
        allowed: hasPermission,
        reason: hasPermission ? undefined : "Insufficient permissions",
      };
    },
    filterOnDiscovery: true,
    checkOnExecution: true,
  },
});
```

For more complex authorization systems (OPA, Casbin, etc.), you can also implement the `MCPAuthorizationAdapter` interface. See the [MCP Authorization documentation](/docs/agents/mcp/authorization) for details.

## Cleanup

```bash
pnpm cerbos:stop
```
