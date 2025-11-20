---
"@voltagent/core": patch
---

feat: pass complete ToolExecuteOptions to retriever.retrieve() method

## The Problem

Previously, `createRetrieverTool` only passed `context` and `logger` from `ToolExecuteOptions` to the retriever's `retrieve()` method. This prevented retrievers from accessing important operation metadata like:

- `userId` - for user-specific filtering
- `conversationId` - for conversation-aware retrieval
- `operationId` - for tracking
- Other `OperationContext` fields

This limitation meant retrievers could only provide public knowledge and couldn't implement:

- Multi-tenant retrieval with user-specific namespaces
- Private knowledge bases per user
- User-filtered database queries
- Context-aware retrieval strategies

## The Solution

**Core Changes:**

- Updated `RetrieveOptions` interface to extend `Partial<OperationContext>`, providing access to all operation metadata
- Modified `createRetrieverTool` to pass the complete `options` object to `retriever.retrieve()` instead of just `{ context, logger }`
- Maintained full backward compatibility - all existing retrievers continue to work without changes

**What's Now Available in retrieve() method:**

```typescript
class UserSpecificRetriever extends BaseRetriever {
  async retrieve(input, options) {
    // Access operation context
    const { userId, conversationId, logger } = options;

    // User-specific filtering
    const results = await db.query("SELECT * FROM documents WHERE user_id = $1", [userId]);

    return results;
  }
}
```

## Impact

- **Multi-tenant Support:** Retrievers can now filter by user using different namespaces, indexes, or database filters
- **Private Knowledge:** Support for user-specific knowledge bases and personalized retrieval
- **Better Context:** Access to conversation and operation metadata for smarter retrieval
- **Backward Compatible:** Existing retrievers work without any code changes

## Usage Examples

### User-Specific Vector Search

```typescript
class MultiTenantRetriever extends BaseRetriever {
  async retrieve(input, options) {
    const query = typeof input === "string" ? input : input[input.length - 1].content;
    const { userId } = options;

    // Use user-specific namespace in Pinecone
    const results = await this.pinecone.query({
      vector: await this.embed(query),
      namespace: `user-${userId}`,
      topK: 5,
    });

    return results.matches.map((m) => m.metadata.text).join("\n\n");
  }
}

// Use with userId
const response = await agent.generateText("Find my documents", {
  userId: "user-123",
});
```

### Conversation-Aware Retrieval

```typescript
class ConversationRetriever extends BaseRetriever {
  async retrieve(input, options) {
    const { conversationId, userId } = options;

    // Retrieve documents relevant to this conversation
    const results = await db.query(
      "SELECT * FROM documents WHERE user_id = $1 AND conversation_id = $2",
      [userId, conversationId]
    );

    return results.map((r) => r.content).join("\n\n");
  }
}
```

## Migration Guide

No migration needed! Existing retrievers automatically receive the full `options` object and can access new fields when ready:

```typescript
// Before (still works)
async retrieve(input, options) {
  const { context, logger } = options;
  // ...
}

// After (now possible)
async retrieve(input, options) {
  const { context, logger, userId, conversationId } = options;
  // Can now use userId and conversationId
}
```
