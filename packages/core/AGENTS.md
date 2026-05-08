# @voltagent/core

`packages/core` is the primary runtime package. Changes here often affect agents, workflows, memory, tools, observability, server packages, examples, and docs.

## Local Rules

- Do not use `console.log` in core source. Root Biome config treats console logging as an error under `packages/core`.
- Prefer existing managers, registries, context keys, and helper utilities before adding new global state.
- Keep public exports intentional. User-facing APIs usually need updates in `src/index.ts` and sometimes package `exports`.
- Preserve both runtime behavior and type-level behavior. Add `.spec-d.ts` coverage when changing public generics or inference.
- Use `safeStringify` for production serialization and telemetry attributes.
- Do not hand-edit generated registry files under `src/registries`; run `pnpm --dir packages/core generate:model-registry`.

## Validation

Use the narrowest command that covers your change:

```bash
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
pnpm --dir packages/core build
pnpm --dir packages/core test:single -- src/path/to/file.spec.ts
```

Run broader root validation when core changes affect other packages.

## High-Risk Areas

- `src/agent`: model calls, streaming, tool execution, memory, guardrails, subagents, retries, and telemetry are tightly coupled.
- `src/workflow`: suspend/resume, step IDs, hooks, time travel, streaming, usage tracking, and type inference must stay consistent.
- `src/memory`: shared storage/vector/embedding contracts affect external adapters.
- `src/workspace`: filesystem, sandbox, search, skills, timeouts, and tool policy can affect local execution safety.
- `src/voltops`: remote API clients, prompt management, and action clients must preserve wire compatibility.
