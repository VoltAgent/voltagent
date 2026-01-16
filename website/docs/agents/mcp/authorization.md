---
title: MCP Authorization
description: Add access control to MCP tools with VoltAgent's authorization layer
---

# MCP Authorization

VoltAgent provides an authorization layer for MCP (Model Context Protocol) tools. This allows you to control which tools users can see and execute based on roles, permissions, or any custom logic.

## Overview

The MCP authorization layer supports two modes:

1. **Tool Discovery Filtering** (`filterOnDiscovery`) - Hide tools from users who don't have permission to use them
2. **Execution-Time Checks** (`checkOnExecution`) - Verify permissions before each tool call

You can enable either or both modes depending on your security requirements.

## Quick Start

Add authorization with the `can` function:

```typescript
import { MCPConfiguration } from "@voltagent/core";

const mcp = new MCPConfiguration({
  servers: {
    myServer: {
      type: "http",
      url: "http://localhost:3000/mcp",
    },
  },
  authorization: {
    can: async ({ toolName, action, userId, context }) => {
      const roles = (context?.get("roles") as string[]) ?? [];

      // Admin-only tools
      if (toolName === "delete_item" && !roles.includes("admin")) {
        return { allowed: false, reason: "Only admins can delete items" };
      }

      return true;
    },
    filterOnDiscovery: true,
    checkOnExecution: true,
  },
});

// Get tools with authorization context
const tools = await mcp.getTools({
  userId: "user-123",
  context: { roles: ["manager"], department: "engineering" },
});
```

## The `can` Function

The `can` function receives authorization parameters and returns whether access is allowed.

### Parameters

```typescript
interface MCPCanParams {
  /** Tool name (without server prefix) */
  toolName: string;
  /** Server/resource identifier */
  serverName: string;
  /** The action being authorized: "discovery" or "execution" */
  action: "discovery" | "execution";
  /** Tool arguments (only available for "execution" action) */
  arguments?: Record<string, unknown>;
  /** User identifier */
  userId?: string;
  /** User-defined context Map */
  context?: Map<string | symbol, unknown>;
}
```

### Return Value

Return a boolean or an object with `allowed` and optional `reason`:

```typescript
// Simple boolean
return true;
return false;

// Object with reason (shown in error message when denied)
return { allowed: true };
return { allowed: false, reason: "Insufficient permissions" };
```

## When Actions Are Called

The `action` parameter tells you whether the check is for listing tools or executing a tool.

### Discovery Action

When you call `getTools()` with `filterOnDiscovery: true`, the `can` function is called for each tool with `action: "discovery"`.

**Your code:**

```typescript
const mcp = new MCPConfiguration({
  servers: { expenses: { type: "http", url: "http://localhost:8080/mcp" } },
  authorization: {
    can: async (params) => {
      console.log("can() called with:", JSON.stringify(params, null, 2));
      return true;
    },
    filterOnDiscovery: true,
  },
});

const tools = await mcp.getTools({
  userId: "user-123",
  context: { roles: ["manager"] },
});
```

**What `can` receives (for each tool on the server):**

```json
{
  "toolName": "list_expenses",
  "serverName": "expenses",
  "action": "discovery",
  "userId": "user-123",
  "context": { "roles": ["manager"] }
}
```

```json
{
  "toolName": "add_expense",
  "serverName": "expenses",
  "action": "discovery",
  "userId": "user-123",
  "context": { "roles": ["manager"] }
}
```

```json
{
  "toolName": "delete_expense",
  "serverName": "expenses",
  "action": "discovery",
  "userId": "user-123",
  "context": { "roles": ["manager"] }
}
```

Note: `arguments` is `undefined` during discovery since no tool is being executed yet.

### Execution Action

When a tool is executed (via agent interaction or direct call) with `checkOnExecution: true`, the `can` function is called with `action: "execution"` and the tool's `arguments`.

**Your code:**

```typescript
const mcp = new MCPConfiguration({
  servers: { expenses: { type: "http", url: "http://localhost:8080/mcp" } },
  authorization: {
    can: async (params) => {
      console.log("can() called with:", JSON.stringify(params, null, 2));
      return true;
    },
    checkOnExecution: true,
  },
});

const tools = await mcp.getTools();

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o",
  tools,
});

// When user says "add an expense for $50 coffee"
// and the agent decides to call the add_expense tool:
await agent.generateText("Add an expense for $50 coffee", {
  userId: "user-123",
  context: new Map([["roles", ["manager"]]]),
});
```

**What `can` receives when the agent calls `add_expense`:**

