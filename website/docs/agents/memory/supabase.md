---
title: Supabase Memory
slug: /agents/memory/supabase
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Supabase Memory

The `@voltagent/supabase` package provides a `SupabaseMemory` provider that uses a [Supabase](https://supabase.com) project (PostgreSQL database) for persistent storage of agent memory.

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

Unlike `LibSQLStorage`, `SupabaseMemory` **does not automatically create database tables**. You must run the following SQL commands in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query) before using the provider.

**Note:** These commands use the default table prefix `voltagent_memory`. If you provide a custom `tableName` option when initializing `SupabaseMemory` (e.g., `new SupabaseMemory({ ..., tableName: 'my_custom_prefix' })`), you **must** replace `voltagent_memory` with `my_custom_prefix` in the SQL commands below.

<details>
<summary>Click to view Database Setup SQL</summary>

```sql
-- Conversations Table
CREATE TABLE IF NOT EXISTS voltagent_memory_conversations (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default',  -- NEW: Associates conversation with user
    title TEXT,
    metadata JSONB, -- Use JSONB for efficient querying
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookup by resource_id
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_resource
ON voltagent_memory_conversations(resource_id);

-- Index for faster lookup by user_id
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_user
ON voltagent_memory_conversations(user_id);

-- Messages Table
CREATE TABLE IF NOT EXISTS voltagent_memory_messages (
    conversation_id TEXT NOT NULL REFERENCES voltagent_memory_conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL, -- Consider JSONB if content is often structured
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Primary key changed: user_id removed, now derived through conversation relationship
    PRIMARY KEY (conversation_id, message_id)
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_lookup
ON voltagent_memory_messages(conversation_id, created_at);

-- Agent History Table (New Structured Format)
CREATE TABLE IF NOT EXISTS voltagent_memory_agent_history (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT,
    input JSONB,
    output JSONB,
    usage JSONB,
    metadata JSONB,
    -- Legacy columns for migration compatibility
    key TEXT,
    value JSONB
);

-- Indexes for agent history
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_agent_history_id
ON voltagent_memory_agent_history(id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_agent_history_agent_id
ON voltagent_memory_agent_history(agent_id);

-- Agent History Steps Table
CREATE TABLE IF NOT EXISTS voltagent_memory_agent_history_steps (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL, -- Store the step object as JSONB
    -- Foreign key to history entry
    history_id TEXT NOT NULL,
    agent_id TEXT NOT NULL
);

-- Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_agent_history_steps_history_id
ON voltagent_memory_agent_history_steps(history_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_agent_history_steps_agent_id
ON voltagent_memory_agent_history_steps(agent_id);

-- Timeline Events Table (New)
CREATE TABLE IF NOT EXISTS voltagent_memory_agent_history_timeline_events (
    id TEXT PRIMARY KEY,
    history_id TEXT NOT NULL,
    agent_id TEXT,
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT,
    status_message TEXT,
    level TEXT DEFAULT 'INFO',
    version TEXT,
    parent_event_id TEXT,
    tags JSONB,
    input JSONB,
    output JSONB,
    error JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for timeline events
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_timeline_events_history_id
ON voltagent_memory_agent_history_timeline_events(history_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_timeline_events_agent_id
ON voltagent_memory_agent_history_timeline_events(agent_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_timeline_events_event_type
ON voltagent_memory_agent_history_timeline_events(event_type);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_timeline_events_event_name
ON voltagent_memory_agent_history_timeline_events(event_name);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_timeline_events_parent_event_id
ON voltagent_memory_agent_history_timeline_events(parent_event_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_timeline_events_status
ON voltagent_memory_agent_history_timeline_events(status);
```

