---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/core": patch
---

The `error` column has been deprecated and replaced with `statusMessage` column for better consistency and clearer messaging. The old `error` column is still supported for backward compatibility but will be removed in a future major version.

Changes:

- Deprecated `error` column (still functional)
- Improved error handling and status reporting
