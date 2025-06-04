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
    title TEXT,
    metadata JSONB, -- Use JSONB for efficient querying
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookup by resource_id
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_conversations_resource
ON voltagent_memory_conversations(resource_id);

-- Messages Table
CREATE TABLE IF NOT EXISTS voltagent_memory_messages (
    user_id TEXT NOT NULL,
    -- Add foreign key reference and cascade delete
    conversation_id TEXT NOT NULL REFERENCES voltagent_memory_conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL, -- Consider JSONB if content is often structured
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Composite primary key to ensure message uniqueness within a conversation
    PRIMARY KEY (user_id, conversation_id, message_id)
);

-- Index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_voltagent_memory_messages_lookup
ON voltagent_memory_messages(user_id, conversation_id, created_at);

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
  // tableName: 'my_agent_memory', // Defaults to 'voltagent_memory'
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

## Row Level Security (RLS)

For production applications, especially if using the `anon` key, it is **highly recommended** to enable Row Level Security (RLS) on the VoltAgent memory tables (`voltagent_memory_messages`, `voltagent_memory_conversations`, etc.) and define appropriate policies. This ensures users can only access their own conversation data.

Refer to the [Supabase RLS documentation](https://supabase.com/docs/guides/auth/row-level-security) for detailed guidance on setting up policies.

## Use Cases

- Applications already using Supabase for backend services.
- Projects requiring a scalable, managed PostgreSQL database.
- Scenarios where leveraging Supabase features like Auth, Realtime, or Storage alongside agent memory is beneficial.
- Production environments where robust data management and security policies (RLS) are essential.
