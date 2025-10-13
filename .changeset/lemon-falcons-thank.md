---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
---

## What Changed

Removed automatic message pruning functionality from all storage adapters (PostgreSQL, Supabase, LibSQL, and InMemory). Previously, messages were automatically deleted when the count exceeded `storageLimit` (default: 100 messages per conversation).

## Why This Change

Users reported unexpected data loss when their conversation history exceeded the storage limit. Many users expect their conversation history to be preserved indefinitely rather than automatically deleted. This change gives users full control over their data retention policies.

## Migration Guide

### Before

```ts
const memory = new Memory({
  storage: new PostgreSQLMemoryAdapter({
    connection: process.env.DATABASE_URL,
    storageLimit: 200, // Messages auto-deleted after 200
  }),
});
```

### After

```ts
const memory = new Memory({
  storage: new PostgreSQLMemoryAdapter({
    connection: process.env.DATABASE_URL,
    // No storageLimit - all messages preserved
  }),
});
```

### If You Need Message Cleanup

Implement your own cleanup logic using the `clearMessages()` method:

```ts
// Clear all messages for a conversation
await memory.clearMessages(userId, conversationId);

// Clear all messages for a user
await memory.clearMessages(userId);
```

## Affected Packages

- `@voltagent/core` - Removed `storageLimit` from types
- `@voltagent/postgres` - Removed from PostgreSQL adapter
- `@voltagent/supabase` - Removed from Supabase adapter
- `@voltagent/libsql` - Removed from LibSQL adapter

## Impact

- ✅ No more unexpected data loss
- ✅ Users have full control over message retention
- ⚠️ Databases may grow larger over time (consider implementing manual cleanup)
- ⚠️ Breaking change: `storageLimit` parameter no longer accepted
