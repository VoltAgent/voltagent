# Core MCP Integration

In-process bridge for the Model Context Protocol: exposes VoltAgent capabilities (tools, resources, prompts) to external MCP clients, and consumes external MCP servers as agent tools. Wire-compatible via the official `@modelcontextprotocol/sdk`.

## Critical Rules

- **Preserve MCP protocol wire compatibility.** SDK (`@modelcontextprotocol/sdk`) is range-pinned (caret) in `packages/core/package.json`; bump deliberately and verify against the spec when upgrading. Schema changes, transport additions, or tool result shape changes must not drift from the spec.
- **JSON Schema ↔ Zod conversion is lossy by design.** Use `zod-from-json-schema` (v4) or `zod-from-json-schema-v3` (v3); branch on `"toJSONSchema" in z`. Primitives are lossless; complex constraints (regex patterns, type-mismatched min/max) may downgrade. Document lossy paths in comments.
- **Don't expose internal types over MCP.** Only public `Tool` types, `MCPServerConfig`, `MCPClientConfig`, and types from `src/types.ts` cross the wire. Internal helpers stay internal.
- **`safeStringify` for telemetry of MCP messages.** Import from `@voltagent/internal`. Apply to tool calls, results, and authorization context in logs / spans.
- **Transport security is process-wide.** Stdio inherits parent process env and privileges. SSE / HTTP / streamable-HTTP require explicit `requestInit` with auth headers — never embed credentials in connection strings.
- **Elicitation handlers are once-only by default.** `UserInputBridge.once()` auto-deregisters after first use; permanent handlers persist until `removeHandler()`. Temporary option handlers take precedence over permanent ones.
- **Authorization gates discovery AND execution.** `filterOnDiscovery` hides unauthorized tools from `tools/list`; `checkOnExecution` (default true) re-checks before `tools/call`. Use both for full lockdown.

## Tool Conversion (JSON Schema → Zod)

On `tools/list`, the client converts each tool's `inputSchema`:

1. Fetch tool list from server.
2. Branch by Zod version (`"toJSONSchema" in z`).
3. Convert via `zod-from-json-schema` / `zod-from-json-schema-v3`.
4. Wrap with `createTool()` using namespaced name `<serverName>_<toolName>`.
5. `execute()` invokes `MCPClient.callTool()` and handles elicitation responses.

Conversion errors are logged but discovery continues — resilience over strictness.

## Transports

- **stdio** (`type: "stdio"`) — child process over stdin/stdout; inherits env. Local servers.
- **sse** (`type: "sse"`) — Server-Sent Events; stateless. Requires `requestInit` for auth.
- **http** (`type: "http"`) — auto-falls back to SSE if streamable-HTTP unsupported.
- **streamable-http** (`type: "streamable-http"`) — persistent streaming HTTP; no fallback.

All accept optional `timeout` (default 60000 ms — `DEFAULT_REQUEST_TIMEOUT_MSEC` in the MCP SDK).

## Authorization

```ts
const can: MCPCanFunction = async ({ toolName, action, userId, context }) => {
  if (toolName === "delete_database" && action === "execution") {
    return userId === "admin" ? true : { allowed: false, reason: "Admins only" };
  }
  return true;
};

const mcp = new MCPConfiguration({
  servers: { external: { type: "http", url: "..." } },
  authorization: { can, filterOnDiscovery: true, checkOnExecution: true },
});

// Context flows from agent OperationContext or explicit MCPAuthorizationContext
const tools = await mcp.getTools({ userId: "user123", context: { roles: ["viewer"] } });
```

## Code Example

```ts
import { MCPConfiguration } from "@voltagent/core";

const mcp = new MCPConfiguration({
  servers: {
    weather: { type: "stdio", command: "node", args: ["./weather-server.js"] },
    github: {
      type: "http",
      url: "http://localhost:3000",
      requestInit: { headers: { Authorization: "Bearer token_here" } },
    },
  },
  authorization: {
    can: async ({ toolName, action, userId }) =>
      action === "execution" && toolName.startsWith("delete") ? userId === "admin" : true,
    checkOnExecution: true,
  },
});

const tools = await mcp.getTools({ userId: "user1" });
const agent = new Agent({ model: "claude-3-5-sonnet-20241022", tools });
```

## Boundaries

**Allowed without asking**

- Adding transport fallback logic.
- Refining Zod conversion fallbacks.
- Expanding authorization checks.
- Adding tests.

**Ask first**

- Upgrading the MCP SDK version.
- Modifying `MCPClient.callTool()` signature.
- Changing tool naming scheme (`<serverName>_<toolName>`).
- Adding new transport types.

**Never without explicit ask**

- Removing `safeStringify` from telemetry.
- Exporting internal helper types.
- Changing authorization context shape.
- Hand-editing tool definitions for security.

## Tests

```bash
pnpm --dir packages/core test:single -- src/mcp/client/index.spec.ts
pnpm --dir packages/core test:single -- src/mcp/registry/index.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- External: `packages/mcp-server` (standalone MCP server), `packages/docs-mcp` (docs-as-MCP)