Alternatively, integrate these SQL statements into your Supabase migration workflow using the [Supabase CLI](https://supabase.com/docs/guides/cli).

</details>

### Credentials

You will need your Supabase project's URL and `anon` key.

1.  Navigate to your project in the [Supabase Dashboard](https://app.supabase.com).
2.  Go to **Project Settings** (the gear icon).
3.  Select the **API** section.
4.  Find your **Project URL** and the **Project API key** labelled `anon` (public).

Store these credentials securely, typically as environment variables (e.g., `SUPABASE_URL` and `SUPABASE_KEY`).

## Configuration

Import `SupabaseMemory` and initialize it with your credentials:

```typescript
import { Agent } from "@voltagent/core";
import { SupabaseMemory } from "@voltagent/supabase";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Get credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided via environment variables.");
}

// Initialize SupabaseMemory
const memory = new SupabaseMemory({
  supabaseUrl,
  supabaseKey,
  // Optional: Specify a custom base table name prefix
  // This MUST match the prefix used in your SQL setup if customized.
  tableName: "voltagent_memory", // Defaults to 'voltagent_memory'
});

// Alternative: Use existing Supabase client
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(supabaseUrl, supabaseKey);
const memory = new SupabaseMemory({
  client: supabaseClient,
  tableName: "voltagent_memory", // Optional
});

const agent = new Agent({
  name: "Supabase Memory Agent",
  instructions: "An agent using Supabase for memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: memory, // Assign the memory provider instance
});
```

**Configuration Options:**

- `supabaseUrl` (string, required): Your Supabase project URL.
- `supabaseKey` (string, required): Your Supabase project `anon` key (or a service role key if used in a secure backend environment, though `anon` key with appropriate RLS policies is often sufficient).
- `tableName` (string, optional): A prefix for the database table names. Defaults to `voltagent_memory`. If you change this, ensure your SQL table creation script uses the same prefix.

Alternatively, you can pass an existing Supabase client:

- `client` (SupabaseClient, required when not using supabaseUrl/supabaseKey): An existing Supabase client instance.
- `tableName` (string, optional): Table name prefix when using existing client.

## User-Centric Conversation Management

The Supabase provider supports user-centric conversation management similar to other storage providers:

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

Retrieve messages for a specific conversation with pagination support:

```typescript
// Get all messages for a conversation
const messages = await memory.getConversationMessages("conversation-456");

// Get messages with pagination
const firstBatch = await memory.getConversationMessages("conversation-456", {
  limit: 50,
  offset: 0,
});

// Get next batch
const nextBatch = await memory.getConversationMessages("conversation-456", {
  limit: 50,
  offset: 50,
});

// Process messages in batches for large conversations
const batchSize = 100;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const batch = await memory.getConversationMessages("conversation-456", {
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

## Row Level Security (RLS)

For production applications, especially if using the `anon` key, it is **highly recommended** to enable Row Level Security (RLS) on the VoltAgent memory tables (`voltagent_memory_messages`, `voltagent_memory_conversations`, etc.) and define appropriate policies. This ensures users can only access their own conversation data.

Example RLS policies:

```sql
-- Enable RLS on conversations table
ALTER TABLE voltagent_memory_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own conversations
CREATE POLICY "Users can view own conversations" ON voltagent_memory_conversations
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" ON voltagent_memory_conversations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Enable RLS on messages table
ALTER TABLE voltagent_memory_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see messages from their conversations
CREATE POLICY "Users can view own messages" ON voltagent_memory_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM voltagent_memory_conversations
      WHERE user_id = auth.uid()::text
    )
  );

-- Policy: Users can insert messages to their conversations
CREATE POLICY "Users can insert own messages" ON voltagent_memory_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM voltagent_memory_conversations
      WHERE user_id = auth.uid()::text
    )
  );
```

Refer to the [Supabase RLS documentation](https://supabase.com/docs/guides/auth/row-level-security) for detailed guidance on setting up policies.

## Current Limitations

**Note:** The Supabase provider is currently in development and has some limitations:

- `getConversationsByUserId()` is not fully implemented and falls back to `getConversations()`
- `queryConversations()` is not fully implemented and falls back to `getConversations()`
- `getConversationMessages()` is not fully implemented and falls back to `getMessages()`

These methods will be fully implemented in future releases. The basic memory functionality (adding/getting messages, creating conversations) works as expected.

## Use Cases

- Applications already using Supabase for backend services.
- Projects requiring a scalable, managed PostgreSQL database.
- Scenarios where leveraging Supabase features like Auth, Realtime, or Storage alongside agent memory is beneficial.
- Production environments where robust data management and security policies (RLS) are essential.
