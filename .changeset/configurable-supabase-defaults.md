---
"@voltagent/internal": minor
"@voltagent/supabase": patch
---

Add `@voltagent/internal/config` with helpers to resolve configurable defaults (explicit option > environment variable > default value) and adopt them in `@voltagent/supabase`: the memory adapter defaults (`tableName`, `debug`, logger name) now live in a package-level `defaults.ts` and `tableName`/`debug` can be overridden via the `VOLTAGENT_SUPABASE_TABLE_NAME` and `VOLTAGENT_SUPABASE_DEBUG` environment variables.
