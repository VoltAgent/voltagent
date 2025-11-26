---
"@voltagent/core": patch
---

fix: pass complete OperationContext to retrievers when used as object instances

## The Problem

When a retriever was assigned directly to an agent as an object instance (e.g., `retriever: myRetriever`), it wasn't receiving the `userId` and `conversationId` from the OperationContext. This prevented user-specific and conversation-aware retrieval when retrievers were used in this way, even though these fields were correctly passed when retrievers were used as tools.

## The Solution

Updated the `getRetrieverContext` method in the Agent class to pass the complete OperationContext to retrievers, ensuring consistency between tool-based and object-based retriever usage.

## What Changed

```typescript
// Before - only partial context was passed
return await this.retriever.retrieve(retrieverInput, {
  context: oc.context,
  logger: retrieverLogger,
});

// After - complete OperationContext is passed
return await this.retriever.retrieve(retrieverInput, {
  ...oc,
  logger: retrieverLogger,
});
```

## Impact

- **Consistent behavior:** Retrievers now receive `userId` and `conversationId` regardless of how they're configured
- **User-specific retrieval:** Enables filtering results by user in multi-tenant scenarios
- **Conversation awareness:** Retrievers can now access conversation context when used as object instances
- **No breaking changes:** This is a backward-compatible fix that adds missing context fields
