# @voltagent/server-core

Framework-agnostic HTTP handlers, Zod schemas, OpenAPI generation, auth, and WebSocket utilities. Consumed by the runtime adapter packages (`server-hono`, `server-elysia`, `serverless-hono`); changes here ripple to every server runtime.

## Critical Rules

- **Detect Zod v3 vs v4 at runtime.** Switch via `"toJSONSchema" in z`. Use `zod-from-json-schema-v3` vs `zod-from-json-schema`. See `agent.handlers.ts` and `options.ts`.
- **Auth header conventions are wire contracts.** `x-voltagent-dev` (dev bypass, requires non-production `NODE_ENV`), `x-console-access-key` / `?key=` query (production console access via `VOLTAGENT_CONSOLE_ACCESS_KEY`). WebSocket upgrade applies the same logic.
- **`safeStringify` for all serialization.** Import from `@voltagent/internal`. Apply to WebSocket frames, SSE payloads, observability events, and logs. Never raw `JSON.stringify` in handlers.
- **Handler signatures are the adapter contract.** Renaming `handleGenerateText`, `handleStreamText`, `handleWorkflowExecute`, etc. or changing their (`deps, logger, body, params, signal?, requestHeaders?`) shape breaks every runtime adapter. Coordinate cross-package.
- **Routes live in `src/routes/definitions.ts`.** Add new endpoints there first (method, path, params, responses) before wiring an adapter. OpenAPI generation reads this file.
- **OpenAPI 3.1.0 generation is opt-in for Swagger UI in production.** `shouldEnableSwaggerUI(config)` defaults true in dev, false in production unless `enableSwaggerUI=true`.

## Handlers

All handlers are framework-agnostic with a common signature: `(deps: ServerProviderDeps, logger, body, params, signal?, requestHeaders?) → Promise<ApiResponse>`. `ApiResponse` is `{ success: boolean; data?: T; error?: string }`.

**Streaming** (`handleStreamText`, `handleChatStream`, `handleWorkflowExecute`): SSE via `formatSSE` + `safeStringify`. Final frame is `[DONE]`.

**Zod-version detection**: at runtime, branch on `"toJSONSchema" in z` — v4 path uses `zod-from-json-schema`, v3 path uses `zod-from-json-schema-v3`.

## Schemas

`createServerCoreSchemas(zod?)` is a factory: callers pass their own Zod instance to keep version alignment between adapter and core. Schemas use `.describe()` for OpenAPI generation.

## Auth

- **Dev bypass**: `isDevRequest(req)` → true iff `NODE_ENV !== "production"` AND `x-voltagent-dev: true` (or `?dev=true`).
- **Console access**: `hasConsoleAccess(req)` extends dev bypass; in production checks `x-console-access-key` (or `?key=`) against `VOLTAGENT_CONSOLE_ACCESS_KEY`.
- **JWT**: provider in `auth/providers/jwt`.
- Public/console route defaults in `DEFAULT_LEGACY_PUBLIC_ROUTES` / `DEFAULT_CONSOLE_ROUTES`.

## WebSocket

Server: `createWebSocketServer`. Upgrade: `setupWebSocketUpgrade` (same auth as HTTP). Observability: `setupObservabilityHandler` streams telemetry frames. Logs: `LogStreamManager` in `websocket/log-stream.ts`.

## OpenAPI / Swagger

`getOpenApiDoc(port, info?)` produces an OpenAPI 3.1.0 document from `routes/definitions.ts`. `shouldEnableSwaggerUI(config)` controls UI exposure (dev on, prod off unless explicit).

## A2A & MCP Routes

JSON-RPC 2.0 for A2A — error codes `PARSE_ERROR`, `METHOD_NOT_FOUND`, `TASK_NOT_FOUND`, etc. Agent card endpoint: `/agents/:id/card` returns `AgentCard`. MCP routes registered under `/mcp/*` via `src/mcp/`.

## Code Examples

```ts
// Good — Zod-version-flexible schema use
const z = zod;
const zodSchema = ("toJSONSchema" in z ? convertJsonSchemaToZod : convertJsonSchemaToZodV3)(
  jsonSchema
) as any;
const result = await agent.generateObject(input, zodSchema, options);

// Good — safeStringify for streaming + WS
import { safeStringify } from "@voltagent/internal";
ws.send(safeStringify({ type: "text", content: "hello" }));

// Good — auth gate before sensitive handler
if (requiresAuth(route, authConfig) && !hasConsoleAccess(req)) {
  return { success: false, error: "Unauthorized" };
}

// Bad — raw JSON.stringify in production paths
ws.send(JSON.stringify(event)); // ✗ — use safeStringify
```

## Boundaries

**Allowed without asking**

- Adding focused handler tests.
- Internal refactors that preserve handler signatures.
- OpenAPI metadata edits (`description`, `summary`, `tags`).
- Additions to `DEFAULT_CONSOLE_ROUTES`.

**Ask first**

- Handler signature changes.
- New entries in `routes/definitions.ts` (wire-compat).
- Zod schema shape changes (cross-adapter break).
- Auth header / env var changes.
- OpenAPI version or generation strategy changes.

**Never without explicit ask**

- Removing handlers or public exports.
- Dropping Zod v3 or v4 support without coordinating across adapters.
- Changing JSON-RPC error codes or `AgentCard` shape.

## Tests

```bash
pnpm --dir packages/server-core test
pnpm --dir packages/server-core typecheck
# To run a single file, use vitest directly:
pnpm --dir packages/server-core exec vitest run src/handlers/agent.handlers.spec.ts
```

## Related

- Parent: [`../../AGENTS.md`](../../AGENTS.md) (repo)
- Runtime adapters: `packages/server-hono`, `packages/server-elysia`, `packages/serverless-hono`
- Core runtime: [`../core/AGENTS.md`](../core/AGENTS.md) — agent/workflow/memory contracts
- External: `@voltagent/internal` (`safeStringify`, A2A types)
- Repo docs: [`../../contributing/changesets.md`](../../contributing/changesets.md) (versioning impact of handler changes)
