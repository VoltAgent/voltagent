# Core Workspace

This directory owns workspace filesystem access, sandbox execution, search, skills, timeouts, and tool policy.

## Local Rules

- Treat filesystem and sandbox behavior as security-sensitive. Preserve path normalization, timeout handling, and tool-policy checks.
- Keep local filesystem behavior and sandbox behavior aligned where they expose the same workspace capability.
- Avoid broadening file access, command execution, or skill loading without explicit tests.
- Search behavior should remain deterministic and should not require network access.
- Preserve public workspace types and toolkit behavior used by agents.

## Tests

Prefer targeted tests for filesystem, sandbox, search, skills, timeout, or policy changes:

```bash
pnpm --dir packages/core test:single -- src/workspace/path-to-test.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```
