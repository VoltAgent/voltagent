---
title: Supabase Memory
slug: /agents/memory/supabase
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Supabase Memory

`SupabaseMemoryAdapter` stores conversations in Supabase Postgres for applications already using Supabase.

## Installation

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

## Database Setup

Run this SQL in your Supabase SQL Editor (adjusts table prefix if needed):

<details>
<summary>Schema SQL (click to expand)</summary>

```sql
-- Users table (for user-scoped working memory)
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
  events JSONB,
  output JSONB,
  cancellation JSONB,
  user_id TEXT,
  conversation_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Conversation steps (structured LLM/tool events)
CREATE TABLE IF NOT EXISTS voltagent_memory_steps (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES voltagent_memory_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  operation_id TEXT,
  step_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  arguments JSONB,
  result JSONB,
  usage JSONB,
  sub_agent_id TEXT,
  sub_agent_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
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

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_steps_conversation
  ON voltagent_memory_steps(conversation_id, step_index);

CREATE INDEX IF NOT EXISTS idx_voltagent_memory_steps_operation
  ON voltagent_memory_steps(conversation_id, operation_id);
```

</details>

## Credentials

Get your Supabase credentials:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open your project
3. Go to **Project Settings** → **API**
4. Copy **Project URL** and **anon key**

Store as environment variables: `SUPABASE_URL` and `SUPABASE_KEY`

## Configuration

```ts
import { Agent, Memory } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";

// Using URL and key
const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
  }),
});

// Using existing Supabase client
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    client: supabaseClient,
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

### Configuration Options

| Option        | Type             | Description                                           |
| ------------- | ---------------- | ----------------------------------------------------- |
| `supabaseUrl` | `string`         | Supabase project URL (required if not using `client`) |
| `supabaseKey` | `string`         | Supabase anon key (required if not using `client`)    |
| `client`      | `SupabaseClient` | Existing Supabase client (alternative to URL/key)     |
| `tableName`   | `string`         | Table name prefix (default: `voltagent_memory`)       |
| `debug`       | `boolean`        | Enable debug logging (default: `false`)               |
| `logger`      | `Logger`         | Optional logger for structured logging                |

**Note**: Table prefix must match the SQL schema. If you use a custom `tableName`, update the SQL accordingly.

## Features

- Messages stored per `userId` and `conversationId`
- Conversation steps persisted for Observability (Memory Explorer “Steps” tab, sub-agent visibility, usage metadata)
- Supports complex queries with filtering, pagination, and sorting
- No automatic message pruning - all messages are preserved

### Working Memory

```ts
const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
  }),
  workingMemory: {
    enabled: true,
    scope: "conversation", // or "user"
  },
});
```

See [Working Memory](./working-memory.md).

### Semantic Search

```ts
import { Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!,
  }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(), // or pgvector adapter
});
```

See [Semantic Search](./semantic-search.md).

## Production Setup

```ts
import { Agent, Memory } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY! // or service_role key for backend
);

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    client: supabaseClient,
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

**Security:**

- Use `anon` key with Row Level Security (RLS) policies
- Use `service_role` key only in secure backend environments
- Store credentials in environment variables

**Use cases:**

- Applications already using Supabase
- Projects leveraging Supabase Auth, Realtime, or Storage
- Environments requiring RLS policies

For production-ready zero-setup hosting, see [Managed Memory](./managed-memory.md).

## Learn More

- **[Managed Memory](./managed-memory.md)** - Production-ready hosted memory with zero setup
- **[Working Memory](./working-memory.md)** - Maintain compact context
- **[Semantic Search](./semantic-search.md)** - Vector search configuration
