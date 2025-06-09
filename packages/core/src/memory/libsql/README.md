# Enhanced LibSQL Storage - User-Centric Conversations

This document describes the enhanced LibSQL storage implementation that adds user-centric conversation management to VoltAgent, similar to ChatGPT's conversation sidebar.

## Key Features

- **User-specific conversations**: Each conversation is now associated with a user ID
- **Automatic migration**: Seamlessly upgrades existing databases to the new schema
- **Query builder pattern**: Fluent interface for building complex queries
- **Pagination support**: Built-in pagination for large conversation lists
- **Backward compatibility**: Existing code continues to work with minimal changes

## Schema Changes

### Before (Old Schema)

```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Messages table
CREATE TABLE messages (
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, conversation_id, message_id)
);
```

### After (New Schema)

```sql
-- Conversations table (with user_id added)
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  user_id TEXT NOT NULL,        -- NEW: Associates conversation with user
  title TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Messages table (user_id removed, simpler primary key)
CREATE TABLE messages (
  conversation_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, message_id)  -- Simplified primary key
);
```

## Usage Examples

### Basic Setup

```typescript
import { LibSQLStorage } from "@voltagent/core/memory";

const memoryStorage = new LibSQLStorage({
  url: process.env.DATABASE_URL || "file:.voltagent/memory.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
```

### Get User Conversations (ChatGPT-style sidebar)

```typescript
// Get all conversations for a user
const conversations = await memoryStorage.getConversationsByUserId("user123");

// Get recent conversations with limit
const recentConversations = await memoryStorage.getConversationsByUserId("user123", {
  limit: 20,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Get conversations for specific agent/resource
const agentConversations = await memoryStorage.getConversationsByUserId("user123", {
  resourceId: "agent-456",
  limit: 50,
});
```

### Get Conversation Messages

```typescript
// Get all messages for a conversation
const messages = await memoryStorage.getConversationMessages("conversation-id");

// Get recent messages with pagination
const recentMessages = await memoryStorage.getConversationMessages("conversation-id", {
  limit: 50,
  offset: 0,
});
```

### Query Builder Pattern (Fluent Interface)

```typescript
// Simple query
const conversations = await memoryStorage.getUserConversations("user123").limit(10).execute();

// Complex query with ordering
const orderedConversations = await memoryStorage
  .getUserConversations("user123")
  .orderBy("updated_at", "DESC")
  .limit(25)
  .execute();

// Default query (no chaining)
const allConversations = await memoryStorage.getUserConversations("user123").execute();
```

### Pagination

```typescript
// Get first page of conversations
const page1 = await memoryStorage.getPaginatedUserConversations("user123", 1, 10);

console.log(page1.conversations); // Array of 10 conversations
console.log(page1.hasMore); // true if more pages exist
console.log(page1.page); // 1
console.log(page1.pageSize); // 10

// Get next page
if (page1.hasMore) {
  const page2 = await memoryStorage.getPaginatedUserConversations("user123", 2, 10);
}
```

### Advanced Queries

```typescript
// Query conversations with multiple filters
const filteredConversations = await memoryStorage.queryConversations({
  userId: "user123",
  resourceId: "agent-456",
  limit: 20,
  orderBy: "created_at",
  orderDirection: "ASC",
});

// Get user-specific conversation (with ownership validation)
const conversation = await memoryStorage.getUserConversation("conv-123", "user123");
// Returns null if conversation doesn't exist or doesn't belong to user
```

### Creating Conversations

```typescript
// Create a new conversation
const conversation = await memoryStorage.createConversation({
  id: "conv-" + Date.now(),
  resourceId: "agent-456",
  userId: "user123",
  title: "New Chat Session",
  metadata: {
    source: "web",
    theme: "dark",
    language: "en",
  },
});
```

### Adding Messages

```typescript
// Add message to conversation (userId no longer needed in messages table)
await memoryStorage.addMessage(
  {
    id: "msg-" + Date.now(),
    role: "user",
    content: "Hello, how can you help me?",
    type: "text",
    createdAt: new Date().toISOString(),
  },
  "user123",
  "conversation-id"
);
```

## Migration

The storage automatically handles migration when initialized. The migration process:

1. **Creates backups** of existing tables
2. **Checks current schema** to determine if migration is needed
3. **Migrates data** while preserving all existing records
4. **Updates indexes** for optimal performance
5. **Validates migration** and can rollback if needed

### Manual Migration Control

```typescript
// Initialize without automatic migration
const storage = new LibSQLStorage({
  url: "file:memory.db",
  // Migration happens automatically in initializeDatabase()
});

// Manual migration control (if needed for custom scenarios)
const migrationResult = await storage.migrateConversationSchema({
  createBackup: true,
  restoreFromBackup: false, // Set to true to restore from backup
  deleteBackupAfterSuccess: false,
});

console.log(migrationResult.success); // true/false
console.log(migrationResult.migratedCount); // Number of records migrated
console.log(migrationResult.backupCreated); // Whether backup was created
```

## Error Handling

```typescript
try {
  const conversations = await memoryStorage.getConversationsByUserId("user123");
} catch (error) {
  console.error("Failed to fetch conversations:", error);
  // Handle error appropriately
}
```

## Performance Considerations

- **Indexes**: The new schema includes optimized indexes for user_id and conversation_id lookups
- **Pagination**: Use pagination for large conversation lists to improve performance
- **Limits**: Set reasonable limits on query results to avoid memory issues
- **Connection pooling**: Consider connection pooling for high-traffic applications

## Backward Compatibility

Existing code using the old API continues to work:

```typescript
// This still works
const conversations = await memoryStorage.getConversations("resource-id");

// This still works
const messages = await memoryStorage.getMessages({
  userId: "user123",
  conversationId: "conv-123",
});
```

The main difference is that new conversations must include a `userId` field when created.
