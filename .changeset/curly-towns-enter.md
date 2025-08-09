---
"@voltagent/supabase": patch
---

feat: Added `logger` to the SupabaseMemory provider and provided improved type safety for the constructor

### New Features

#### `logger`

You can now pass in a `logger` to the SupabaseMemory provider and it will be used to log messages.

```typescript
import { createPinoLogger } from "@voltagent/logger";

const memory = new SupabaseMemory({
  client: supabaseClient,
  logger: createPinoLogger({ name: "memory-supabase" }),
});
```

#### Improved type safety for the constructor

The constructor now has improved type safety for the `client` and `logger` options.

```typescript
const memory = new SupabaseMemory({
  client: supabaseClient,
  supabaseUrl: "https://test.supabase.co", // this will show a TypeScript error
  supabaseKey: "test-key",
});
```

The `client` option also checks that the `client` is an instance of `SupabaseClient`

```typescript
const memory = new SupabaseMemory({
  client: aNonSupabaseClient, // this will show a TypeScript error AND throw an error at runtime
});
```

### Internal Changes

- Cleaned up and reorganized the SupabaseMemory class
- Renamed files to be more descriptive and not in the `index.ts` file
- Added improved mocking to the test implementation for the SupabaseClient
- Removed all `console.*` statements and added a `biome` lint rule to prevent them from being added back
