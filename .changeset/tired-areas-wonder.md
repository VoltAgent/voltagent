---
"@voltagent/voltagent-memory": patch
"@voltagent/serverless-hono": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
---

feat: add full conversation step persistence across the stack:

- Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
- LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

fixes: #613
