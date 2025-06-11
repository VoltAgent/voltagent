---
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/core": patch
---

This release introduces powerful new methods for managing conversations with user-specific access control and improved developer experience.

### Simple Usage Example

```typescript
// Get all conversations for a user
const conversations = await storage.getUserConversations("user-123").limit(10).execute();

console.log(conversations);

// Get first conversation and its messages
const conversation = conversations[0];
if (conversation) {
  const messages = await storage.getConversationMessages(conversation.id);
  console.log(messages);
}
```

### Pagination Support

```typescript
// Get paginated conversations
const result = await storage.getPaginatedUserConversations("user-123", 1, 20);
console.log(result.conversations); // Array of conversations
console.log(result.hasMore); // Boolean indicating if more pages exist
```
