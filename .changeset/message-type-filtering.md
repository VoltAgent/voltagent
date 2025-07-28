---
"@voltagent/core": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
---

feat: add message type filtering support to memory storage implementations

Added the ability to filter messages by type when retrieving conversation history. This enhancement allows the framework to distinguish between different message types (text, tool-call, tool-result) and retrieve only the desired types, improving context preparation for LLMs.

## Key Changes

- **MessageFilterOptions**: Added optional `types` parameter to filter messages by type
- **prepareConversationContext**: Now filters to only include text messages, excluding tool-call and tool-result messages for cleaner LLM context
- **All storage implementations**: Added database-level filtering for better performance

## Usage

```typescript
// Get only text messages
const textMessages = await memory.getMessages({
  userId: "user-123",
  conversationId: "conv-456",
  types: ["text"],
});

// Get tool-related messages
const toolMessages = await memory.getMessages({
  userId: "user-123",
  conversationId: "conv-456",
  types: ["tool-call", "tool-result"],
});

// Get all messages (default behavior - backward compatible)
const allMessages = await memory.getMessages({
  userId: "user-123",
  conversationId: "conv-456",
});
```

## Implementation Details

- **InMemoryStorage**: Filters messages in memory after retrieval
- **LibSQLStorage**: Adds SQL WHERE clause with IN operator for type filtering
- **PostgreSQL**: Uses parameterized IN clause with proper parameter counting
- **Supabase**: Utilizes query builder's `.in()` method for type filtering

This change ensures that `prepareConversationContext` provides cleaner, more focused context to LLMs by excluding intermediate tool execution details, while maintaining full backward compatibility for existing code.
