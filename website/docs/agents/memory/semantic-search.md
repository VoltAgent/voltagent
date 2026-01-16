---
title: Semantic Search
slug: /agents/memory/semantic-search
---

# Semantic Search

Semantic search retrieves past messages by similarity rather than recency. It requires an embedding adapter (text to vectors) and a vector adapter (storage and search).

## Configuration

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" }), // or InMemoryVectorAdapter() for dev
  enableCache: true, // optional embedding cache
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

### Available Adapters

**Embedding:**

- `AiSdkEmbeddingAdapter` - Wraps any AI SDK embedding model

**Vector Storage:**

- `InMemoryVectorAdapter` (`@voltagent/core`) - Development only
- `LibSQLVectorAdapter` (`@voltagent/libsql`) - Persistent vectors in SQLite/LibSQL/Turso
- `PostgresVectorAdapter` (`@voltagent/postgres`) - Persistent vectors in Postgres with pgvector
- `ManagedMemoryVectorAdapter` (`@voltagent/voltagent-memory`) - VoltOps-hosted vectors

## Usage

Enable semantic search per generation call:

```ts
const result = await agent.generateText("What pricing model did we discuss?", {
  userId: "user-123",
  conversationId: "thread-abc",
  semanticMemory: {
    enabled: true, // default: auto-enabled when vector support is present
    semanticLimit: 5, // number of similar messages to retrieve
    semanticThreshold: 0.7, // minimum similarity score (0-1)
    mergeStrategy: "append", // "prepend" | "append" | "interleave"
  },
});
```

### Default Behavior

When `embedding` and `vector` adapters are configured:

- Semantic search auto-enables for calls with `userId` and `conversationId`
- Default `semanticLimit`: 5 messages
- Default `semanticThreshold`: 0.7
- Default `mergeStrategy`: `"append"` (recent messages first, then similar messages)

### Merge Strategies

- **`append`** (default): `[recent messages] + [similar messages]` - preserves chronological order
- **`prepend`**: `[similar messages] + [recent messages]` - emphasizes relevance
- **`interleave`**: Alternates between similar and recent messages

## How It Works

### On Message Save

When saving messages, the `Memory` class:

1. Extracts text content from `UIMessage.parts`
2. Generates embeddings via the embedding adapter
3. Stores vectors with metadata:
   - ID: `msg_${conversationId}_${message.id}`
   - Metadata: `{ messageId, conversationId, userId, role, createdAt }`

### On Message Retrieval

When semantic search is enabled:

1. Embed the current query
2. Search for similar vectors using the vector adapter
3. Retrieve matching messages by ID
4. Merge with recent messages using the configured strategy
5. Remove duplicates (messages in both sets)

## Programmatic API

Direct search without agent generation:

```ts
// Check if vectors are configured
const hasVectors = memory.hasVectorSupport(); // boolean

// Search similar messages
const results = await memory.searchSimilar("pricing discussion", {
  limit: 10,
  threshold: 0.8,
  filter: { userId: "user-123", conversationId: "thread-abc" },
});

for (const result of results) {
  console.log(result.id, result.score, result.metadata);
}
```

## Embedding Cache

Enable caching to avoid re-embedding identical text:

```ts
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" }),
  enableCache: true, // enable cache
  cacheSize: 1000, // max entries (default: 1000)
  cacheTTL: 3600000, // TTL in ms (default: 1 hour)
});
```

The cache stores `text → vector` mappings in memory with LRU eviction.

## Vector Adapters

### InMemoryVectorAdapter

```ts
import { InMemoryVectorAdapter } from "@voltagent/core";

const vector = new InMemoryVectorAdapter();
```

- Uses cosine similarity
- Supports metadata filtering
- Lost on restart (use for development only)

### LibSQLVectorAdapter

```ts
import { LibSQLVectorAdapter } from "@voltagent/libsql";

// Local SQLite
const vector = new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" });

// In-memory (testing)
const vector = new LibSQLVectorAdapter({ url: ":memory:" });

// Turso
const vector = new LibSQLVectorAdapter({
  url: "libsql://your-db.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

- Stores vectors as BLOBs
- Supports metadata filtering and thresholds
- Persistent across restarts

### ManagedMemoryVectorAdapter

```ts
import { ManagedMemoryVectorAdapter } from "@voltagent/voltagent-memory";

const vector = new ManagedMemoryVectorAdapter({
  databaseName: "production-memory",
  // voltOpsClient optional (auto-resolves from environment)
});
```

- VoltOps-hosted vectors with zero setup
- See [Managed Memory](./managed-memory.md) for configuration

## Example: Full Semantic Search Setup

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" }),
  enableCache: true,
});

const agent = new Agent({
  name: "Research Assistant",
  instructions: "Help users recall past discussions and find relevant information.",
  model: "openai/gpt-4o-mini",
  memory,
});

// Semantic search automatically enabled
const result = await agent.generateText(
  "What did we decide about the API authentication approach?",
  {
    userId: "user-123",
    conversationId: "project-alpha",
    semanticMemory: {
      semanticLimit: 10,
      semanticThreshold: 0.75,
    },
  }
);
```

## Learn More

- **[Working Memory](./working-memory.md)** - Maintain compact context across turns
- **[Managed Memory](./managed-memory.md)** - Zero-setup vector storage
- **[LibSQL / Turso](./libsql.md)** - Self-hosted vector storage
