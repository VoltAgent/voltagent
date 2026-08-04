---
"@voltagent/core": patch
"@voltagent/cloudflare-d1": patch
"@voltagent/libsql": patch
"@voltagent/postgres": patch
"@voltagent/server-core": patch
"@voltagent/supabase": patch
"@voltagent/voltagent-memory": patch
---

Harden guarded memory conversation mutations by preserving ownership checks across vector cleanup, D1 deletes, and managed-memory remote mutations. Raise adapter peer dependency minimums to require the core release that exports ownership mismatch errors.
