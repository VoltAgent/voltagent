---
"@voltagent/supabase": patch
---

fix: resolve SupabaseClient ESM import error

Fixed an issue where `SupabaseClient` was not available as a runtime export in the ESM build of @supabase/supabase-js v2.54.0. The type is exported in TypeScript definitions but not in the actual ESM runtime.

## What Changed

- Changed `SupabaseClient` to a type-only import using `import { type SupabaseClient }`
- Replaced `P.instanceOf(SupabaseClient)` pattern matching with `P.not(P.nullish)` since the class is not available at runtime
- Added type assertion to maintain TypeScript type safety

## Before

```typescript
import { SupabaseClient, createClient } from "@supabase/supabase-js";
// ...
.with({ client: P.instanceOf(SupabaseClient) }, (o) => o.client)
```

## After

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// ...
.with({ client: P.not(P.nullish) }, (o) => o.client as SupabaseClient)
```

This ensures compatibility with both CommonJS and ESM module systems while maintaining full type safety.
