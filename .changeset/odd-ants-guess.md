---
"@voltagent/supabase": patch
---

fix: deduplicate conversation step rows before Supabase upsert

`saveConversationSteps` now deduplicates rows by `id` in a batch before calling Supabase `upsert`.

This prevents Postgres errors like `ON CONFLICT DO UPDATE command cannot affect row a second time` when multiple step records with the same `id` are present in one persistence batch, while preserving current last-write-wins behavior.
