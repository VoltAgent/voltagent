---
title: LibSQL / Turso / SQLite Memory
slug: /agents/memory/libsql
---

# LibSQL / Turso / SQLite Memory

VoltAgent's core package (`@voltagent/core`) includes a built-in memory provider, `LibSQLStorage`, which uses [LibSQL](https://github.com/tursodatabase/libsql) for persistent storage. LibSQL is an open-source fork of SQLite.

This provider is versatile and can connect to:

- **Local SQLite files:** Ideal for development, testing, and simple deployments.
- **[Turso](https://turso.tech/):** A distributed database platform built on LibSQL, offering a globally available edge database.
- **Self-hosted `sqld` instances:** If you run your own LibSQL server.

## Setup

`LibSQLStorage` is part of `@voltagent/core`, so no separate installation is needed beyond the core package.

If you plan to use Turso, you might need the Turso CLI for setup: `npm install -g @tursodatabase/cli`

## Configuration

Initialize `LibSQLStorage` and pass it to your `Agent` configuration:

```typescript
import { Agent, LibSQLStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Configure LibSQLStorage
const memoryStorage = new LibSQLStorage({
  // Required: Connection URL
  url: process.env.DATABASE_URL || "file:./voltagent-memory.db", // Example: Env var for Turso, fallback to local file

  // Required for Turso / Remote sqld (if not using TLS or auth is needed)
  authToken: process.env.DATABASE_AUTH_TOKEN,

  // Optional: Prefix for database table names
  tablePrefix: "my_agent_memory", // Defaults to 'voltagent_memory'

  // Optional: Storage limit (max number of messages per user/conversation)
  // storageLimit: 100, // Defaults to 100

  // Optional: Enable debug logging for the storage provider
  // debug: true, // Defaults to false
});

const agent = new Agent({
  name: "LibSQL Memory Agent",
  instructions: "An agent using LibSQL for memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: memoryStorage,
});
```

**Configuration Options:**

- `url` (string, required): The connection URL for your LibSQL database.
  - **Local SQLite:** Use `file:<path-to-db-file>`.
    - `file:memory.db`: Creates/uses `memory.db` in the current working directory.
    - `file:.voltagent/memory.db`: Creates/uses `memory.db` inside a `.voltagent` subdirectory (created automatically if it doesn't exist).
    - `file:/path/to/your/database.db`: Absolute path.
  - **Turso:** Use the `libsql://your-database-name-username.turso.io` URL provided in your Turso dashboard.
  - **Remote `sqld`:** Use the appropriate `libsql://` or `http(s)://` URL for your server.
- `authToken` (string, optional): Required for authenticated connections to Turso or remote `sqld` instances.
- `tablePrefix` (string, optional): A prefix added to all database tables created by this provider (e.g., `my_prefix_messages`, `my_prefix_conversations`). Defaults to `voltagent_memory`.
- `storageLimit` (number, optional): The maximum number of messages to retain per user/conversation thread. Older messages are automatically pruned when the limit is exceeded. Defaults to `100`.
- `debug` (boolean, optional): Enables detailed logging from the storage provider to the console. Defaults to `false`.

## User-Centric Conversation Management

The LibSQL provider includes enhanced support for managing conversations across multiple users:

```typescript
// Get conversations for a specific user
const conversations = await memoryStorage.getConversationsByUserId("user-123", {
  limit: 50,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Query builder pattern for complex queries
const recentConversations = await memoryStorage
  .getUserConversations("user-123")
  .limit(10)
  .orderBy("updated_at", "DESC")
  .execute();

// Pagination support
const page1 = await memoryStorage.getPaginatedUserConversations("user-123", 1, 20);
console.log(page1.conversations); // Array of conversations
console.log(page1.hasMore); // Boolean indicating if more pages exist

// Get conversation with user validation
const conversation = await memoryStorage.getUserConversation("conversation-id", "user-123");

// Create and update conversations
const newConversation = await memoryStorage.createConversation({
  id: "conversation-id",
  resourceId: "app-resource-1",
  userId: "user-123",
  title: "New Chat Session",
  metadata: { source: "web-app" },
});

await memoryStorage.updateConversation("conversation-id", {
  title: "Updated Title",
});
```

## Querying Conversations

The LibSQL storage provides powerful conversation querying capabilities with filtering, pagination, and sorting options:

```typescript
// Query with multiple filters
const workConversations = await memoryStorage.queryConversations({
  userId: "user-123",
  resourceId: "work-agent",
  limit: 25,
  offset: 0,
  orderBy: "created_at",
  orderDirection: "DESC",
});

// Get all conversations for a user
const userConversations = await memoryStorage.queryConversations({
  userId: "user-123",
  limit: 50,
});

// Get conversations for a specific resource
const resourceConversations = await memoryStorage.queryConversations({
  resourceId: "chatbot-v1",
  limit: 100,
  orderBy: "updated_at",
});

// Admin view - get all conversations
const allConversations = await memoryStorage.queryConversations({
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

Retrieve messages for a specific conversation with pagination support:

```typescript
// Get all messages for a conversation
const messages = await memoryStorage.getConversationMessages("conversation-456");

// Get messages with pagination
const firstBatch = await memoryStorage.getConversationMessages("conversation-456", {
  limit: 50,
  offset: 0,
});

// Get next batch
const nextBatch = await memoryStorage.getConversationMessages("conversation-456", {
  limit: 50,
  offset: 50,
});

// Process messages in batches for large conversations
const batchSize = 100;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const batch = await memoryStorage.getConversationMessages("conversation-456", {
    limit: batchSize,
    offset: offset,
  });

  // Process batch
  processBatch(batch);

  hasMore = batch.length === batchSize;
  offset += batchSize;
}
```

**Message Query Options:**

- `limit` (optional): Maximum number of messages to return (default: 100)
- `offset` (optional): Number of messages to skip for pagination (default: 0)

Messages are returned in chronological order (oldest first) for natural conversation flow.

## Automatic Table Creation

Unlike some other database providers, `LibSQLStorage` **automatically creates** the necessary tables (`messages`, `conversations`, `agent_history`, etc., with the configured `tablePrefix`) in the target database if they don't already exist. This simplifies setup, especially for local development using SQLite files.

The provider also **automatically migrates** existing databases to new schemas when you update VoltAgent, ensuring backward compatibility.

## Use Cases

- **Local Development & Testing:** Quickly set up persistent memory using a local SQLite file without needing external database services.
- **Serverless & Edge Functions:** SQLite databases (via LibSQL) can often be used effectively in serverless environments.
- **Turso Integration:** Leverage Turso's distributed edge database for low-latency memory access for globally distributed applications.
- **Simple Deployments:** Suitable for applications where managing a separate database server is overkill.
