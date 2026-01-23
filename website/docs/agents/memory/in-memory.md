---
title: In-Memory Storage
slug: /agents/memory/in-memory
---

# In-Memory Storage

`InMemoryStorageAdapter` stores conversation history in application memory. Data is lost when the application restarts.

## Default Behavior

Agents use in-memory storage by default when no `memory` option is provided:

```ts
import { Agent } from "@voltagent/core";

// Uses InMemoryStorageAdapter automatically
const agent = new Agent({
  name: "Assistant",
  instructions: "Help users with questions.",
  model: "openai/gpt-4o-mini",
});
```

## Explicit Configuration

Configure storage limits explicitly:

```ts
import { Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";

const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

## Features

### Conversation Storage

- Messages stored per `userId` and `conversationId`
- All `StorageAdapter` methods supported
- No automatic message pruning - all messages are preserved in memory

### Working Memory

Supports both conversation and user-scoped working memory:

```ts
const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
  workingMemory: {
    enabled: true,
    scope: "conversation", // or "user"
  },
});
```

See [Working Memory](./working-memory.md) for configuration details.

### Semantic Search (Development)

Combine with `InMemoryVectorAdapter` for semantic search during development:

```ts
import { Memory, InMemoryVectorAdapter, InMemoryStorageAdapter } from "@voltagent/core";

const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
  embedding: "openai/text-embedding-3-small",
  vector: new InMemoryVectorAdapter(),
});
```

Both storage and vectors are lost on restart. For persistent vectors, use `LibSQLVectorAdapter`.

## Use Cases

### Development & Testing

Test agent logic without database setup:

```ts
import { Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";

const testAgent = new Agent({
  name: "Test Assistant",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: new InMemoryStorageAdapter(),
  }),
});

// Test conversations without persistence
await testAgent.generateText("Test message", {
  userId: "test-user",
  conversationId: "test-conversation",
});
```

### Stateless Deployments

Serverless functions or ephemeral containers where persistence isn't needed:

```ts
// Cloud function handler
export async function handler(event) {
  const agent = new Agent({
    name: "Serverless Assistant",
    model: "openai/gpt-4o-mini",
    // Default in-memory storage
  });

  return await agent.generateText(event.message, {
    userId: event.userId,
    conversationId: event.sessionId,
  });
}
```

### Demos & Examples

Quick prototypes without infrastructure dependencies.

## Limitations

- **No persistence** - All data lost on restart
- **Memory usage** - Large message counts consume application memory
- **Not for production** - Use persistent adapters for production applications

## Learn More

- **[Managed Memory](./managed-memory.md)** - Production-ready hosted memory with zero setup
- **[LibSQL / SQLite](./libsql.md)** - Self-hosted SQLite or edge deployments
- **[PostgreSQL](./postgres.md)** - Self-hosted Postgres adapter
- **[Supabase](./supabase.md)** - Supabase integration
