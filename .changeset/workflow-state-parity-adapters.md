---
"@voltagent/postgres": patch
"@voltagent/libsql": patch
"@voltagent/supabase": patch
"@voltagent/cloudflare-d1": patch
---

Fix workflow state persistence parity across SQL adapters.

This update persists and returns `input`, `context`, and top-level `workflowState` in workflow state operations. It also ensures suspended workflow state queries include `events`, `output`, and `cancellation`, and adds adapter migrations/column additions where needed.
