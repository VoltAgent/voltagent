---
title: Memory
slug: /agents/memory
---

# Agent Memory

Memory enables agents to remember past interactions and maintain conversation context. This guide shows how to configure memory for your agents.

## Default Behavior

Agents automatically use **InMemoryStorage** by default, storing conversations in application memory:

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // Memory is automatically enabled - no configuration needed
});
```

## Using Memory

To maintain conversation context, provide `userId` and `conversationId`:

```typescript
// First message
const response1 = await agent.generateText("My name is Sarah", {
  userId: "user-123",
  conversationId: "chat-001",
});

// Follow-up message - agent remembers the name
const response2 = await agent.generateText("What's my name?", {
  userId: "user-123",
  conversationId: "chat-001", // Same conversation ID
});
console.log(response2.text); // "Your name is Sarah"
```

## Persistent Storage

For conversations that survive application restarts, use LibSQL:

```typescript
import { Agent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql"; // npm install @voltagent/libsql
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Persistent Assistant",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: new LibSQLStorage({
    url: "file:./.voltagent/memory.db", // SQLite database file
  }),
});
```

## Disabling Memory

For stateless agents that don't need conversation history:

```typescript
const agent = new Agent({
  name: "Stateless Assistant",
  instructions: "You provide one-off responses",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: false, // Disable memory completely
});
```

## Available Memory Providers

- **[InMemoryStorage](./memory/in-memory.md)** (Default) - Built into `@voltagent/core`
- **[LibSQLStorage](./memory/libsql.md)** - Install: `npm install @voltagent/libsql`
- **[PostgresStorage](./memory/postgres.md)** - Install: `npm install @voltagent/postgres`
- **[SupabaseStorage](./memory/supabase.md)** - Install: `npm install @voltagent/supabase`

## Learn More

For detailed information about memory configuration, providers, and advanced usage:

- **[Memory Overview](./memory/overview.md)** - Complete memory documentation
- **[Memory Providers](./memory/overview.md#memory-providers)** - Detailed provider comparison
- **[Custom Providers](./memory/overview.md#implementing-custom-memory-providers)** - Build your own storage
