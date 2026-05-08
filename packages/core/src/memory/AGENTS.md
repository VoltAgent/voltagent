# Core Memory

This directory defines shared memory types, manager behavior, semantic search, working memory, and adapter contracts.

## Local Rules

- Preserve `StorageAdapter`, `VectorAdapter`, `EmbeddingAdapter`, conversation, message, working-memory, and workflow-state contracts.
- Shared behavior here should remain compatible with external adapters such as Postgres, LibSQL, Supabase, Cloudflare D1, and managed memory.
- Use `safeStringify` for persisted structured data and logs.
- Be careful with message shape compatibility. Agent persistence, workflow state, server APIs, and examples can depend on these types.
- Keep adapter-neutral logic in core; adapter-specific SQL or platform behavior belongs in adapter packages.

## Tests

- Add shared contract tests when manager behavior changes.
- Add type tests for public memory API inference or type compatibility changes.

Useful commands:

```bash
pnpm --dir packages/core test:single -- src/memory/path-to-test.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```
