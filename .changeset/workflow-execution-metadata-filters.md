---
"@voltagent/core": patch
"@voltagent/server-core": patch
"@voltagent/libsql": patch
"@voltagent/cloudflare-d1": patch
---

Fix workflow execution filtering by persisted metadata across adapters.

- Persist `options.metadata` on workflow execution state so `/workflows/executions` filters can match tenant/user metadata.
- Preserve existing execution metadata when updating cancelled/error workflow states.
- Accept `options.metadata` in server workflow execution request schema.
- Fix LibSQL and Cloudflare D1 JSON metadata query comparisons for `metadata` and `metadata.<key>` filters.
