---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/core": patch
---

fix: validate UI/response messages and keep streaming response message IDs consistent across UI streams - #1010
fix(postgres/supabase): upsert conversation messages by (conversation_id, message_id) to avoid duplicate insert failures
