---
"@voltagent/vercel-ai": patch
"@voltagent/docs-mcp": patch
"@voltagent/core": patch
---

fix: resolve TypeScript performance issues by fixing Zod dependency configuration (#377)

Moved Zod from direct dependencies to peer dependencies in @voltagent/vercel-ai to prevent duplicate Zod installations that were causing TypeScript server slowdowns. Also standardized Zod versions across the workspace to ensure consistency.

Changes:

- @voltagent/vercel-ai: Moved `zod` from dependencies to peerDependencies
- @voltagent/docs-mcp: Updated `zod` from `^3.23.8` to `3.24.2`
- @voltagent/with-postgres: Updated `zod` from `^3.24.2` to `3.24.2` (removed caret)

This fix significantly improves TypeScript language server performance by ensuring only one Zod version is processed, eliminating the "Type instantiation is excessively deep and possibly infinite" errors that users were experiencing.
