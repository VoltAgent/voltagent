---
title: In-Memory Storage
slug: /agents/memory/in-memory
---

# In-Memory Storage

VoltAgent's core package (`@voltagent/core`) includes `InMemoryStorageAdapter`, a simple storage adapter (for the `Memory` class) that stores conversation history in application memory.

## Overview

- **Use Case:** Development, testing, demos, or any scenario where persistent memory across application restarts is not required.
- **Pros:** Zero external dependencies, extremely fast, easy to use.
- **Cons:** All stored data (conversation history, agent state) is **lost** when the application stops or restarts.
- **Availability:** Included directly in `@voltagent/core`.

## Configuration

By default, agents use in-memory storage without any configuration. To customize (e.g., storage limits), configure it explicitly.

```typescript
import { Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Optional: Configure in-memory storage explicitly
const memory = new Memory({
  storage: new InMemoryStorageAdapter({ storageLimit: 100 }),
});

const agent = new Agent({
  name: "Ephemeral Agent",
  instructions: "An agent using in-memory storage (history resets on restart).",
  model: openai("gpt-4o"),
  memory, // Optional; default is also in-memory
});

// Interactions with this agent will use the in-memory store.
// await agent.generateText("Remember this info.", { userId: "user1", conversationId: "conv1" });
// // If the app restarts here, the above message is lost.
// await agent.generateText("Do you remember?", { userId: "user1", conversationId: "conv1" });
```

**Configuration Options (InMemoryStorageAdapter):**

- `storageLimit` (number, optional): The maximum number of messages to retain per unique `userId`/`conversationId`. Oldest messages are pruned when exceeded. Defaults to `100`.

## Working Memory

`InMemoryStorageAdapter` implements working memory storage for both conversation and user scopes using in‑process metadata fields. Enable it via `Memory({ workingMemory: { enabled: true, ... } })`. See: [Working Memory](./working-memory.md).

## Semantic Search (Embeddings + Vectors)

The in-memory storage can be combined with `AiSdkEmbeddingAdapter` and `InMemoryVectorAdapter` to enable semantic retrieval in development:

```ts
import { Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { InMemoryStorageAdapter } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new InMemoryStorageAdapter({ storageLimit: 100 }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
});
```

## When to Use

- **Development & Testing:** Quickly test agent logic without setting up a database.
- **Stateless Use Cases:** When conversation history is not needed between sessions or application runs.
- **Demos & Examples:** Simple setup for showcasing agent capabilities.
- **Caching Layers:** Could potentially be used as a short-term cache in more complex memory strategies (though not its primary design).

Avoid using `InMemoryStorage` in production environments where conversation history needs to be persistent.
