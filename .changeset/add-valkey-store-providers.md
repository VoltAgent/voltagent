---
"@voltagent/a2a-server": minor
"@voltagent/resumable-streams": minor
---

feat: add Valkey-backed TaskStore and ResumableStreamStore providers

Adds `ValkeyTaskStore` to `@voltagent/a2a-server` and `createResumableStreamValkeyStore` to
`@voltagent/resumable-streams`, enabling distributed persistence via the `@valkey/valkey-glide`
client library. Both stores support configurable key prefixes, optional TTL-based expiration, and
standalone or cluster Valkey deployments. The `@valkey/valkey-glide` peer dependency is optional so
consumers who don't use Valkey are unaffected.

**Breaking change in `@voltagent/a2a-server`:** `A2AServerConfig` now accepts an optional
`taskStore` property. When provided, it takes precedence over the `deps.taskStore` argument passed
to `A2AServer.initialize()`. The full precedence chain is:
`config.taskStore` > `deps.taskStore` > `InMemoryTaskStore`. A debug-level log is emitted when
`config.taskStore` overrides a non-null `deps.taskStore`.
