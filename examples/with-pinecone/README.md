<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent with Pinecone Vector Database Integration</strong><br>
This example demonstrates how to integrate VoltAgent with Pinecone vector database for advanced knowledge management and retrieval.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

## VoltAgent with Pinecone

This example demonstrates VoltAgent integration with Pinecone vector database for RAG (Retrieval-Augmented Generation) capabilities. It includes two different agent configurations showcasing automatic and tool-based retrieval patterns.

## Prerequisites

- **Pinecone Account**: Create a free account at [pinecone.io](https://pinecone.io/)
- **Pinecone API Key**: Get your API key from the Pinecone console
- **OpenAI API Key**: Required for embeddings and language model

## Quick Start

**1. Create the project:**

```bash
npm create voltagent-app@latest -- --example with-pinecone
cd with-pinecone
```

**2. Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
PINECONE_API_KEY=your_pinecone_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**3. Install dependencies and run:**

```bash
npm install
npm run dev
```

## What's Included

- **Two Agent Types**: Automatic retrieval vs. tool-based retrieval
- **Auto Index Creation**: Automatically creates and populates Pinecone index
- **Pre-loaded Knowledge Base**: Sample documents about VoltAgent, Pinecone, RAG, and more
- **Vector Search**: Semantic search capabilities with Pinecone
- **Source Tracking**: References to used documents with similarity scores

## Environment Variables

| Variable           | Required | Description                          |
| ------------------ | -------- | ------------------------------------ |
| `PINECONE_API_KEY` | Yes      | Your Pinecone API key                |
| `OPENAI_API_KEY`   | Yes      | Your OpenAI API key (for embeddings) |

## Features

### Automatic Index Management

The example automatically:

- Creates a Pinecone index if it doesn't exist
- Populates the index with sample documents
- Uses OpenAI's `text-embedding-3-small` model for embeddings

### Two Agent Configurations

1. **Assistant with Retriever**: Automatically performs semantic search for every user query
2. **Assistant with Tools**: Uses the LLM to decide when to search the knowledge base

### Semantic Search

The Pinecone integration provides:

- High-performance vector similarity search
- Metadata filtering capabilities
- Scalable architecture for large document collections

## Customization

### Adding Your Own Documents

Modify the `sampleRecords` array in `src/retriever/index.ts` to add your own knowledge base:

```typescript
const sampleRecords = [
  {
    id: "your_doc_1",
    metadata: {
      text: "Your document content here...",
      category: "your_category",
      topic: "your_topic",
    },
  },
  // Add more documents...
];
```

### Index Configuration

You can customize the Pinecone index settings in `src/retriever/index.ts`:

```typescript
await pc.createIndex({
  name: indexName,
  dimension: 1536, // OpenAI text-embedding-3-small dimension
  metric: "cosine", // or 'euclidean', 'dotproduct'
  spec: {
    serverless: {
      cloud: "aws", // or 'gcp', 'azure'
      region: "us-east-1", // choose your preferred region
    },
  },
  waitUntilReady: true,
});
```

## Learn More

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
