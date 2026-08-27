---
"@voltagent/internal": minor
"@voltagent/supabase": patch
---

Add `@voltagent/internal/config` with helpers to resolve configurable defaults (explicit option > environment variable > default value) and adopt them in `@voltagent/supabase`: the memory adapter defaults (`tableName`, `debug`, logger name) now live in a package-level `defaults.ts` and `tableName`/`debug` can be overridden via the `VOLTAGENT_SUPABASE_TABLE_NAME` and `VOLTAGENT_SUPABASE_DEBUG` environment variables.

Note: `@voltagent/supabase` now imports `@voltagent/internal/config`, which first ships in `@voltagent/internal@1.1.0`. The monorepo declares internal dependencies with semver ranges (not `workspace:*`), and `changeset version` (`updateInternalDependencies: "patch"`) automatically raises dependents' ranges to `^1.1.0` when this minor release is versioned — verified locally — so the published `@voltagent/supabase` will require the internal version that contains the new subpath export.
