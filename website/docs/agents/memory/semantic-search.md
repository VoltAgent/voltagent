---
title: Semantic Search
slug: /agents/memory/semantic-search
---

# Semantic Search

Semantic search retrieves past messages by similarity. It requires:

- An embedding adapter to create vectors from text
- A vector adapter to store and search vectors

The core provides `AiSdkEmbeddingAdapter` and `InMemoryVectorAdapter`. For persistent vectors, use `LibSQLVectorAdapter` from `@voltagent/libsql`.

## Configuration

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  // Option A (dev):
  // vector: new InMemoryVectorAdapter(),
  // Option B (persistent vectors):
  vector: new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" }),
  enableCache: true, // optional cache for embeddings
});

const agent = new Agent({ name: "assistant", model: openai("gpt-4o-mini"), memory });
```

### Call Options

Enable semantic search per call using `semanticMemory` (defaults shown below):

```ts
const out = await agent.generateText("What did we decide about pricing?", {
  userId: "u1",
  conversationId: "c1",
  semanticMemory: {
    enabled: true, // default: true when vector support is present
    semanticLimit: 5, // default
    semanticThreshold: 0.7, // default
    mergeStrategy: "append", // default ('prepend' | 'append' | 'interleave')
  },
});
```

## Behavior

When vectors are configured, `Memory` embeds text parts of messages and stores them with IDs:

- `msg_${conversationId}_${message.id}`

Each vector has metadata:

- `messageId`, `conversationId`, `userId`, `role`, `createdAt`

On read with semantic search enabled:

1. Embed the current query.
2. Search similar vectors with `limit` and `threshold`.
3. Load the matching messages.
4. Merge with recent messages using `mergeStrategy`.

## Programmatic Search

`Memory` also exposes a direct API:

- `hasVectorSupport() → boolean`
- `searchSimilar(query: string, { limit?, threshold?, filter? }) → Promise<SearchResult[]>`

The in‑memory vector adapter uses cosine similarity and supports a metadata `filter` on stored items.

LibSQL vector adapter persists vectors as BLOBs with metadata and supports `limit`, `threshold`, and metadata `filter`. For tests, prefer `url: ":memory:"` (or `"file::memory:"`); for production, use a file path (e.g., `file:./.voltagent/memory.db`) or a remote Turso URL.

Note on defaults:

- Semantic memory auto‑enables when you pass `userId` and `conversationId` and your `Memory` has both an embedding and a vector adapter.
- Default merge strategy is `append` to preserve recency first and attach semantically similar messages afterwards.

## Embedding Details

`AiSdkEmbeddingAdapter` wraps ai‑sdk embedding models. It supports:

- Single and batch embedding
- Optional normalization (`normalize: boolean`)
- Basic batching (`maxBatchSize`) and a simple in‑process cache (`enableCache`, `cacheSize`, `cacheTTL` on `Memory`)

The embedding dimensions are inferred after the first call.
