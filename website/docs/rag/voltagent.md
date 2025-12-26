---
title: VoltAgent Knowledge Base
slug: /rag/voltagent
---

# VoltAgent Knowledge Base

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/rag-demo.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>

VoltAgent Knowledge Base is a **fully managed RAG service** that handles document ingestion, chunking, embedding, and semantic search - so you can focus on building your AI agent instead of managing infrastructure.

## Why Use VoltAgent Knowledge Base?

| Feature             | Self-Hosted (Chroma, Pinecone, etc.) | VoltAgent Knowledge Base  |
| ------------------- | ------------------------------------ | ------------------------- |
| Infrastructure      | You manage servers, scaling, backups | Fully managed             |
| Document Processing | Build your own pipeline              | Upload and go             |
| Chunking            | Implement yourself                   | Built-in strategies       |
| Embeddings          | Choose and pay for API               | Included                  |
| Analytics           | Build custom dashboards              | Built-in search analytics |
| Setup Time          | Hours to days                        | Minutes                   |

## Features

### Supported File Formats

Upload documents in any of these formats:

- **Documents**: PDF, DOCX, DOC, PPTX, PPT
- **Spreadsheets**: XLSX, XLS, CSV
- **Web**: HTML, HTM, XML
- **Markdown**: MD, MDX
- **Text**: TXT, JSON, VTT, PROPERTIES

### Chunking Strategies

VoltAgent automatically chunks your documents using smart strategies:

**Flat Mode** (Default)

- Splits on delimiter (default: `\n\n`)
- Configurable chunk size (100-4000 chars)
- Overlap support for context preservation

**Parent-Child Mode**

- Hierarchical chunking for better context
- Parent chunks for broad context
- Child chunks for precise matching
- Best for long documents with sections

### Semantic Search

- **Embedding Model**: e5-mistral-7b-it (4096 dimensions)
- **Vector Search**: pgvector with L2 distance
- **Tag Filtering**: Filter results by custom document tags

## Setup

### 1. Get Your API Keys

1. Go to [VoltAgent Console](https://console.voltagent.dev)
2. Create or select a project
3. Navigate to **Settings > API Keys**
4. Copy your Public Key and Secret Key

### 2. Create a Knowledge Base

1. In the Console, go to **RAG > Knowledge Bases**
2. Click **Create Knowledge Base**
3. Give it a name (you'll use this in your code)
4. Upload your documents

### 3. Configure Environment Variables

```bash title=".env"
# VoltAgent API Keys (required)
VOLTAGENT_PUBLIC_KEY=pk_your_public_key_here
VOLTAGENT_SECRET_KEY=sk_your_secret_key_here

# Optional: Custom API URL (for self-hosted)
# VOLTAGENT_API_BASE_URL=https://api.voltagent.dev

# Your LLM provider
OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Usage

### Option 1: Automatic Context Injection (Recommended)

The retriever automatically searches your knowledge base before each response and injects relevant context:

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { VoltAgentRagRetriever } from "@voltagent/core";

// Create the retriever
const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "my-knowledge-base", // Your KB name from Console
  topK: 8,
  includeSources: true,
});

// Create agent with retriever
const agent = new Agent({
  name: "RAG Assistant",
  instructions:
    "A helpful assistant that searches your knowledge base and uses relevant context to answer.",
  model: openai("gpt-4o-mini"),
  retriever, // Automatic context injection
});

new VoltAgent({
  agents: { agent },
});

// The agent now automatically searches before responding
const result = await agent.generateText("What is our return policy?");
console.log(result.text);
// "According to our policy, you have 30 days to return..."
```

### Option 2: Tool-Based Retrieval

Let the agent decide when to search using the retriever as a tool:

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { VoltAgentRagRetriever } from "@voltagent/core";

const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "my-knowledge-base",
  topK: 8,
  includeSources: true,
});

const agent = new Agent({
  name: "RAG Assistant (Tool-based)",
  instructions:
    "Call the search_knowledge_base tool whenever you need to look something up from the knowledge base.",
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool], // Use as a tool
});

