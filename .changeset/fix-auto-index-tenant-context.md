---
"@voltagent/core": patch
---

fix(core): defer WorkspaceSearch auto-index to support tenant-aware filesystems

Auto-indexing now runs lazily on the first `search()` or `init()` call instead of eagerly in the constructor. This ensures tenant-aware filesystem backends that require `operationContext` (e.g. `conversationId`) receive the context from the caller. If auto-indexing fails (e.g. missing context), subsequent calls with valid context will retry automatically.

Fixes #1252
