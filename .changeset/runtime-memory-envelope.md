---
"@voltagent/core": patch
"@voltagent/server-core": patch
"@voltagent/resumable-streams": patch
---

feat: add runtime memory envelope (`options.memory`) and deprecate legacy top-level memory fields

### What's New

- Added a preferred per-call memory envelope:
  - `options.memory.conversationId` for conversation-scoped memory
  - `options.memory.userId` for user-scoped memory
  - `options.memory.options` for memory behavior overrides (`contextLimit`, `semanticMemory`, `conversationPersistence`)
- Kept legacy top-level fields for backward compatibility:
  - `options.conversationId`, `options.userId`, `options.contextLimit`, `options.semanticMemory`, `options.conversationPersistence`
- Legacy fields are now marked deprecated in type/docs, and envelope values are preferred when both are provided.

### Server and Resumable Stream Alignment

- `@voltagent/server-core` now accepts/documents the `options.memory` envelope in request schemas.
- Resumable stream identity resolution now reads `conversationId`/`userId` from `options.memory` first and falls back to legacy fields.
- Added tests for:
  - parsing `options.memory` in server schemas
  - resolving resumable stream keys from `options.memory`