```json
{
  "toolName": "add_expense",
  "serverName": "expenses",
  "action": "execution",
  "arguments": {
    "amount": 50,
    "description": "coffee"
  },
  "userId": "user-123",
  "context": { "roles": ["manager"] }
}
```

### Different Logic per Action

You can use different authorization logic depending on the action:

```typescript
can: async ({ toolName, action, arguments: args, userId, context }) => {
  const roles = (context?.get("roles") as string[]) ?? [];

  if (action === "discovery") {
    // During getTools(): hide admin tools from non-admins
    if (toolName.startsWith("admin_") && !roles.includes("admin")) {
      return false; // Tool won't appear in the list
    }
  }

  if (action === "execution") {
    // During tool execution: check specific permissions
    if (toolName === "delete_expense") {
      if (!roles.includes("admin")) {
        return { allowed: false, reason: "Only admins can delete expenses" };
      }
    }

    // Check argument-based permissions (only available during execution)
    if (toolName === "transfer_funds" && args?.amount > 10000) {
      if (!roles.includes("senior_manager")) {
        return { allowed: false, reason: "Transfers over $10,000 require senior manager approval" };
      }
    }
  }

  return true;
};
```

## Authorization Context

When calling `getTools()` or during tool execution, provide authorization context:

```typescript
interface MCPAuthorizationContext {
  userId?: string;
  context?: Map<string | symbol, unknown> | Record<string, unknown>;
}

// Example: pass context to getTools()
const tools = await mcp.getTools({
  userId: "user-123",
  context: {
    roles: ["admin"],
    tenantId: "acme-corp",
    permissions: ["read", "write"],
  },
});
```

The context is converted to a `Map` and passed to your `can` function.

## Examples

### Role-Based Access

```typescript
const mcp = new MCPConfiguration({
  servers: {
    /* ... */
  },
  authorization: {
    can: async ({ toolName, context }) => {
      const roles = (context?.get("roles") as string[]) ?? [];

      const toolPermissions: Record<string, string[]> = {
        list_items: ["user", "manager", "admin"],
        create_item: ["user", "manager", "admin"],
        delete_item: ["admin"],
        admin_panel: ["admin"],
      };

      const allowedRoles = toolPermissions[toolName] ?? [];
      const hasPermission = roles.some((role) => allowedRoles.includes(role));

      if (!hasPermission) {
        return { allowed: false, reason: `Requires one of: ${allowedRoles.join(", ")}` };
      }

      return true;
    },
    filterOnDiscovery: true,
    checkOnExecution: true,
  },
});
```

### Attribute-Based Access Control

Use tool arguments for attribute-based access control (only available during execution):

```typescript
const mcp = new MCPConfiguration({
  servers: {
    /* ... */
  },
  authorization: {
    can: async ({ toolName, action, arguments: args, userId }) => {
      // arguments is only available during execution
      if (action === "execution" && toolName === "get_user_data") {
        const requestedUserId = args?.userId as string;
        if (requestedUserId !== userId) {
          return { allowed: false, reason: "Can only access your own data" };
        }
      }

      return true;
    },
    checkOnExecution: true,
  },
});
```

## Policy-Based Authorization with Cerbos

