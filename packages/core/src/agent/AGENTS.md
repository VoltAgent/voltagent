# Core Agent Runtime

This directory owns the `Agent` runtime and related execution paths.

## Local Rules

- Treat streaming and non-streaming paths as paired behavior. When changing one, check the matching generate/stream and text/object paths.
- Tool execution, memory persistence, guardrails, subagents, retries, hooks, and telemetry all interact. Trace the full call flow before making localized edits.
- Preserve abort/cancellation behavior and retry semantics.
- Keep OpenTelemetry attributes useful but avoid sensitive or high-cardinality values. Serialize structured attributes with `safeStringify`.
- Keep public option/result types stable unless the task is explicitly an API change.

## Tests

- Add focused regression tests near the behavior changed.
- Use `.spec-d.ts` tests for public type inference or generic changes.
- Existing broad coverage lives in `agent.spec.ts`; prefer smaller neighboring specs when the behavior has a dedicated file.

Useful commands:

```bash
pnpm --dir packages/core test:single -- src/agent/path-to-test.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```
