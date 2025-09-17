---
title: Supabase Memory
slug: /agents/memory/supabase
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Supabase Memory

The `@voltagent/supabase` package provides a `SupabaseMemoryAdapter` storage adapter for the `Memory` class that uses a [Supabase](https://supabase.com) project (PostgreSQL database) for persistent storage of conversation memory.

This is a good choice if your application is already built on Supabase or if you require a robust, scalable PostgreSQL backend with managed features like authentication, real-time subscriptions, and storage.

## Setup

### Install Package

First, install the necessary packages:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/supabase @supabase/supabase-js
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/supabase @supabase/supabase-js
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/supabase @supabase/supabase-js
```

  </TabItem>
</Tabs>

### Database Setup

Run the SQL below in the Supabase SQL Editor. Replace the `voltagent_memory` prefix if you configure a different `tableName`.

<details>
<summary>Fresh installation SQL</summary>

```sql
-- Base table names (change prefix if needed)
-- conversations: voltagent_memory_conversations
-- messages:      voltagent_memory_messages
-- users:         voltagent_memory_users
-- workflow:      voltagent_memory_workflow_states

-- Users table (for user‑scoped working memory)
CREATE TABLE IF NOT EXISTS voltagent_memory_users (
  id TEXT PRIMARY KEY,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Conversations table
CREATE TABLE IF NOT EXISTS voltagent_memory_conversations (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Messages table (UIMessage format)
CREATE TABLE IF NOT EXISTS voltagent_memory_messages (
  conversation_id TEXT NOT NULL REFERENCES voltagent_memory_conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  parts JSONB,
  metadata JSONB,
  format_version INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (conversation_id, message_id)
);

-- Workflow states (for suspension/resume)
CREATE TABLE IF NOT EXISTS voltagent_memory_workflow_states (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL,
  suspension JSONB,
  user_id TEXT,
  conversation_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_user_id
  ON voltagent_memory_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_resource_id
  ON voltagent_memory_conversations(resource_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_conversation_id
  ON voltagent_memory_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_created_at
  ON voltagent_memory_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_states_workflow_id
  ON voltagent_memory_workflow_states(workflow_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_states_status
  ON voltagent_memory_workflow_states(status);
```

</details>

<details>
<summary>Migration from older schema to current</summary>

```sql
-- Tables
-- conversations: voltagent_memory_conversations
-- messages:      voltagent_memory_messages
-- users:         voltagent_memory_users
-- workflow:      voltagent_memory_workflow_states

-- 1) Ensure conversations has required columns
ALTER TABLE voltagent_memory_conversations
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS resource_id TEXT NOT NULL DEFAULT '';

-- 2) Add V2 columns to messages
ALTER TABLE voltagent_memory_messages
  ADD COLUMN IF NOT EXISTS parts JSONB,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS format_version INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'default';

-- 3) Make legacy columns nullable if present
ALTER TABLE voltagent_memory_messages
  ALTER COLUMN content DROP NOT NULL,
  ALTER COLUMN type DROP NOT NULL;

-- 4) Create users table for user‑scoped working memory
CREATE TABLE IF NOT EXISTS voltagent_memory_users (
  id TEXT PRIMARY KEY,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5) Create workflow states table
CREATE TABLE IF NOT EXISTS voltagent_memory_workflow_states (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL,
  suspension JSONB,
  user_id TEXT,
  conversation_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_user_id
  ON voltagent_memory_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_resource_id
  ON voltagent_memory_conversations(resource_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_conversation_id
  ON voltagent_memory_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_created_at
  ON voltagent_memory_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_states_workflow_id
  ON voltagent_memory_workflow_states(workflow_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_states_status
  ON voltagent_memory_workflow_states(status);
```

</details>

### Credentials

You will need your Supabase project's URL and `anon` key.

1.  Navigate to your project in the [Supabase Dashboard](https://app.supabase.com).
2.  Go to **Project Settings** (the gear icon).
3.  Select the **API** section.
4.  Find your **Project URL** and the **Project API key** labelled `anon` (public).

Store these credentials securely, typically as environment variables (e.g., `SUPABASE_URL` and `SUPABASE_KEY`).

## Configuration

Import `SupabaseMemoryAdapter` and initialize it with your credentials:

```typescript
import { Agent, Memory } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";
import { createPinoLogger } from "@voltagent/logger";
import { openai } from "@ai-sdk/openai";

// Get credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided via environment variables.");
}

// Initialize Supabase memory adapter
const storage = new SupabaseMemoryAdapter({
  supabaseUrl,
  supabaseKey,
  // Optional: Specify a custom base table name prefix
  // This MUST match the prefix used in your SQL setup if customized.
  tableName: "voltagent_memory", // Defaults to 'voltagent_memory'
  // Optional: Limit the number of messages stored per conversation
  storageLimit: 100, // Defaults to 100
  // Optional: Enable verbose debug logging from the memory provider
  debug: true, // Defaults to false
  // Optional: Custom logger for structured logging
  logger: createPinoLogger({ name: "memory-supabase" }),
});

// Alternative: Use existing Supabase client
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(supabaseUrl, supabaseKey);
const storage = new SupabaseMemoryAdapter({
  client: supabaseClient,
  tableName: "voltagent_memory", // Optional
  storageLimit: 150, // Optional: Custom storage limit
  debug: false, // Optional: Debug logging
  logger: createPinoLogger({ name: "memory-supabase" }), // Optional: Custom logger
});

const agent = new Agent({
  name: "Supabase Memory Agent",
  instructions: "An agent using Supabase for memory.",
  model: openai("gpt-4o"),
  memory: new Memory({ storage }),
});
```

**Configuration Options:**

When using Supabase URL and key:

- `supabaseUrl` (string, required): Your Supabase project URL.
- `supabaseKey` (string, required): Your Supabase project `anon` key (or a service role key if used in a secure backend environment, though `anon` key with appropriate RLS policies is often sufficient).
- `tableName` (string, optional): A prefix for the database table names. Defaults to `voltagent_memory`. If you change this, ensure your SQL table creation script uses the same prefix.
- `storageLimit` (number, optional): The maximum number of messages to retain per conversation. When the limit is reached, the oldest messages are automatically deleted to make room for new ones. Defaults to `100`.
- `debug` (boolean, optional): Enables detailed logging from the `SupabaseMemory` provider to the console, useful for understanding memory operations during development. Defaults to `false`.
- `logger` (Logger, optional): Custom logger instance for structured logging. Supports any logger that implements the standard logger interface (e.g., Pino, Winston). When provided, this overrides the `debug` option.

When using an existing Supabase client:

- `client` (SupabaseClient, required when not using supabaseUrl/supabaseKey): An existing Supabase client instance. The constructor validates that this is a proper SupabaseClient instance.
- `tableName` (string, optional): Table name prefix when using existing client.
- `storageLimit` (number, optional): Storage limit when using existing client. Defaults to `100`.
- `debug` (boolean, optional): Debug logging when using existing client. Defaults to `false`.
- `logger` (Logger, optional): Custom logger instance for structured logging.

## Conversation Management

The Supabase provider supports conversation management similar to other storage providers:

```typescript
// Get conversations for a specific user
const conversations = await memory.getConversationsByUserId("user-123", {
  limit: 50,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Create and update conversations
const newConversation = await memory.createConversation({
  id: "conversation-id",
  resourceId: "app-resource-1",
  userId: "user-123",
  title: "New Chat Session",
  metadata: { source: "web-app" },
});

await memory.updateConversation("conversation-id", {
  title: "Updated Title",
});
```

## Querying Conversations

The Supabase storage provides conversation querying capabilities with filtering, pagination, and sorting options:

```typescript
// Query with multiple filters
const workConversations = await memory.queryConversations({
  userId: "user-123",
  resourceId: "work-agent",
  limit: 25,
  offset: 0,
  orderBy: "created_at",
  orderDirection: "DESC",
});

// Get all conversations for a user
const userConversations = await memory.queryConversations({
  userId: "user-123",
  limit: 50,
});

// Get conversations for a specific resource
const resourceConversations = await memory.queryConversations({
  resourceId: "chatbot-v1",
  limit: 100,
  orderBy: "updated_at",
});

// Admin view - get all conversations
const allConversations = await memory.queryConversations({
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
const messages = await memory.getMessages("user-123", "conversation-456", { limit: 50 });

// Time-based pagination
const older = await memory.getMessages("user-123", "conversation-456", {
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

## Use Cases

- Applications already using Supabase for backend services.
- Projects requiring a scalable, managed PostgreSQL database.
- Scenarios where leveraging Supabase features like Auth, Realtime, or Storage alongside agent memory is beneficial.
- Production environments where robust data management and security policies (RLS) are essential.

## Working Memory

`SupabaseMemoryAdapter` implements working memory operations used by `Memory`:

- Conversation-scoped working memory is stored under `conversations.metadata.workingMemory`.
- User-scoped working memory is stored in the `${tableName}_users` table `metadata.workingMemory` field.

Enable via `Memory({ workingMemory: { enabled: true, template | schema, scope } })`. See: [Working Memory](./working-memory.md).

Programmatic APIs (via `Memory`):

- `getWorkingMemory({ conversationId?, userId? })`
- `updateWorkingMemory({ conversationId?, userId?, content })`
- `clearWorkingMemory({ conversationId?, userId? })`

## Semantic Search (Embeddings + Vectors)

Vector search is configured on `Memory` independently of the storage adapter. To enable semantic retrieval with Supabase storage, attach an embedding adapter and a vector adapter:

```ts
import { Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({ supabaseUrl, supabaseKey }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
});
```

Use with agent calls by passing `semanticMemory` options. See: [Semantic Search](./semantic-search.md).
