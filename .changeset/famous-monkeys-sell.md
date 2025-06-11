---
"@voltagent/supabase": patch
---

fix: Enhanced fresh installation detection and migration reliability

This release significantly improves the fresh installation experience and migration system reliability for SupabaseMemory. These changes ensure cleaner setups, prevent unnecessary migration attempts, and resolve PostgreSQL compatibility issues.

### Fresh Installation Experience

The system now properly detects fresh installations and skips migrations when no data exists to migrate. This eliminates confusing migration warnings during initial setup and improves startup performance.

```typescript
// Fresh installation now automatically:
// ✅ Detects empty database
// ✅ Skips unnecessary migrations
// ✅ Sets migration flags to prevent future runs
// ✅ Shows clean SQL setup instructions

const storage = new SupabaseMemory({
  supabaseUrl: "your-url",
  supabaseKey: "your-key",
});
// No more migration warnings on fresh installs!
```

### Migration System Improvements

- **Fixed PostgreSQL syntax error**: Resolved `level TEXT DEFAULT "INFO"` syntax issue by using single quotes for string literals
- **Enhanced migration flag detection**: Improved handling of multiple migration flags without causing "multiple rows returned" errors
- **Better error differentiation**: System now correctly distinguishes between "table missing" and "multiple records" scenarios
- **Automatic flag management**: Fresh installations automatically set migration flags to prevent duplicate runs

### Database Setup

The fresh installation SQL now includes migration flags table creation, ensuring future application restarts won't trigger unnecessary migrations:

```sql
-- Migration flags are now automatically created
CREATE TABLE IF NOT EXISTS voltagent_memory_conversations_migration_flags (
    id SERIAL PRIMARY KEY,
    migration_type TEXT NOT NULL UNIQUE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    migrated_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);
```

**Migration Notes:**

- Existing installations will benefit from improved migration flag detection
- Fresh installations will have a cleaner, faster setup experience
- PostgreSQL syntax errors in timeline events table creation are resolved
- No action required - improvements are automatic
