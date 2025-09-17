---
title: PostgreSQL Memory
slug: /agents/memory/postgres
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# PostgreSQL Memory

The `@voltagent/postgres` package provides a `PostgreSQLMemoryAdapter` storage adapter for the `Memory` class, using PostgreSQL for persistent conversation storage.

This is ideal for production applications requiring enterprise-grade database storage, complex queries, or integration with existing PostgreSQL infrastructure.

## Setup

### Install Package

First, install the necessary packages:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/postgres
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/postgres
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/postgres
```

  </TabItem>
</Tabs>

### Database Requirements

You need a PostgreSQL server (version 12 or higher recommended). The provider **automatically creates** all necessary tables and indexes when initialized, so no manual SQL setup is required.

### Credentials

You'll need your PostgreSQL connection details:

- **Host:** Your PostgreSQL server hostname
- **Port:** Usually 5432
- **Database:** Database name
- **User:** Database username
- **Password:** Database password

Store these credentials securely, typically as environment variables or use a connection string format.

## Configuration

Import `PostgreSQLMemoryAdapter` and initialize it with your credentials, then pass it to `new Memory({ storage: ... })`:

```typescript
import { Agent, Memory } from "@voltagent/core";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import { openai } from "@ai-sdk/openai";

// Using connection string (recommended)
const storage = new PostgreSQLMemoryAdapter({
  connection: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/mydb",
  // Optional: Adjust connection pool size
  maxConnections: 10,
  // Optional: Specify a custom base table name prefix
  tablePrefix: "voltagent_memory", // Defaults to 'voltagent_memory'
  // Optional: Storage limit (max number of messages per user/conversation)
  storageLimit: 100, // Defaults to 100
});

// Alternative: Using connection object
const storage = new PostgreSQLMemoryAdapter({
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "mydb",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === "production", // Enable SSL for production
  },
  maxConnections: 10,
  tablePrefix: "voltagent_memory",
  storageLimit: 100,
});

