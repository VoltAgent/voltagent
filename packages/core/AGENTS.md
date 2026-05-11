# @voltagent/core

Primary runtime package: agents, workflows, memory, tools, workspaces, observability, and VoltOps integration. Changes here ripple through server packages, examples, and downstream consumers.

## Critical Rules

- **No `console.log` in core source.** Biome rule `suspicious/noConsoleLog: error` is enforced under `packages/core/**` (see root `biome.json`). Use `LoggerProxy` / `getGlobalLogger()` from `src/logger`.
- **`safeStringify` for production serialization.** Import from `@voltagent/internal`. Apply to telemetry attributes, wire payloads, logs, and persistence.
- **Do not hand-edit `src/registries/*.generated.ts`.** Regenerate via `pnpm --dir packages/core generate:model-registry`.
- **Public exports are commitments.** Anything re-exported from `src/index.ts` (or via the package `exports` map in `package.json`) is API surface. Add a changeset for changes; preserve runtime AND type-level behavior.
- **Type inference is part of the API.** Add `*.spec-d.ts` coverage when changing public generics or inference paths. `pnpm test` already runs `--typecheck`.
- **Prefer existing registries/managers/context keys** over new global state. `AgentRegistry` and `WorkflowRegistry` are publicly re-exported from `src/index.ts`; the rest (`TriggerRegistry`, `MCPServerRegistry`, `A2AServerRegistry`, `ModelProviderRegistry`) are internal — extend in-place rather than introducing parallel state. Shared context keys live in `src/context-keys.ts`.

## Validation

Use the narrowest command that covers your change.

```bash
pnpm --dir packages/core test:single -- src/path/to/file.spec.ts
pnpm --dir packages/core test          # full suite, includes --typecheck
pnpm --dir packages/core typecheck     # tsc --noEmit
pnpm --dir packages/core build         # tsup
pnpm --dir packages/core attw          # @arethetypeswrong/cli
pnpm --dir packages/core publint       # publint --strict
```

`prebuild` runs `node ../../scripts/sync-docs-mcp.js` — keep that script working when changing build flow.

## Code Examples

```ts
// Good — production serialization
import { safeStringify } from "@voltagent/internal";
span.setAttribute("agent.context", safeStringify(contextMap));

// Acceptable — tests / fixtures only
const fixture = JSON.stringify({ input: "test" });
```

```ts
// Good — package logger (Biome blocks console.log here)
import { LoggerProxy } from "../logger";
const logger = new LoggerProxy({ component: "MyModule" });
logger.info("Agent created", { agentId });

// Good — child logger from global
import { getGlobalLogger } from "../logger";
const logger = getGlobalLogger().child({ agentId });
```

## Public API Surface

- **Main entry**: `src/index.ts` (re-exports across all subsystems).
- **Subpath exports**: only `.` is exposed via `package.json#exports`. There is no `@voltagent/core/utils`, etc.
- **Adding a public export**: update `src/index.ts`, add type tests in a neighboring `*.spec-d.ts`, run `pnpm --dir packages/core test --typecheck`, and add a changeset.

## Boundaries

**Allowed without asking**

- Adding focused tests.
- Refactors that don't change exports.
- Internal helpers.
- Narrowed scopes within a single subsystem.

**Ask first**

- Public option/result type changes.
- New top-level exports.
- Hook signature changes.
- Retry/abort/cancel semantics.
- Telemetry attribute keys (downstream consumers parse these).

**Never without explicit ask**

- Hand-editing generated registries.
- Removing `safeStringify` in production paths.
- Introducing `console.log`.
- Deleting public exports.
- Breaking the `prebuild` doc sync.

## High-Risk Areas

Detailed rules in nested `AGENTS.md`:

- [`src/agent/AGENTS.md`](./src/agent/AGENTS.md) — model calls, streaming, tools, guardrails, subagents, retries, hooks, telemetry (tightly coupled).
- [`src/workflow/AGENTS.md`](./src/workflow/AGENTS.md) — suspend/resume, step IDs, hooks, time travel, usage tracking, type inference.
- [`src/memory/AGENTS.md`](./src/memory/AGENTS.md) — `StorageAdapter` / `VectorAdapter` / `EmbeddingAdapter` contracts (cross-package impact).
- [`src/workspace/AGENTS.md`](./src/workspace/AGENTS.md) — filesystem, sandbox, search, skills, timeouts, tool policy (security-sensitive).
- [`src/voltops/AGENTS.md`](./src/voltops/AGENTS.md) — remote API clients, prompt management, action clients (wire-compat).
- [`src/tool/AGENTS.md`](./src/tool/AGENTS.md) — tool definition, schema validation, manager, routing, span tracking.
- [`src/observability/AGENTS.md`](./src/observability/AGENTS.md) — OTel span names + attribute keys (consumed by every subsystem and external exporters).
- [`src/mcp/AGENTS.md`](./src/mcp/AGENTS.md) — MCP wire-compat, JSON Schema↔Zod conversion, transport security.
- [`src/a2a/AGENTS.md`](./src/a2a/AGENTS.md) — A2A spec version, task ID stability, artifact format.

Other subsystems without dedicated `AGENTS.md` (treat with extra care; parent rules apply): `src/triggers`, `src/planagent`, `src/retriever`, `src/eval`, `src/voice`, `src/registries` (mix of hand-written like `agent-registry.ts` and generated `*.generated.ts` — only the `.generated` files are off-limits).

## Tests

- **Runtime behavior**: `*.spec.ts` next to the file you're changing. Avoid stuffing new cases into `agent.spec.ts` if a smaller neighbor exists.
- **Type inference**: `*.spec-d.ts` (validated via vitest `--typecheck`). Examples: `src/agent/agent.spec-d.ts`, `src/workflow/chain.spec-d.ts`, `src/memory/index.spec-d.ts`.
- **Single file**: `pnpm --dir packages/core test:single -- src/agent/agent.spec.ts`.

## Related

- Parent: [`../../AGENTS.md`](../../AGENTS.md) — repo-wide rules and the documentation index
- Children: [`src/agent/AGENTS.md`](./src/agent/AGENTS.md), [`src/workflow/AGENTS.md`](./src/workflow/AGENTS.md), [`src/memory/AGENTS.md`](./src/memory/AGENTS.md), [`src/workspace/AGENTS.md`](./src/workspace/AGENTS.md), [`src/voltops/AGENTS.md`](./src/voltops/AGENTS.md), [`src/tool/AGENTS.md`](./src/tool/AGENTS.md), [`src/observability/AGENTS.md`](./src/observability/AGENTS.md), [`src/mcp/AGENTS.md`](./src/mcp/AGENTS.md), [`src/a2a/AGENTS.md`](./src/a2a/AGENTS.md)
- Sibling package: [`../server-core/AGENTS.md`](../server-core/AGENTS.md)
- Repo docs: [`contributing/testing.md`](../../contributing/testing.md), [`contributing/linting.md`](../../contributing/linting.md), [`contributing/changesets.md`](../../contributing/changesets.md)
