---
title: Overview
slug: /rag/overview
---

# RAG: Give Your AI Agent a Memory

Ever wished your AI agent could remember your company's documentation, search your database, or know about events that happened after its training? That's exactly what RAG (Retrieval-Augmented Generation) does.

## The Problem

Without RAG, your AI agent is like a smart person with amnesia:

```typescript
// ❌ Without RAG - agent only knows training data
const agent = new Agent({
  name: "Support Bot",
  instructions: "Help customers with our product",
});

// User: "What's our return policy?"
// Agent: "I don't have access to your specific return policy..."
```

## The Solution

With RAG, your agent can search and use your actual data:

```typescript
// ✅ With RAG - agent searches your knowledge base
const agent = new Agent({
  name: "Support Bot",
  instructions: "Help customers with our product",
  retriever: myKnowledgeBase, // 🔥 This is the magic
});

// User: "What's our return policy?"
// Agent: "According to our policy document, you have 30 days..."
// Sources: [{ title: "Return Policy", url: "docs/returns.md" }]
```

## What You'll Build

By the end of this guide, you'll have an AI agent that can:

- Search through your documents instantly
- Pull relevant info from databases
- Give accurate answers with sources
- Track where information came from
- Stay up-to-date with your latest data

## How It Works (2 Ways)

VoltAgent gives you two ways to add RAG to your agents:

### Option 1: Always-On Search

```typescript
const agent = new Agent({
  name: "Smart Assistant",
  retriever: mySearchEngine, // Searches before every response
});
```

**When to use**: Support bots, documentation assistants, Q&A systems

### Option 2: Search When Needed

```typescript
const agent = new Agent({
  name: "Smart Assistant",
  tools: [mySearchEngine.tool], // Agent decides when to search
});
```

**When to use**: General assistants, complex workflows, multi-step tasks

## Works With Any Database

The best part? VoltAgent doesn't lock you into any specific database. All retrievers extend the same `BaseRetriever` class, so switching is easy:

```typescript
import { BaseRetriever } from "@voltagent/core";

// Start with local files
class FileRetriever extends BaseRetriever {
  async retrieve(input, options) {
    const query = typeof input === "string" ? input : input[input.length - 1].content;
    // Search local files
    const results = await this.searchFiles(query);
    return results.join("\n\n");
  }
}

// Later switch to PostgreSQL
class PostgreSQLRetriever extends BaseRetriever {
  async retrieve(input, options) {
    const query = typeof input === "string" ? input : input[input.length - 1].content;
    // Search PostgreSQL with pgvector
    const results = await this.searchPostgreSQL(query);
    return results.map((row) => row.content).join("\n\n");
  }
}

// Agent code stays exactly the same! 🎉
const agent = new Agent({
  retriever: new FileRetriever(), // Just swap the class
});
```

**Supported patterns:**

- Vector DBs: Chroma, Pinecone, Weaviate, Qdrant
- SQL: PostgreSQL, MySQL, SQLite
- NoSQL: MongoDB, Redis
- Search: Elasticsearch, Algolia
- Files: PDF, Word, CSV, JSON
- APIs: REST, GraphQL

## Integration Examples

### VoltAgent Knowledge Base (Recommended)

The fastest way to add RAG to your agent. Fully managed - just upload documents and start searching.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/rag-demo.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

```typescript
import { Agent, VoltAgentRagRetriever } from "@voltagent/core";

const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "my-docs",
  topK: 8,
  includeSources: true,
});

const agent = new Agent({
  name: "Support Bot",
  retriever, // Automatic context injection
});
```

- No infrastructure to manage
- Built-in document processing & chunking
- Search analytics in Console

[**→ VoltAgent Knowledge Base Guide**](/docs/rag/voltagent)

### Build Your Own Retriever

Connect to your own database, API, or files with a custom retriever.

```typescript
class MyRetriever extends BaseRetriever {
  async retrieve(input, options) {
    const query = typeof input === "string" ? input : input[input.length - 1].content;
    const results = await this.searchMyData(query);

    // Track sources using context
    if (options.context) {
      options.context.set(
        "sources",
        results.map((r) => r.source)
      );
    }

    return results.map((r) => r.content).join("\n\n");
  }
}
```

[**→ Build Your Own Retriever**](/docs/rag/custom-retrievers)

### Chroma Vector Database

Perfect for beginners. Run locally with Docker and get started immediately.

```bash
# Start Chroma server
npm run chroma run

# Try the example
npm create voltagent-app@latest -- --example with-chroma
```

[**→ Full Chroma Guide**](/docs/rag/chroma)

### Pinecone Vector Database

Production-ready managed vector database with serverless scaling and enterprise features.

```bash
# No setup needed - fully managed service
# Just get your API key and run

npm create voltagent-app@latest -- --example with-pinecone
```

[**→ Full Pinecone Guide**](/docs/rag/pinecone)

### Qdrant Vector Database

Qdrant (read: quadrant) is an open-source vector search engine. It provides a production-ready service to store, search, and manage vectors with additional payload and extended filtering support.

```bash
npm create voltagent-app@latest -- --example with-qdrant
```

[**→ Full Qdrant Guide**](/docs/rag/qdrant)

## Choose Your Path

**I want the fastest setup** → [VoltAgent Knowledge Base](/docs/rag/voltagent) (5 mins)

**I want to try locally** → [Chroma Tutorial](/docs/rag/chroma) (10 mins)

**I want production-ready** → [Pinecone Tutorial](/docs/rag/pinecone) (15 mins)

**I want open-source and production-ready** → [Qdrant Tutorial](/docs/rag/qdrant) (10 mins)

**I want to build custom** → [Build Your Own Retriever](/docs/rag/custom-retrievers)

**I want to see examples** → [GitHub Examples](https://github.com/voltagent/voltagent/tree/main/examples)

**I need help choosing** → Join our [Discord](https://s.voltagent.dev/discord) and ask!
