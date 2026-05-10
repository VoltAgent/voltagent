# Core Agent Runtime

Owns the `Agent` class and the four paired execution methods: `generateText` / `streamText` and `generateObject` / `streamObject`. Tools, memory persistence, guardrails, subagents, retries, hooks, and telemetry all interact here.

## Critical Rules

- **Streaming and non-streaming are paired.** Any change to `streamText` must be checked against `generateText` (and `streamObject` against `generateObject`). Both paths share `prepareExecution`, guardrails (`createGuardrailPipeline`), tool execution, telemetry, and memory persistence.
- **Trace the full call flow before localized edits.** Order: input middleware → input guardrails → `prepareExecution` → AI SDK call (with LLM retries) → output middleware → output guardrails → memory persist → return.
- **Preserve abort/cancellation and retry semantics.** Honor `options.abortSignal`, throw `AbortError` from `errors/abort-error.ts` on cancel, and keep `onRetry` firing for both `source: "llm"` and `source: "middleware"` retries.
- **Telemetry attributes must be safe and bounded.** Use `safeStringify` for structured values; never set raw user content, secrets, or unbounded collections as attributes.
- **New hooks must thread through both paths.** Add to `hooks/index.ts`, fire from both streaming and non-streaming code, and cover with tests in both modes.
- **Public option/result types are stable.** `GenerateTextOptions`, `StreamTextOptions`, `GenerateObjectOptions`, `StreamObjectOptions`, `AgentHooks`, `AgentOperationOutput` — changes need an explicit API task and a changeset.

## Execution Paths

All four methods share the same pipeline; streaming returns iterables, generate awaits the full result.

- `generateText` — awaits full response; tool loop runs synchronously
- `streamText` — returns iterables (`textStream`, `fullStream`, `toUIMessageStream`); guardrails composed via `createGuardrailPipeline` from `streaming/guardrail-stream.ts`
- `generateObject<T>` — schema-validated structured output
- `streamObject<T>` — streams partial object state

Hook order (both modes): `onStart` → `onPrepareMessages` → `onPrepareModelMessages` → `onToolStart` / `onToolEnd` (per call) → `onStepFinish` (per LLM step) → `onRetry` (on retry) → `onEnd` / `onError`.

## Hooks

Defined in `hooks/index.ts`. Public `AgentHooks` shape — each receives a single args object; some can return overrides:

- `onStart` — execution begins
- `onPrepareMessages` — before LLM gets messages; can return `{ messages? }` to override
- `onPrepareModelMessages` — after UI→Model conversion; can return `{ modelMessages? }` to override
- `onToolStart` / `onToolEnd` — around each tool call; `onToolEnd` can return `{ output? }` to replace
- `onToolError` — tool throws; can return `{ output? }` to replace error payload
- `onStepFinish` — fires per LLM step (one or more per generation; useful for tracing/usage tracking)
- `onRetry` — LLM or middleware retry
- `onFallback` — fallback model invoked
- `onHandoff` / `onHandoffComplete` — subagent delegation; can `bail(result?)` to skip the supervisor
- `onEnd` / `onError` — execution completes or throws

```ts
import { createHooks } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";

const hooks = createHooks({
  onToolStart: async ({ tool, args }) => logger.info(`[${tool.name}]`, safeStringify(args)),
  onToolEnd: async ({ tool, output }) => logger.info(`[${tool.name}] →`, safeStringify(output)),
});
```

## Tools, Memory, Subagents, Guardrails

- **Tools** registered via `options.tools: (Tool | Toolkit)[]` (standalone tools and toolkits both accepted). Lookup and schema validation live in `src/tool/manager/`; execution wrap and span creation (`tool.execution:<name>`) live in `agent.ts`. Optional `toolRouting` injects `searchTools` / `callTool` meta-tools.
- **Memory** persistence is async and non-blocking. `ConversationBuffer` accumulates UI messages during the request; `memory-persist-queue.ts` flushes to `Memory` (`mode: "step"` default, `debounceMs` configurable). See [`../memory/AGENTS.md`](../memory/AGENTS.md).
- **Subagents** declared in `options.subAgents`. The supervisor gets a single shared `delegate_task` tool (defined in `subagent/index.ts`); results are wrapped in OTel spans with parent/child link. Renaming `delegate_task` is a breaking wire change.
- **Guardrails**: input guardrails throw or return transformed input; output guardrails return `{ ok: true | false, reason? }` and may trigger middleware retry. Output guardrails for streams must implement `streamHandler` for chunked processing.

## Telemetry

Set attributes via `span.setAttribute(key, safeStringify(value))`. Span name conventions:

- **Root agent span** is the agent's own `name` (constructed in `AgentTraceContext`, see `open-telemetry/trace-context.ts`). Subagent spans are prefixed `subagent:<name>`.
- **Tool spans**: `tool.execution:<tool.name>` (`agent.ts` createChildSpan call). Downstream exporters parse this prefix.
- **Workflow step spans** (when triggered from a workflow): `workflow.step.<stepType>` (note: step _type_, not step ID).
- `agent.state` attribute values: `"running"`, `"completed"`, `"cancelled"`. There is also `agent.stateSnapshot` (full state dump via `safeStringify`).

Avoid: raw conversation content, secrets, high-cardinality user IDs, unbounded collections.

## Boundaries

**Allowed without asking**

- Adding focused `*.spec.ts` near a behavior change.
- Internal refactors that preserve exported types.
- New tests for guardrails / tools / streaming.

**Ask first**

- Adding a new hook (must thread through all four methods + tests).
- Changing public option/result types.
- Modifying telemetry attribute keys (downstream consumers parse these).
- Changing memory persistence defaults (`mode`, `debounceMs`).

**Never without explicit ask**

- Changing retry/abort semantics.
- Removing `safeStringify` from telemetry.
- Swallowing errors that previously surfaced.

## Tests

- Broad coverage: `agent.spec.ts` (5k+ lines). Prefer smaller neighboring specs when the behavior has a dedicated file.
- Type inference: `agent.spec-d.ts`.
- Focused: `guardrail.spec.ts`, `conversation-buffer.spec.ts`, `memory-persist-queue.spec.ts`, `memory-persistence.integration.spec.ts`, `agent-observability.spec.ts`, `streaming/guardrail-stream.spec.ts`.

```bash
pnpm --dir packages/core test:single -- src/agent/agent.spec.ts
pnpm --dir packages/core typecheck
```

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
