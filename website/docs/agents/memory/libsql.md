---
title: LibSQL / Turso / SQLite Memory
slug: /agents/memory/libsql
---

# LibSQL / Turso / SQLite Memory

VoltAgent provides a separate package (`@voltagent/libsql`) that includes `LibSQLMemoryAdapter`, a storage adapter for the `Memory` class using [LibSQL](https://github.com/tursodatabase/libsql) for persistent storage.

This provider is versatile and can connect to:

- **Local SQLite files:** Ideal for development, testing, and simple deployments.
- **[Turso](https://turso.tech/):** A distributed database platform built on LibSQL, offering a globally available edge database.
- **Self-hosted `sqld` instances:** If you run your own LibSQL server.

## Setup

Install the LibSQL package:

```bash
npm install @voltagent/libsql
# or
yarn add @voltagent/libsql
# or
pnpm add @voltagent/libsql
```

If you plan to use Turso, you might need the Turso CLI for setup: `npm install -g @tursodatabase/cli`

## Configuration

Initialize `LibSQLMemoryAdapter` and pass it to the `Memory` instance used by your `Agent`:

```typescript
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";
import { createPinoLogger } from "@voltagent/logger";

// Create logger
const logger = createPinoLogger({
  name: "my-app",
  level: "info",
});

// Configure LibSQL memory adapter
const memoryStorage = new LibSQLMemoryAdapter({
  // Required: Connection URL
  url: process.env.DATABASE_URL || "file:./.voltagent/memory.db", // Example: Env var for Turso, fallback to local file

  // Required for Turso / Remote sqld (if not using TLS or auth is needed)
  authToken: process.env.DATABASE_AUTH_TOKEN,

  // Optional: Logger for debugging
  logger: logger.child({ component: "libsql" }),

  // Optional: Prefix for database table names
  tablePrefix: "my_agent_memory", // Defaults to 'voltagent_memory'

  // Optional: Storage limit (max number of messages per user/conversation)
  // storageLimit: 100, // Defaults to 100
});

const agent = new Agent({
  name: "LibSQL Memory Agent",
  instructions: "An agent using LibSQL for memory.",
  model: openai("gpt-4o"),
  memory: new Memory({ storage: memoryStorage }),
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
- `logger` (Logger, optional): A logger instance for debugging output. Typically created with `logger.child({ component: "libsql" })`.

## Conversation Management

The LibSQL provider includes enhanced support for managing conversations across multiple users:

```typescript
// Get conversations for a specific user
const conversations = await memoryStorage.getConversationsByUserId("user-123", {
  limit: 50,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Complex queries (filters, sort, pagination)
const recentConversations = await memoryStorage.queryConversations({
  userId: "user-123",
  limit: 10,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Pagination via limit/offset
const page1 = await memoryStorage.queryConversations({ userId: "user-123", limit: 20, offset: 0 });
const page2 = await memoryStorage.queryConversations({ userId: "user-123", limit: 20, offset: 20 });

// Get a conversation by ID
const conversation = await memoryStorage.getConversation("conversation-id");

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

Retrieve messages for a specific conversation:

```typescript
// Get recent messages (chronological order)
const messages = await memoryStorage.getMessages("user-123", "conversation-456", {
  limit: 50,
});

// Use time-based pagination when needed
const older = await memoryStorage.getMessages("user-123", "conversation-456", {
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

`LibSQLMemoryAdapter` **automatically creates** the necessary tables with your configured prefix:

- `${tablePrefix}_users`
- `${tablePrefix}_conversations`
- `${tablePrefix}_messages`
- `${tablePrefix}_workflow_states`

This simplifies setup, especially for local development using SQLite files.

The provider also **automatically migrates** existing databases to new schemas when you update VoltAgent, ensuring backward compatibility.

## Working Memory

`LibSQLMemoryAdapter` implements working memory operations used by `Memory`:

- Conversation-scoped working memory is stored under `conversations.metadata.workingMemory`.
- User-scoped working memory is stored under `users.metadata.workingMemory`.

Enable via `Memory({ workingMemory: { enabled: true, template | schema, scope } })`. See: [Working Memory](./working-memory.md).

Programmatic APIs (via `Memory`):

- `getWorkingMemory({ conversationId?, userId? })`
- `updateWorkingMemory({ conversationId?, userId?, content })`
- `clearWorkingMemory({ conversationId?, userId? })`

## Semantic Search (Embeddings + Vectors)

Vector search is configured on `Memory` independently of the storage adapter. To persist vectors with LibSQL, use `LibSQLVectorAdapter`:

```ts
import { Memory, AiSdkEmbeddingAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" }),
});
```

Tips:

- For tests/ephemeral runs use `url: ":memory:"` (or `"file::memory:"`).
- Do not pass `mode=memory` in the URL; LibSQL client doesn’t support it; use `:memory:`.
- For production persistence use a file path (e.g., `file:./.voltagent/memory.db`) or a remote Turso URL.

Use with agent calls by passing `semanticMemory` options. See: [Semantic Search](./semantic-search.md).

## Notes

- LibSQL is ideal for local development (SQLite file) and Turso deployments.
- Default memory is in-memory; configure LibSQL explicitly for persistence.

## Use Cases

- **Local Development & Testing:** Quickly set up persistent memory using a local SQLite file without needing external database services.
- **Serverless & Edge Functions:** SQLite databases (via LibSQL) can often be used effectively in serverless environments.
- **Turso Integration:** Leverage Turso's distributed edge database for low-latency memory access for globally distributed applications.
- **Simple Deployments:** Suitable for applications where managing a separate database server is overkill.