const agent = new Agent({
  name: "PostgreSQL Memory Agent",
  instructions: "An agent using PostgreSQL for memory.",
  model: openai("gpt-4o"),
  memory: new Memory({ storage }),
});
```

**Configuration Options:**

- `connection` (string or object, required): Database connection details.
  - **Connection string:** `"postgresql://user:password@host:port/database"`
  - **Connection object:** `{ host, port, database, user, password, ssl }`
- `maxConnections` (number, optional): Maximum connections in the pool. Defaults to `10`.
- `tablePrefix` (string, optional): Prefix for database table names. Defaults to `voltagent_memory`.
- `storageLimit` (number, optional): Maximum messages to retain per conversation. Defaults to `100`.
- `debug` (boolean, optional): Enable debug logging. Defaults to `false`.

## Conversation Management

### Get User's Conversations

```typescript
// Get recent conversations for a user
const conversations = await storage.getConversationsByUserId("user-123", {
  limit: 50,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Display in sidebar like ChatGPT
conversations.forEach((conv) => {
  console.log(`${conv.title} - ${conv.updatedAt}`);
});
```

### Pagination and Sorting

```typescript
// Recent chats with sorting
const recentChats = await storage.queryConversations({
  userId: "user-123",
  limit: 20,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Offset-based pagination
const page1 = await storage.queryConversations({ userId: "user-123", limit: 10, offset: 0 });
const page2 = await storage.queryConversations({ userId: "user-123", limit: 10, offset: 10 });
```

## Querying Conversations

The PostgreSQL storage provides powerful conversation querying capabilities with filtering, pagination, and sorting options:

```typescript
// Query with multiple filters
const workConversations = await storage.queryConversations({
  userId: "user-123",
  resourceId: "work-agent",
  limit: 25,
  offset: 0,
  orderBy: "created_at",
  orderDirection: "DESC",
});

// Get all conversations for a user
const userConversations = await storage.queryConversations({
  userId: "user-123",
  limit: 50,
});

// Get conversations for a specific resource
const resourceConversations = await storage.queryConversations({
  resourceId: "chatbot-v1",
  limit: 100,
  orderBy: "updated_at",
});

// Admin view - get all conversations
const allConversations = await storage.queryConversations({
  limit: 200,
  orderBy: "created_at",
  orderDirection: "ASC",
});
```

**Query Options:**

- `userId` (optional): Filter conversations by specific user
- `resourceId` (optional): Filter conversations by specific resource
- `limit` (optional): Maximum number of conversations to return (default: 50)
- `offset` (optional): Number of conversations to skip for pagination (default: 0)
- `orderBy` (optional): Field to sort by: 'created_at', 'updated_at', or 'title' (default: 'updated_at')
- `orderDirection` (optional): Sort direction: 'ASC' or 'DESC' (default: 'DESC')

## Getting Conversation Messages

Retrieve messages for a specific conversation:

```typescript
// Get recent messages (chronological order)
const messages = await storage.getMessages("user-123", "conversation-456", { limit: 50 });

// Time-based pagination
const older = await storage.getMessages("user-123", "conversation-456", {
  before: new Date("2024-01-01T00:00:00Z"),
  limit: 50,
});
```

**Message Query Options:**

- `limit` (optional): Maximum number of messages to return (default: 100)
- `before` (optional): Only messages created before this date
- `after` (optional): Only messages created after this date
- `roles` (optional): Filter by roles, e.g., `["user", "assistant"]`

Messages are returned in chronological order (oldest first) for natural conversation flow.

## Automatic Table Creation

`PostgreSQLMemoryAdapter` **automatically creates** the necessary tables (with your `tablePrefix`) and indexes if they don't already exist:

- `${tablePrefix}_users`
- `${tablePrefix}_conversations`
- `${tablePrefix}_messages`
- `${tablePrefix}_workflow_states`

This simplifies setup for both development and production.

## Production Considerations

For production applications, consider:

- **SSL Connections:** Enable SSL by setting `ssl: true` in your connection configuration.
- **Connection Pooling:** Adjust `maxConnections` based on your application's concurrent usage.
- **Environment Variables:** Store database credentials securely using environment variables.
- **Database Backups:** Implement regular backup strategies for your PostgreSQL database.

## Use Cases

- **Production Applications:** Enterprise-grade applications requiring robust, scalable database storage.
- **Existing PostgreSQL Infrastructure:** Applications already using PostgreSQL for other data.
- **Complex Queries:** Scenarios requiring advanced SQL capabilities or data analytics.
- **High Availability:** Applications requiring database replication and failover capabilities.
- **Team Collaboration:** Multi-user applications where conversation data needs to be shared or analyzed.

## Error Handling

```typescript
try {
  await storage.addMessage(message, userId, conversationId);
} catch (error) {
  if (error.message.includes("foreign key constraint")) {
    console.error("Conversation does not exist");
  } else {
    console.error("Database error:", error);
  }
}
```

## Working Memory

`PostgreSQLMemoryAdapter` implements working memory operations used by `Memory`:

- Conversation-scoped working memory is stored under `conversations.metadata.workingMemory`.
- User-scoped working memory is stored in the `${tablePrefix}_users` table `metadata.workingMemory` field.

Enable via `Memory({ workingMemory: { enabled: true, template | schema, scope } })`. See: [Working Memory](./working-memory.md).

Programmatic APIs (via `Memory`):

- `getWorkingMemory({ conversationId?, userId? })`
- `updateWorkingMemory({ conversationId?, userId?, content })`
- `clearWorkingMemory({ conversationId?, userId? })`

## Semantic Search (Embeddings + Vectors)

Vector search is configured on `Memory` independently of the storage adapter. To enable semantic retrieval with PostgreSQL storage, attach an embedding adapter and a vector adapter (e.g., in-memory for development):

```ts
import { Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new PostgreSQLMemoryAdapter({ connection: process.env.DATABASE_URL! }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
});
```

Use with agent calls by passing `semanticMemory` options. See: [Semantic Search](./semantic-search.md).
