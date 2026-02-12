---
"@voltagent/core": patch
---

fix: make workspace toolkit schemas compatible with Zod v4 record handling - #1043

### What Changed

- Updated workspace toolkit input schemas to avoid single-argument `z.record(...)` usage that can fail in Zod v4 JSON schema conversion paths.
- `workspace_sandbox.execute_command` now uses `z.record(z.string(), z.string())` for `env`.
- `workspace_index_content` now uses `z.record(z.string(), z.unknown())` for `metadata`.

### Why

With `@voltagent/core` + `zod@4`, some workspace toolkit flows could fail at runtime with:

`Cannot read properties of undefined (reading '_zod')`

This patch ensures built-in workspace toolkits (such as sandbox and search indexing) work reliably across supported Zod versions.
