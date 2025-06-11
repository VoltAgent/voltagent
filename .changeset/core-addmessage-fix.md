---
"@voltagent/core": patch
---

fix: Remove userId parameter from addMessage method

Simplified the `addMessage` method signature by removing the `userId` parameter. This change makes the API cleaner and more consistent with the conversation-based approach where user context is handled at the conversation level.

### Changes

- **Removed**: `userId` parameter from `addMessage` method
- **Before**: `addMessage(message: MemoryMessage, userId: string, conversationId: string)`
- **After**: `addMessage(message: MemoryMessage, conversationId: string)`

### Migration Guide

If you were calling `addMessage` with a `userId` parameter, simply remove it:

```typescript
// Before
await memory.addMessage(message, conversationId, userId);

// After
await memory.addMessage(message, conversationId);
```

### Rationale

User context is now properly managed at the conversation level, making the API more intuitive and reducing parameter complexity. The user association is handled through the conversation's `userId` property instead of requiring it on every message operation.

**Breaking Change:**

This is a minor breaking change. Update your `addMessage` calls to remove the `userId` parameter.