For production applications, use a dedicated authorization service like [Cerbos](https://cerbos.dev/). Cerbos is an open-source authorization layer that lets you define access policies in YAML files.

See the full working example: [examples/with-cerbos](https://github.com/VoltAgent/voltagent/tree/main/examples/with-cerbos)

### Project Structure

```
with-cerbos/
├── docker-compose.yml    # Cerbos PDP container
├── policies/
│   └── mcp_tools.yaml    # Authorization policies
├── src/
│   ├── index.ts          # Agent with MCP authorization
│   └── mcp-server.ts     # MCP server with tools
└── package.json
```

### Step 1: Start Cerbos PDP

Create `docker-compose.yml`:

```yaml
services:
  cerbos:
    image: ghcr.io/cerbos/cerbos:latest
    ports:
      - "3593:3593" # gRPC
      - "3592:3592" # HTTP
    volumes:
      - ./policies:/policies
    command: ["server", "--config=/conf.yaml"]
    configs:
      - source: cerbos-config
        target: /conf.yaml

configs:
  cerbos-config:
    content: |
      server:
        httpListenAddr: ":3592"
        grpcListenAddr: ":3593"
      storage:
        driver: disk
        disk:
          directory: /policies
```

Start with `docker compose up -d`.

### Step 2: Define Policies

Create `policies/mcp_tools.yaml`:

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "mcp::expenses"
  rules:
    # All users can list expenses
    - actions: ["list_expenses"]
      effect: EFFECT_ALLOW
      roles: ["admin", "manager", "user"]

    # Only users can add expenses
    - actions: ["add_expense"]
      effect: EFFECT_ALLOW
      roles: ["user"]

    # Managers and admins can approve/reject
    - actions: ["approve_expense", "reject_expense"]
      effect: EFFECT_ALLOW
      roles: ["admin", "manager"]

    # Only admins can delete
    - actions: ["delete_expense"]
      effect: EFFECT_ALLOW
      roles: ["admin"]
```

The policy structure:

- `resource`: `mcp::expenses` matches the `serverName` in your MCP configuration
- `actions`: Tool names (e.g., `list_expenses`, `add_expense`)
- `roles`: Which roles can perform the action
- `effect`: `EFFECT_ALLOW` or `EFFECT_DENY`

### Step 3: Connect to Cerbos

```typescript
import { GRPC } from "@cerbos/grpc";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import type { MCPCanParams } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const cerbos = new GRPC("localhost:3593", { tls: false });

const mcp = new MCPConfiguration({
  servers: {
    expenses: {
      type: "http",
      url: "http://localhost:3142/mcp",
    },
  },
  authorization: {
    can: async ({ toolName, serverName, action, userId, context }: MCPCanParams) => {
      const roles = (context?.get("roles") as string[]) ?? ["user"];

      const result = await cerbos.checkResource({
        principal: {
          id: userId ?? "anonymous",
          roles,
        },
        resource: {
          kind: `mcp::${serverName}`,
          id: serverName,
        },
        actions: [toolName],
      });

      const allowed = result.isAllowed(toolName) ?? false;

      return {
        allowed,
        reason: allowed ? undefined : `Access denied for ${toolName}`,
      };
    },
    filterOnDiscovery: true,
    checkOnExecution: true,
  },
});
```

### Step 4: Create the Agent

```typescript
const tools = await mcp.getTools({
  userId: "user-123",
  context: { roles: ["manager"] },
});

const agent = new Agent({
  name: "Finance Assistant",
  instructions: `You are a finance assistant that helps users manage expenses.
Available actions depend on the user's role.`,
  model: "openai/gpt-4o-mini",
  tools,
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
});
```

### How It Works

1. **Tool Discovery**: When `getTools()` is called, each tool is checked against Cerbos. Tools the user can't access are filtered out.

2. **Tool Execution**: When the agent calls a tool, Cerbos verifies the user has permission before execution.

3. **Policy Evaluation**: Cerbos matches the request against policies:
   - `principal.roles` → matches policy `roles`
   - `resource.kind` → matches policy `resource`
   - `actions[0]` → matches policy `actions`

### Example Flow

User with role `["manager"]` calls `getTools()`:

| Tool              | Cerbos Check                      | Result      |
| ----------------- | --------------------------------- | ----------- |
| `list_expenses`   | manager in [admin, manager, user] | ✅ Allowed  |
| `add_expense`     | manager in [user]                 | ❌ Filtered |
| `approve_expense` | manager in [admin, manager]       | ✅ Allowed  |
| `delete_expense`  | manager in [admin]                | ❌ Filtered |

The manager sees only `list_expenses` and `approve_expense` in their tool list.

## Error Handling

When authorization fails at execution time, an `MCPAuthorizationError` is thrown:

```typescript
import { MCPAuthorizationError } from "@voltagent/core";

try {
  const result = await agent.generateText("Delete all expenses", {
    userId: "user-123",
    context: new Map([["roles", ["user"]]]),
  });
} catch (error) {
  if (error instanceof MCPAuthorizationError) {
    console.log(`Access denied for tool: ${error.toolName}`);
    console.log(`Server: ${error.serverName}`);
    console.log(`Reason: ${error.reason}`);
  }
}
```

## Configuration Reference

### MCPAuthorizationConfig

```typescript
interface MCPAuthorizationConfig {
  /**
   * Authorization function to check tool access.
   */
  can: MCPCanFunction;

  /**
   * Filter tools on discovery (getTools/getToolsets).
   * When true, unauthorized tools are hidden from the tool list.
   * @default false
   */
  filterOnDiscovery?: boolean;

  /**
   * Check authorization on execution (callTool).
   * When true, each tool call is verified before execution.
   * @default true
   */
  checkOnExecution?: boolean;
}
```

## See Also

- [MCP Configuration](./mcp.md) - Basic MCP setup
- [MCP Server](./mcp-server.md) - Building MCP servers
- [Cerbos Example](https://github.com/VoltAgent/voltagent/tree/main/examples/with-cerbos) - Full Cerbos integration example
