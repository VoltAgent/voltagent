---
"@voltagent/cloudflare-d1": patch
"@voltagent/libsql": patch
---

Fix offset-only pagination in the D1 and libSQL memory adapters: queryConversations and queryWorkflowRuns with an offset but no limit now emit `LIMIT -1` before `OFFSET` instead of a statement SQLite rejects with `near "OFFSET": syntax error`.
