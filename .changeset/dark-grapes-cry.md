---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
---

feat: expose createdAt in memory.getMessages

## What Changed

The `createdAt` timestamp is now exposed in the `metadata` object of messages retrieved via `memory.getMessages()`. This ensures that the creation time of messages is accessible across all storage adapters (`InMemory`, `Supabase`, `LibSQL`, `PostgreSQL`).

## Usage

You can now access the `createdAt` timestamp from the message metadata:

```typescript
const messages = await memory.getMessages(userId, conversationId);

messages.forEach((message) => {
  console.log(`Message ID: ${message.id}`);
  console.log(`Created At: ${message.metadata?.createdAt}`);
});
```

This change aligns the behavior of all storage adapters and ensures consistent access to message timestamps.
