---
"@voltagent/cloudflare-d1": patch
"@voltagent/libsql": patch
---

Fix offset-only pagination for conversation and workflow-run queries by adding SQLite's unlimited limit before the offset.