new VoltAgent({
  agents: { agent },
});
```

**When to use each approach:**

| Approach                    | Best For                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| Automatic (retriever)       | Q&A bots, documentation assistants, support agents                      |
| Tool-based (retriever.tool) | General assistants, multi-step tasks, agents that don't always need RAG |

## Configuration Options

| Option               | Type            | Default                   | Description                            |
| -------------------- | --------------- | ------------------------- | -------------------------------------- |
| `knowledgeBaseName`  | `string`        | **required**              | Name of your knowledge base in Console |
| `topK`               | `number`        | `8`                       | Number of chunks to retrieve           |
| `tagFilters`         | `array`         | `null`                    | Filter by document tags                |
| `maxChunkCharacters` | `number`        | `2000`                    | Max characters per chunk in response   |
| `includeSources`     | `boolean`       | `true`                    | Include document name and chunk index  |
| `includeSimilarity`  | `boolean`       | `false`                   | Include similarity scores              |
| `voltOpsClient`      | `VoltOpsClient` | auto                      | Custom client instance (see below)     |
| `toolName`           | `string`        | `"search_knowledge_base"` | Custom tool name                       |
| `toolDescription`    | `string`        | (default)                 | Custom tool description                |

### VoltOpsClient Configuration

By default, `VoltAgentRagRetriever` automatically creates a `VoltOpsClient` using environment variables:

- `VOLTAGENT_PUBLIC_KEY` - Your project's public key
- `VOLTAGENT_SECRET_KEY` - Your project's secret key
- `VOLTAGENT_API_BASE_URL` - Optional, defaults to `https://api.voltagent.dev`

If you need custom configuration, you can pass your own client:

```typescript
import { VoltOpsClient } from "@voltagent/core";
import { VoltAgentRagRetriever } from "@voltagent/core";

const voltOpsClient = new VoltOpsClient({
  baseUrl: "https://api.voltagent.dev",
  publicKey: "pk_...",
  secretKey: "sk_...",
});

const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "my-knowledge-base",
  voltOpsClient, // Use custom client
});
```

### Tag Filtering

Filter search results by document tags:

```typescript
const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "my-knowledge-base",
  topK: 8,
  tagFilters: [
    { tagName: "category", tagValue: "policies" },
    { tagName: "department", tagValue: "hr" },
  ],
});
```

## Accessing Retrieved References

After generation, you can access the raw chunk references:

```typescript
const result = await agent.generateText("What is our return policy?");

// Get the retrieved chunk references
const references = result.context.get("rag.references");

console.log(references);
// [
//   {
//     documentId: "doc-123",
//     documentName: "return-policy.pdf",
//     chunkIndex: 2,
//     similarity: 0.892
//   },
//   ...
// ]
```

This is useful for:

- Showing source citations to users
- Building "Learn more" links
- Debugging retrieval quality

## Managing Knowledge Bases

### Console UI

The VoltAgent Console provides a full UI for managing your knowledge bases:

1. **Create Knowledge Bases** - Name, description, chunking config
2. **Upload Documents** - Drag & drop, batch upload
3. **Monitor Processing** - Track document ingestion status
4. **View Analytics** - Search volume, latency, success rates
5. **Browse Chunks** - Inspect how documents were chunked

### Chunking Configuration

When creating a knowledge base, you can configure chunking:

**Flat Mode:**

```json
{
  "mode": "flat",
  "delimiter": "\n\n",
  "maxSize": 1024,
  "minSize": 1,
  "overlap": 50
}
```

**Parent-Child Mode:**

```json
{
  "mode": "parent-child",
  "parent": {
    "mode": "paragraph",
    "delimiter": "\n\n",
    "maxSize": 1024,
    "maxTokens": 10000
  },
  "child": {
    "maxSize": 512,
    "minSize": 1,
    "overlap": 50,
    "delimiter": "\n"
  }
}
```

## Try the Example

Get started quickly with our example project:

```bash
npm create voltagent-app@latest -- --example with-voltops-retrieval
```

This example includes:

- VoltAgentRagRetriever setup
- Both automatic and tool-based patterns
- Memory integration with LibSQL
- Hono server for API endpoints

## Best Practices

### 1. Choose the Right Chunking Strategy

- **Flat mode**: Best for short documents, FAQs, structured content
- **Parent-child mode**: Best for long documents, manuals, articles with sections

### 2. Optimize topK

Start with `topK: 8` and adjust based on:

- Too few results? Increase topK
- Irrelevant context? Decrease topK or improve document quality

### 3. Use Tags for Multi-Tenant Apps

Use tag filters to scope searches per user or organization:

```typescript
const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "shared-kb",
  tagFilters: [{ tagName: "tenant_id", tagValue: user.tenantId }],
});
```

### 4. Monitor with Analytics

Check the Console analytics to:

- Track search volume and latency
- Identify common queries
- Spot failed searches

## Next Steps

- [Build Your Own Retriever](/docs/rag/custom-retrievers) - Create custom retrievers for other data sources
- [Chroma Guide](/docs/rag/chroma) - Self-hosted vector database option
- [Pinecone Guide](/docs/rag/pinecone) - Managed vector database alternative
- [GitHub Examples](https://github.com/voltagent/voltagent/tree/main/examples) - More code examples
