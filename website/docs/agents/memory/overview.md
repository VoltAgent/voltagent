---
title: Overview
slug: /agents/memory/overview
---

# Memory Overview

VoltAgent's `Memory` class stores conversation history and optional semantic search vectors. Agents retrieve past messages before generating responses and persist new interactions after completion.

## Storage Providers

| Provider           | Package                       | Persistence            | Use Case                         |
| ------------------ | ----------------------------- | ---------------------- | -------------------------------- |
| **InMemory**       | `@voltagent/core`             | None (RAM only)        | Development, testing             |
| **Managed Memory** | `@voltagent/voltagent-memory` | VoltOps-hosted         | Production-ready, zero-setup     |
| **LibSQL**         | `@voltagent/libsql`           | Local SQLite or remote | Self-hosted, edge deployments    |
| **Postgres**       | `@voltagent/postgres`         | Self-hosted Postgres   | Existing Postgres infrastructure |
| **Supabase**       | `@voltagent/supabase`         | Supabase               | Supabase-based applications      |

## Core Features

### Conversation Storage

- Messages stored per `userId` and `conversationId`
- Auto-creates conversations on first message
- Configurable message limits (oldest pruned first)

### Semantic Search (Optional)

- Requires `embedding` + `vector` adapters
- Auto-embeds messages on save
- Retrieves similar past messages by content, not recency
- Merges semantic results with recent messages

### Working Memory (Optional)

- Stores compact context across conversation turns
- Three formats: Markdown template, JSON schema (Zod), or free-form
- Two scopes: `conversation` (default) or `user`
- Agent exposes tools: `get_working_memory`, `update_working_memory`, `clear_working_memory`

### Workflow State

- Suspendable workflow checkpoint storage
- Tracks execution state, context, suspension metadata

## Agent Configuration

Agents accept a `memory` option:

```ts
import { Agent, Memory } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Default: in-memory storage (no persistence)
const agent1 = new Agent({
  name: "Assistant",
  model: openai("gpt-4o-mini"),
  // memory: undefined // implicit default
});

// Disable memory entirely
const agent2 = new Agent({
  name: "Stateless",
  model: openai("gpt-4o-mini"),
  memory: false,
});

// Persistent storage
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const agent3 = new Agent({
  name: "Persistent",
  model: openai("gpt-4o-mini"),
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  }),
});
```

## Usage with User and Conversation IDs

Provide `userId` and `conversationId` in generation calls to scope memory:

```ts
const response = await agent.generateText("What did we discuss yesterday?", {
  userId: "user-123",
  conversationId: "thread-abc",
});
```

**Behavior:**

- **Both provided**: Retrieves history for that specific thread
- **Only userId**: New `conversationId` generated per call (fresh context each time)
- **Neither provided**: Uses default user ID with new conversation ID

## Examples

### Managed Memory (Zero Setup)

```ts
import { Agent, Memory } from "@voltagent/core";
import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
import { VoltOpsClient } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const memory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "production-memory",
    voltOpsClient,
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: openai("gpt-4o-mini"),
  memory,
});
```

### Semantic Search + Working Memory

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
  workingMemory: {
    enabled: true,
    scope: "conversation",
    schema: z.object({
      preferences: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional(),
    }),
  },
});

const agent = new Agent({
  name: "Smart Assistant",
  model: openai("gpt-4o-mini"),
  memory,
});

// Enable semantic search per call
const result = await agent.generateText("What preferences did I mention?", {
  userId: "user-123",
  conversationId: "thread-abc",
  semanticMemory: {
    enabled: true,
    semanticLimit: 5,
    semanticThreshold: 0.7,
  },
});
```

## Custom Adapters

Implement the `StorageAdapter` interface to use custom databases:

```ts
import type { StorageAdapter, UIMessage, Conversation, OperationContext } from "@voltagent/core";

export class MyStorageAdapter implements StorageAdapter {
  async addMessage(
    msg: UIMessage,
    userId: string,
    conversationId: string,
    context?: OperationContext // Optional: access operation context
  ): Promise<void> {
    // Access user-provided context values
    const tenantId = context?.context.get("tenantId");

    // Use logger and tracing
    context?.logger.info("Storing message", { userId, tenantId });

    // Store message in your database
  }

  async getMessages(
    userId: string,
    conversationId: string,
    options?: { limit?: number },
    context?: OperationContext // Optional: access operation context
  ): Promise<UIMessage[]> {
    // Retrieve messages in chronological order (oldest first)
    return [];
  }

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    // Create conversation record
  }

  // ... implement remaining StorageAdapter methods
}
```

Required methods:

- Messages: `addMessage`, `addMessages`, `getMessages`, `clearMessages`
- Conversations: `createConversation`, `getConversation`, `getConversations`, `getConversationsByUserId`, `queryConversations`, `updateConversation`, `deleteConversation`
- Working memory: `getWorkingMemory`, `setWorkingMemory`, `deleteWorkingMemory`
- Workflow state: `getWorkflowState`, `setWorkflowState`, `updateWorkflowState`, `getSuspendedWorkflowStates`

### Advanced: Context-Aware Adapters

Custom adapters can access `OperationContext` for dynamic, per-request behavior:

```ts
import { InMemoryStorageAdapter } from "@voltagent/core";
import type { OperationContext } from "@voltagent/core/agent";

class TenantMemoryAdapter extends InMemoryStorageAdapter {
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    context?: OperationContext
  ): Promise<UIMessage[]> {
    // Read tenant from user-provided context
    const tenantId = context?.context.get("tenantId") as string;

    if (!tenantId) {
      throw new Error("Tenant ID required");
    }

    // Create tenant-scoped user ID
    const scopedUserId = `${tenantId}:${userId}`;

    // Log with tracing
    context?.logger.info("Tenant memory access", {
      tenantId,
      userId,
      scopedUserId,
    });

    // Use scoped ID for data isolation
    return super.getMessages(scopedUserId, conversationId, options, context);
  }
}

// Use the adapter
const agent = new Agent({
  memory: new Memory({ storage: new TenantMemoryAdapter() }),
});

// Pass tenant per request
await agent.generateText("Query", {
  userId: "user-123",
  context: { tenantId: "company-abc" }, // Different tenant = different data
});
```

**Use cases for context-aware adapters:**

- **Multi-tenancy**: Isolate data by tenant using composite keys
- **Audit logging**: Track all memory access with full context
- **Access control**: Validate permissions before queries
- **Dynamic behavior**: Adjust queries based on runtime values

See [Operation Context](../context.md#memory-adapters) for more examples and patterns.

## Learn More

- **[Managed Memory](./managed-memory.md)** - Production-ready hosted memory with zero setup
- **[Semantic Search](./semantic-search.md)** - Retrieve messages by similarity
- **[Working Memory](./working-memory.md)** - Maintain compact context across turns
- **[LibSQL / SQLite](./libsql.md)** - Self-hosted SQLite or edge deployments
- **[PostgreSQL](./postgres.md)** - Self-hosted Postgres adapter
- **[Supabase](./supabase.md)** - Supabase integration
- **[In-Memory Storage](./in-memory.md)** - Default ephemeral storage
