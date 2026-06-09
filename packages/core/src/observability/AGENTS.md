# Core Observability

Owns OpenTelemetry trace context, span helpers, attribute key conventions, span/log processors, and storage adapters. Span names and attribute keys here are **wire contracts** consumed by every other subsystem and by the external exporter packages (`langfuse-exporter`, `vercel-ai-exporter`).

## Critical Rules

- **`safeStringify` for all structured attributes.** Import from `@voltagent/internal`. Attribute values must be scalars or pre-serialized strings.
- **No raw user content, secrets, or PII in attributes.** Conversation/user IDs are allowed (lookup keys); raw messages, emails, API keys, file contents are not.
- **Span names are wire contracts.** The agent root span uses the agent's own `name` (set by `AgentTraceContext`). Tool spans are `tool.execution:<tool.name>`. Workflow step spans are `workflow.step.<stepType>`. These are parsed by exporters and dashboards — renaming breaks production.
- **Attribute keys follow `<subsystem>.<entity>.<field>` namespace.** Examples: `agent.state`, `workflow.step.index`, `tool.name`, `model.name`, `vector.operation`. Don't introduce new top-level subsystem namespaces without coordination.
- **Low cardinality only.** Fixed enums and bounded counters are safe. Avoid unbounded arrays, dynamic tag generation, or repeated user inputs as attribute values.
- **Context propagation must be explicit.** `AgentTraceContext` and `WorkflowTraceContext` carry parent/child links and inherited attributes across async boundaries. Don't break the propagation chain.
- **Sampling, batching, and export defaults are production-critical.** Coordinate any changes — they ripple to serverless and node runtimes.

## Span Attribute Reference

**Entity & context** — `entity.id`, `entity.type` (`"agent"` \| `"workflow"`), `entity.name`, `user.id`, `conversation.id`, `operation.id` (unique per invocation).

**Agent** — root span name = the agent's own `name`. Subagents are prefixed `subagent:<name>`. Attributes: `agent.state` (`"running"` / `"completed"` / `"cancelled"`), `agent.stateSnapshot` (full state via `safeStringify`).

**Workflow** — span name: `workflow.step.<stepType>` (the step _type_, not the step ID). Attributes: `workflow.execution.id`, `workflow.step.index`, `workflow.step.type`, `workflow.step.name`, `workflow.replayed` (bool), `workflow.replay.source_*`.

**Tool** — span name: `tool.execution:<tool.name>`. Attribute: `tool.name`. (Additional tool attributes are not currently set automatically — if you add input/output, route through `safeStringify` and treat the keys as new wire contracts.)

**Model & usage** — `model.name`; counters `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`.

**Vector / memory** — `vector.operation`, `vector.query`, `vector.adapter`, `vector.results_count`.

**Workspace** — `workspace.fs.path`, `workspace.fs.bytes`, `workspace.sandbox.exit_code`, `workspace.search.mode`, `workspace.search.top_k`, `workspace.search.results`.

**Generic I/O fallback** — `input`, `output` (Langfuse exporter looks for these; safe if `safeStringify`'d).

## Code Examples

```ts
// Good — bounded scalars + safeStringify for structured values
import { safeStringify } from "@voltagent/internal";
import { SpanStatusCode } from "@opentelemetry/api";

span.setAttributes({
  "entity.id": agentId, // scalar
  "entity.type": "agent", // fixed enum
  "usage.prompt_tokens": 150, // counter
  "agent.state": "running", // fixed enum: running | completed | cancelled
  input: safeStringify(messagesArray), // structured → string
  metadata: safeStringify({ retries: 2 }),
});
span.setStatus({ code: SpanStatusCode.OK });
span.end();

// Bad — raw JSON.stringify in production telemetry
span.setAttribute("input", JSON.stringify(messages));

// Bad — PII / secrets / unbounded values
span.setAttribute("email", user.email);
span.setAttribute("api_key", SECRET_KEY);
span.setAttribute("conversation", userInput); // raw, unbounded
span.setAttribute("session_ids", userIds); // unbounded array
```

## Boundaries

**Allowed without asking**

- Adding span helpers for a new subsystem.
- Adding new workspace attributes if documented in `types.ts`.
- Internal refactors to processors / storage adapters that preserve span output.
- New tests for sampling / filtering / export.

**Ask first**

- Renaming any span name (e.g., `tool.execution:<name>` → something else).
- Adding / removing / renaming top-level attribute namespaces (`agent.*`, `tool.*`, `workflow.*`, `model.*`).
- Changing `SpanAttributes` interface in `types.ts`.
- Modifying `OperationContext` shape (defined in `agent/types.ts`, consumed by every subsystem).
- Changing default sampling / batch size / export timeout.

**Never without explicit ask**

- Removing `safeStringify` from production telemetry paths.
- Hardcoding secrets / raw conversation / unbounded collections into attributes.
- Disabling span filtering or exporter integration without a migration plan.

## Tests

```bash
pnpm --dir packages/core test:single -- src/observability/processors/span-filter-processor.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- Telemetry exporters: `packages/langfuse-exporter`, `packages/vercel-ai-exporter`
- External: [OTel semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
