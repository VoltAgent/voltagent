---
"@voltagent/supabase": patch
---

feat: Introduce Supabase Memory Provider (`@voltagent/supabase`)

This new package provides a persistent memory solution for VoltAgent using Supabase.

**Features:**

- Stores conversation history, agent history entries, events, and steps in your Supabase database.
- Requires specific table setup in your Supabase project (SQL provided in the package README).
- Easy integration by initializing `SupabaseMemory` with your Supabase URL and key and passing it to your `Agent` configuration.

See the `@voltagent/supabase` [README](https://github.com/voltagent/voltagent/blob/main/packages/supabase/README.md) and [Documentation](https://voltagent.dev/docs/agents/memory/supabase/) for detailed setup and usage instructions.

closes #8
