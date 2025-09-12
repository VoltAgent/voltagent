---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/docs-mcp": patch
"@voltagent/core": patch
---

chore: align Zod to ^3.25.76 and fix type mismatch with AI SDK

We aligned Zod versions across packages to `^3.25.76` to match AI SDK peer ranges and avoid multiple Zod instances at runtime.

Why this matters

- Fixes TypeScript narrowing issues in workflows when consuming `@voltagent/core` from npm with a different Zod instance (e.g., `ai` packages pulling newer Zod).
- Prevents errors like "Spread types may only be created from object types" where `data` failed to narrow because `z.ZodTypeAny` checks saw different Zod identities.

What changed

- `@voltagent/server-core`, `@voltagent/server-hono`: dependencies.zod → `^3.25.76`.
- `@voltagent/docs-mcp`, `@voltagent/core`: devDependencies.zod → `^3.25.76`.
- Examples and templates updated to use `^3.25.76` for consistency (non-publishable).

Notes for consumers

- Ensure a single Zod version is installed (consider a workspace override to pin Zod to `3.25.76`).
- This improves compatibility with `ai@5.x` packages that require `zod@^3.25.76 || ^4`.
