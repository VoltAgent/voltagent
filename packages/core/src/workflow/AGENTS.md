# Core Workflow Runtime

This directory owns workflow creation, chaining, execution, streaming, suspension, and step helpers.

## Local Rules

- Preserve suspend/resume behavior, checkpoint state, step IDs, hooks, time travel, cancellation, and usage tracking.
- Runtime behavior and type inference are both part of the API. Changes to chain generics or step typing usually need `.spec-d.ts` coverage.
- New or changed steps under `steps/` need exports from the local step index and, when public, from workflow/core package exports.
- Keep workflow state serializable and backwards-aware. Use `safeStringify` for production serialization.
- Avoid special-casing a step in the core executor if the behavior belongs in a step helper.

## Tests

Use targeted runtime tests for changed behavior and type tests for inference changes:

```bash
pnpm --dir packages/core test:single -- src/workflow/path-to-test.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```
