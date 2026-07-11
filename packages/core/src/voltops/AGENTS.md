# Core VoltOps Integration

Unified client for the VoltOps platform: prompt management (remote + local + templating), managed memory APIs, action execution, observability, and feedback. Wire compatibility with the VoltOps API is paramount.

## Critical Rules

- **Wire compatibility is non-negotiable.** Endpoint paths, HTTP methods, request/response field names, and exported types are part of a contract with deployed VoltOps consumers (agents, dashboards, integrations). Renames and removals are breaking changes.
- **Auth headers are fixed.** Every request sends `X-Public-Key` and `X-Secret-Key` (from `options.publicKey` / `options.secretKey` or env `VOLTAGENT_PUBLIC_KEY` / `VOLTAGENT_SECRET_KEY`). Renaming headers or env vars breaks existing setups.
- **`safeStringify` for all request bodies and structured logs.** Import from `@voltagent/internal`.
- **Prompt precedence is strict.** Local → per-agent VoltOpsClient → global VoltOpsClient → fallback instructions. Tests in `client-priority.spec.ts` document expected selection.
- **Template rendering must stay deterministic.** `{{ variable }}` substitution via the in-house template engine — no extra dependencies, no eval-style behavior.
- **Do not remove exported types.** External callers depend on `PromptReference`, `PromptContent`, `VoltOpsClientOptions`, action param types, and result types.

## Endpoints

### Prompt API

- `GET /prompts/public/{name}` — query params: `version`, `label` (default `latest`); returns `{ type: "text" | "chat", text?, messages? }`

### Managed Memory (`/managed-memory/projects/databases/{databaseId}/…`)

- `messages` — `add`, `addBatch`, `list`, `delete`, `clear`
- `conversations` — `create`, `get`, `query`, `update`, `delete`
- `vectors` — `store`, `storeBatch`, `search`, `get`, `delete`, `clear`
- `working-memory` — `get`, `set`, `delete`
- `workflow-states` — `get`, `set`, `list`, `listSuspended`

### Observability & Feedback

- `POST /api/public/feedback/tokens` — short-lived UI feedback token
- `GET /api/public/otel/v1/traces` — list traces with filters

### Actions

`client.actions` is a namespaced object (see `actions/client.ts` → `VoltOpsActionsClient`). Each provider gets its own sub-namespace; each method takes a typed params object that includes a `credential` (stored `credentialId` or inline) plus operation-specific fields.

Provider namespaces: `airtable`, `slack`, `discord`, `gmail`, `googleCalendar`, `googleDrive`, `postgres`.

```ts
await client.actions.slack.postMessage({
  actionId: "act_…",
  credential: { credentialId: "cred_123" },
  channel: "C123456",
  text: "Hello team",
});

await client.actions.airtable.createRecord({
  actionId: "act_…",
  credential: { credentialId: "cred_456" },
  baseId: "appXXX",
  tableId: "tblYYY",
  input: { Name: "Acme" },
});
```

## Prompt Management

**Remote** (`prompt-api-client.ts` → `prompt-manager.ts`): `client.prompts.getPrompt(reference)` → cached fetch → template render. Cache: LRU, default 100 entries, 5 min TTL, per-reference key, override via `PromptReference.promptCache`.

**Local** (`local-prompts.ts`): `.md` files with YAML frontmatter (`type`, `version`, `labels`, `tags`, `config`). Search order: `$VOLTAGENT_PROMPTS_PATH` → `$VOLTAGENT_PROMPTS_DIR` → `.voltagent/prompts/`. Selection: explicit version > label > `latest` label > highest version. Throws `LocalPromptNotFoundError` on miss or path escape.

**Precedence** (`createPromptHelperWithFallback`):

1. Local prompts (file-based)
2. Per-agent VoltOpsClient (`new VoltOpsClient({...})`)
3. Global VoltOpsClient (set on `new VoltAgent({ voltOpsClient })`)
4. Fallback instructions (string in agent definition)

## Auth & Errors

```ts
const headers = {
  "Content-Type": "application/json",
  "X-Public-Key": this.options.publicKey ?? "",
  "X-Secret-Key": this.options.secretKey ?? "",
};
const response = await this.fetchImpl(url, {
  method,
  headers,
  body: body !== undefined ? safeStringify(body) : undefined,
});
if (!response.ok) {
  throw new Error(payload?.message ?? `VoltOps request failed (${response.status})`);
}
```

No built-in retry — callers implement their own backoff. Errors are logged via the package logger before being thrown.

## Boundaries

**Allowed without asking**

- Adding new optional fields to request/response types.
- Adding new action providers.
- Improving logging or telemetry.
- Adding new prompt cache config options.
- Adding tests.

**Ask first**

- Changing template engine or `{{var}}` syntax.
- Changing cache TTL / max-size defaults.
- Changing precedence order.
- Modifying error type hierarchy.
- Removing exported types.

**Never without explicit ask**

- Renaming endpoint paths.
- Renaming request/response field names.
- Renaming auth header names or env vars.
- Removing endpoints.
- Breaking precedence semantics.

## Tests

```bash
pnpm --dir packages/core test:single -- src/voltops/prompt-manager.spec.ts
pnpm --dir packages/core test:single -- src/voltops/client-priority.spec.ts
pnpm --dir packages/core test:single -- src/voltops/client.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```

Mock pattern: `vi.mock()` for `fetch` and the logger. Assert request bodies serialized via `safeStringify`. Priority tests verify `createPromptHelperWithFallback()` selects the expected source.

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- External packages: `packages/voltagent-memory` (managed memory adapter that hits these endpoints), `packages/sdk` (mirrors public types for external callers)
