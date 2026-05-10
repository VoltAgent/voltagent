# Core A2A Integration

In-process registry for Agent-to-Agent (A2A) protocol servers. Exposes `A2AServerRegistry` for registering, discovering, and routing to agent servers that implement the A2A spec via `@a2a-js/sdk`.

## Critical Rules

- **A2A protocol wire compatibility is locked.** `@a2a-js/sdk` is consumed by `packages/a2a-server` (not by `@voltagent/core` directly) — coordinate any version bump there with `packages/server-hono`. The registry in this directory only stores servers that conform to `A2AServerLike` from `@voltagent/internal`.
- **Task ID stability is required for resumption.** Task IDs must be deterministic and persistent across agent restarts. Prefer client-provided `taskId` from `A2AMessage`; only fall back to `randomUUID()`.
- **Artifact format is wire-committed.** `TaskArtifact` shape — `{ name, parts: [{ kind, text }], description?, metadata? }` — must not be restructured without a backwards-compatible migration.
- **Server metadata resolution is idempotent.** Internal `resolveMetadata()` normalizes and deduplicates server IDs; the same server instance always maps to the same ID across calls.
- **Registry is per-VoltAgent instance, not global.** Instantiate via `new A2AServerRegistry()` per runtime container; do not use as a singleton.
- **`safeStringify` for serialized A2A messages in logs / telemetry.** Import from `@voltagent/internal`.

## Registry Pattern

> Note: base types (`A2AServerLike`, `A2AServerDeps`, `A2AServerMetadata`) live in `packages/internal/src/a2a/`, not here.

`A2AServerRegistry` manages servers conforming to `A2AServerLike`:

- **Register** via `.register(server, deps)` with the agent registry and optional task store.
- **Unregister** via `.unregister(id)`.
- **Lookup** by normalized ID via `.getServer(id)` / `.getMetadata(id)`.
- **List** via `.list()` / `.listMetadata()` for discovery.

(`resolveMetadata` is private — used internally by `register`.)

ID normalization: lowercase, strip everything outside `[a-z0-9_-]`, collapse duplicate separators, append `-1` / `-2` / … on collision. Same server instance → same ID across calls.

## A2A vs. Subagents

- **Subagents** (`src/agent/subagent/`) — in-process delegation within one VoltAgent runtime. Direct method calls; shared context.
- **A2A** — cross-process or network-exposed agents via the A2A protocol. JSON-RPC over HTTP; task-based resumption.

Use A2A when calling agents outside your process or exposing your agents to external callers.

## Code Example

```ts
import { A2AServerRegistry, VoltAgent } from "@voltagent/core";
import { A2AServer } from "@voltagent/a2a-server";

const voltAgent = new VoltAgent({
  /* ... */
});
const registry = new A2AServerRegistry();

const server = new A2AServer({
  name: "My Agents",
  version: "1.0.0",
  agents: { researchAgent, analyzerAgent },
});

registry.register(server, {
  agentRegistry: voltAgent.agents,
  taskStore: customTaskStore, // optional, for resumable tasks
});

// Lookup by normalized ID
const meta = registry.getMetadata("my-agents");

// JSON-RPC request handling (typically via packages/a2a-server or packages/server-hono)
const result = await server.handleRequest("researchAgent", {
  jsonrpc: "2.0",
  id: "call-1",
  method: "message/send",
  params: {
    message: {
      kind: "message",
      role: "user",
      messageId: "msg-1",
      parts: [
        /* … */
      ],
    },
  },
});
```

## Boundaries

**Allowed without asking**

- Adding internal registry helpers.
- Optimizing lookup.
- Improving ID normalization.
- Focused unit tests.

**Ask first**

- Changing `A2AServerLike` interface shape.
- Modifying metadata resolution logic.
- Upgrading the A2A spec version (coordinate with `a2a-server`).

**Never without explicit ask**

- Removing `A2AServerRegistry` from public exports.
- Changing the ID dedup algorithm.
- Introducing a stateful global singleton registry.

## Tests

There are no spec files in this directory yet; coverage is delegated to `packages/a2a-server` and adapter integrations. When adding behavior here, add a `*.spec.ts` neighbor.

```bash
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
pnpm --dir packages/a2a-server test
```

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md)
- External: `packages/a2a-server` (A2A server runtime + protocol bridge), `packages/server-hono` (HTTP routes for A2A), `packages/internal/src/a2a/` (base types)
