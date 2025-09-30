---
"@voltagent/postgres": patch
---

feat: add PostgresVectorAdapter for semantic search with vanilla PostgreSQL

## What Changed for You

The `@voltagent/postgres` package now includes `PostgresVectorAdapter` for storing and querying vector embeddings using vanilla PostgreSQL (no extensions required). This enables semantic search capabilities for conversation history, allowing agents to retrieve contextually relevant messages based on meaning rather than just keywords.

## New: PostgresVectorAdapter

```typescript
import { Agent, Memory, AiSdkEmbeddingAdapter } from "@voltagent/core";
import { PostgresMemoryAdapter, PostgresVectorAdapter } from "@voltagent/postgres";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new PostgresMemoryAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new PostgresVectorAdapter({
    connectionString: process.env.DATABASE_URL,
  }),
});

const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant with semantic memory",
  model: openai("gpt-4o-mini"),
  memory,
});

// Semantic search automatically enabled with userId + conversationId
const result = await agent.generateText("What did we discuss about the project?", {
  userId: "user-123",
  conversationId: "conv-456",
});
```

## Key Features

- **No Extensions Required**: Works with vanilla PostgreSQL (no pgvector needed)
- **BYTEA Storage**: Vectors stored efficiently as binary data using PostgreSQL's native BYTEA type
- **In-Memory Similarity**: Cosine similarity computed in-memory for accurate results
- **Automatic Setup**: Creates `voltagent_vectors` table and indexes automatically
- **Configurable**: Customize table name, vector dimensions, cache size, and retry logic
- **Production Ready**: Connection pooling, exponential backoff, LRU caching

## Configuration Options

```typescript
const vectorAdapter = new PostgresVectorAdapter({
  connectionString: process.env.DATABASE_URL,

  // Optional: customize table name (default: "voltagent_vector")
  tablePrefix: "custom_vector",

  // Optional: vector dimensions (default: 1536 for text-embedding-3-small)
  maxVectorDimensions: 1536,

  // Optional: LRU cache size (default: 100)
  cacheSize: 100,

  // Optional: connection pool size (default: 10)
  maxConnections: 10,
});
```

## How It Works

1. **Embedding Generation**: Messages are converted to vector embeddings using your chosen embedding model
2. **Binary Storage**: Vectors are serialized to binary (BYTEA) and stored in PostgreSQL
3. **In-Memory Similarity**: When searching, all vectors are loaded and cosine similarity is computed in-memory
4. **Context Merging**: Relevant messages are merged into conversation context automatically

## Why This Matters

- **Better Context Retrieval**: Find relevant past conversations even with different wording
- **Unified Storage**: Keep vectors and messages in the same PostgreSQL database
- **Zero Extensions**: Works with any PostgreSQL instance (12+), no extension installation needed
- **Cost Effective**: No separate vector database needed (Pinecone, Weaviate, etc.)
- **Familiar Tools**: Use standard PostgreSQL management and monitoring tools
- **Framework Parity**: Same `VectorStorageAdapter` interface as other providers

## Performance Notes

This adapter loads all vectors into memory for similarity computation, which works well for:

- **Small to medium datasets** (< 10,000 vectors)
- **Development and prototyping**
- **Applications where extension installation is not possible**

For large-scale production workloads with millions of vectors, consider specialized vector databases or PostgreSQL with pgvector extension for database-level similarity operations.

## Migration Notes

Existing PostgreSQL memory adapters continue to work without changes. Vector storage is optional and only activates when you configure both `embedding` and `vector` in the Memory constructor.
