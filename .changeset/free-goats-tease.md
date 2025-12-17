---
"@voltagent/core": minor
---

feat: add authorization layer for MCP tools

Add a `can` function to `MCPConfiguration` that lets you control which MCP tools users can discover and execute. Supports both tool discovery filtering and execution-time checks.

## Usage

```typescript
import { MCPConfiguration, type MCPCanParams } from "@voltagent/core";

const mcp = new MCPConfiguration({
  servers: {
    expenses: { type: "http", url: "http://localhost:3142/mcp" },
  },
  authorization: {
    can: async ({ toolName, action, userId, context }: MCPCanParams) => {
      const roles = (context?.get("roles") as string[]) ?? [];

      // action is "discovery" (getTools) or "execution" (tool call)
      if (toolName === "delete_expense" && !roles.includes("admin")) {
        return { allowed: false, reason: "Admin only" };
      }

      return true;
    },
    filterOnDiscovery: true, // Hide unauthorized tools from tool list
    checkOnExecution: true, // Verify on each tool call
  },
});

// Get tools filtered by user's permissions
const tools = await mcp.getTools({
  userId: "user-123",
  context: { roles: ["manager"] },
});
```

## `MCPCanParams`

```typescript
interface MCPCanParams {
  toolName: string; // Tool name (without server prefix)
  serverName: string; // MCP server identifier
  action: "discovery" | "execution"; // When the check is happening
  arguments?: Record<string, unknown>; // Tool arguments (execution only)
  userId?: string;
  context?: Map<string | symbol, unknown>;
}
```

## Cerbos Integration

For production use with policy-based authorization:

```typescript
import { GRPC } from "@cerbos/grpc";

const cerbos = new GRPC("localhost:3593", { tls: false });

const mcp = new MCPConfiguration({
  servers: { expenses: { type: "http", url: "..." } },
  authorization: {
    can: async ({ toolName, serverName, userId, context }) => {
      const roles = (context?.get("roles") as string[]) ?? ["user"];

      const result = await cerbos.checkResource({
        principal: { id: userId ?? "anonymous", roles },
        resource: { kind: `mcp::${serverName}`, id: serverName },
        actions: [toolName],
      });

      return { allowed: result.isAllowed(toolName) ?? false };
    },
    filterOnDiscovery: true,
    checkOnExecution: true,
  },
});
```

See the full Cerbos example: [examples/with-cerbos](https://github.com/VoltAgent/voltagent/tree/main/examples/with-cerbos)
