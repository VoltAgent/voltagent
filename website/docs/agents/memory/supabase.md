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
    user_id TEXT,  -- Associates conversation with user (nullable)
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

-- Composite index for user_id + resource_id queries
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_user_resource
ON voltagent_memory_conversations(user_id, resource_id);

-- Index for ordering by updated_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_updated_at
ON voltagent_memory_conversations(updated_at DESC);

-- Messages Table
CREATE TABLE IF NOT EXISTS voltagent_memory_messages (
    conversation_id TEXT NOT NULL REFERENCES voltagent_memory_conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL, -- Consider JSONB if content is often structured
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Primary key: conversation_id + message_id ensures uniqueness within conversation
    PRIMARY KEY (conversation_id, message_id)
);

-- Index for faster message retrieval (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_lookup
ON voltagent_memory_messages(conversation_id, created_at);

-- Index for message role filtering
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_role
ON voltagent_memory_messages(conversation_id, role, created_at);

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
    user_id TEXT,
    conversation_id TEXT,
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

-- Workflow History Table
CREATE TABLE IF NOT EXISTS voltagent_memory_workflow_history (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'cancelled')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    input JSONB,
    output JSONB,
    metadata JSONB,
    user_id TEXT,
    conversation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Workflow Steps Table
CREATE TABLE IF NOT EXISTS voltagent_memory_workflow_steps (
    id TEXT PRIMARY KEY,
    workflow_history_id TEXT NOT NULL REFERENCES voltagent_memory_workflow_history(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('agent', 'func', 'conditional-when', 'parallel-all', 'parallel-race')),
    step_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'skipped')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    input JSONB,
    output JSONB,
    error_message TEXT,
    agent_execution_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Workflow Timeline Events Table
CREATE TABLE IF NOT EXISTS voltagent_memory_workflow_timeline_events (
    id TEXT PRIMARY KEY,
    workflow_history_id TEXT NOT NULL REFERENCES voltagent_memory_workflow_history(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT,
    level TEXT DEFAULT 'INFO',
    input JSONB,
    output JSONB,
    metadata JSONB,
    event_sequence INTEGER,
    trace_id TEXT,
    parent_event_id TEXT,
    status_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for workflow tables
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_history_workflow_id
ON voltagent_memory_workflow_history(workflow_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_history_status
ON voltagent_memory_workflow_history(status);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_history_start_time
ON voltagent_memory_workflow_history(start_time);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_history_user_id
ON voltagent_memory_workflow_history(user_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_history_conversation_id
ON voltagent_memory_workflow_history(conversation_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_steps_workflow_history_id
ON voltagent_memory_workflow_steps(workflow_history_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_steps_step_index
ON voltagent_memory_workflow_steps(workflow_history_id, step_index);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_timeline_events_workflow_history_id
ON voltagent_memory_workflow_timeline_events(workflow_history_id);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_timeline_events_type
ON voltagent_memory_workflow_timeline_events(type);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_timeline_events_start_time
ON voltagent_memory_workflow_timeline_events(start_time);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_workflow_timeline_events_sequence
ON voltagent_memory_workflow_timeline_events(event_sequence);

-- Migration Flags Table (Prevents duplicate migrations)
CREATE TABLE IF NOT EXISTS voltagent_memory_conversations_migration_flags (
    id SERIAL PRIMARY KEY,
    migration_type TEXT NOT NULL UNIQUE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    migrated_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert fresh installation flags to prevent future migrations
INSERT INTO voltagent_memory_conversations_migration_flags (migration_type, migrated_count, metadata)
VALUES
    ('conversation_schema_migration', 0, '{"fresh_install": true}'::jsonb),
    ('agent_history_migration', 0, '{"fresh_install": true}'::jsonb)
ON CONFLICT (migration_type) DO NOTHING;
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
  // Optional: Limit the number of messages stored per conversation
  storageLimit: 100, // Defaults to 100
  // Optional: Enable verbose debug logging from the memory provider
  debug: true, // Defaults to false
});

// Alternative: Use existing Supabase client
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(supabaseUrl, supabaseKey);
const memory = new SupabaseMemory({
  client: supabaseClient,
  tableName: "voltagent_memory", // Optional
  storageLimit: 150, // Optional: Custom storage limit
  debug: false, // Optional: Debug logging
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
- `storageLimit` (number, optional): The maximum number of messages to retain per conversation. When the limit is reached, the oldest messages are automatically deleted to make room for new ones. Defaults to `100`.
- `debug` (boolean, optional): Enables detailed logging from the `SupabaseMemory` provider to the console, useful for understanding memory operations during development. Defaults to `false`.

Alternatively, you can pass an existing Supabase client:

- `client` (SupabaseClient, required when not using supabaseUrl/supabaseKey): An existing Supabase client instance.
- `tableName` (string, optional): Table name prefix when using existing client.
- `storageLimit` (number, optional): Storage limit when using existing client. Defaults to `100`.
- `debug` (boolean, optional): Debug logging when using existing client. Defaults to `false`.

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

## Use Cases

- Applications already using Supabase for backend services.
- Projects requiring a scalable, managed PostgreSQL database.
- Scenarios where leveraging Supabase features like Auth, Realtime, or Storage alongside agent memory is beneficial.
- Production environments where robust data management and security policies (RLS) are essential.
