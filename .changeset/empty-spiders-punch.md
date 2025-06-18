---
"@voltagent/supabase": patch
---

feat(supabase): Implement storage limit

- BEFORE:

  ```
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const memory = new SupabaseMemory({
  client: supabaseClient,
  tableName: "voltagent_memory", // Optional
  });

  ```

- AFTER:

  ```
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const memory = new SupabaseMemory({
  client: supabaseClient,
  tableName: "voltagent_memory", // Optional
  storageLimit: 150, // Optional: Custom storage limit
  debug: false, // Optional: Debug logging
  });


  ```

Fixes: [#256](https://github.com/VoltAgent/voltagent/issues/254)
