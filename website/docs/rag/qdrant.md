---
title: Qdrant Integration
slug: /rag/qdrant
---

# VoltAgent with Qdrant

[Qdrant](https://qdrant.tech/) is an open-source vector database designed for scalable, high-performance semantic search and retrieval. It supports REST and gRPC APIs, advanced filtering, and is easy to self-host or use as a managed service.

## Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- Qdrant instance (local or cloud)
- Qdrant API key (if using cloud)
- OpenAI API key (for embeddings)

## Installation

Create a new VoltAgent project with Qdrant integration:

```bash
npm create voltagent-app@latest -- --example with-qdrant
cd with-qdrant
```

This creates a complete VoltAgent + Qdrant setup with sample data and two different agent configurations.

Install the dependencies:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm install
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm install
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn install
    ```
  </TabItem>
</Tabs>

## Environment Setup

Create a `.env` file with your configuration:

```env
# Qdrant URL
# docker run -p 6333:6333 qdrant/qdrant
QDRANT_URL=http://localhost:6333

# Qdrant API key (Optional)
QDRANT_API_KEY=your-qdrant-api-key-here

# OpenAI API key for embeddings and LLM
OPENAI_API_KEY=your-openai-api-key-here
```

## Run Your Application

Start your VoltAgent application:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm run dev
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm dev
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn dev
    ```
  </TabItem>
</Tabs>

You'll see:

```
🚀 VoltAgent with Qdrant is running!
📚 Two different agents are ready:
  1️⃣ Assistant with Retriever - Automatic semantic search on every interaction
  2️⃣ Assistant with Tools - LLM decides when to search autonomously

🔍 Try asking questions like:
  • 'What is VoltAgent?'
  • 'Tell me about vector databases'
  • 'How does Qdrant work?'
  • 'What is RAG?'

💡 The Tools Agent will automatically search when needed!

📋 Sources tracking: Both agents track which documents were used
   Check context.get('references') to see sources with IDs and scores
📋 Creating new collection "voltagent-knowledge-base"...


══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/deployment-docs/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
✅ Collection "voltagent-knowledge-base" created successfully
📚 Populating collection with sample documents...
✅ Successfully upserted 5 documents to collection
```

## Interact with Your Agents

Your agents are now running! To interact with them:

1. **Open the Console:** Click the [`https://console.voltagent.dev`](https://console.voltagent.dev) link in your terminal output (or copy-paste it into your browser).
2. **Find Your Agents:** On the VoltOps LLM Observability Platform page, you should see both agents listed:
   - "Assistant with Retriever"
   - "Assistant with Tools"
3. **Open Agent Details:** Click on either agent's name.
4. **Start Chatting:** On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5. **Test RAG Capabilities:** Try questions like:
   - "What is VoltAgent?"
   - "Tell me about Qdrant"
   - "How does vector search work?"
   - "What is RAG?"

You should receive responses from your AI agents that include relevant information from your Qdrant knowledge base, along with source references showing which documents were used to generate the response.

## How It Works

The following sections explain how this example is built and how you can customize it.

### Create the Qdrant Retriever

Create `src/retriever/index.ts`:

```typescript
import { BaseRetriever, type BaseMessage, type RetrieveOptions } from "@voltagent/core";
import { QdrantClient } from "@qdrant/js-client-rest";

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

const collectionName = "voltagent-knowledge-base";
```

**Key Components Explained**:

- **Qdrant Client**: Connects to Qdrant's REST API
- **Collection**: A named container for your vectors in Qdrant
- **Open Source & Cloud**: Use locally or as a managed service

### Initialize Collection and Sample Data

The example automatically creates and populates your Qdrant collection:

```typescript
async function initializeCollection() {
  try {
    // Check if collection exists
    let exists = false;
    try {
      await qdrant.getCollection(collectionName);
      exists = true;
      console.log(`📋 Collection "${collectionName}" already exists`);
    } catch (error) {
      console.log(`📋 Creating new collection "${collectionName}"...`);
    }

    // Create collection if it doesn't exist
    if (!exists) {
      await qdrant.createCollection(collectionName, {
        vectors: { size: 1536, distance: "Cosine" },
      });
      console.log(`✅ Collection "${collectionName}" created successfully`);
    }

    // Check if we need to populate with sample data
    const stats = await qdrant.count(collectionName);
    if (stats.count === 0) {
      console.log("📚 Populating collection with sample documents...");
      // Generate embeddings for sample documents using OpenAI
      const OpenAI = await import("openai");
      const openai = new OpenAI.default({
        apiKey: process.env.OPENAI_API_KEY!,
      });
      const points = [];
      for (const record of sampleRecords) {
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: record.payload.text,
          });
          points.push({
            id: record.id,
            vector: embeddingResponse.data[0].embedding,
            payload: record.payload,
          });
        } catch (error) {
          console.error(`Error generating embedding for ${record.id}:`, error);
        }
      }
      if (points.length > 0) {
        await qdrant.upsert(collectionName, { points });
        console.log(`✅ Successfully upserted ${points.length} documents to collection`);
      }
    } else {
      console.log(`📊 Collection already contains ${stats.count} documents`);
    }
  } catch (error) {
    console.error("Error initializing Qdrant collection:", error);
  }
}
```

**What This Does**:

- Creates a Qdrant collection with cosine similarity
- Generates embeddings using OpenAI's API
- Adds the embeddings and payloads to Qdrant

### Implement the Retriever Class

Create the main retriever class:

```typescript
// Retriever function
async function retrieveDocuments(query: string, topK = 3) {
  try {
    // Generate embedding for the query
    const OpenAI = await import("openai");
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingResponse.data[0].embedding;
    // Perform search in Qdrant
    const searchResults = (
      await qdrant.query(collectionName, {
        query: queryVector,
        limit: topK,
        with_payload: true,
      })
    ).points;
    // Format results
    return (
      searchResults.map((match: any) => ({
        content: match.payload?.text || "",
        metadata: match.payload || {},
        score: match.score || 0,
        id: match.id,
      })) || []
    );
  } catch (error) {
    console.error("Error retrieving documents from Qdrant:", error);
    return [];
  }
}

/**
 * Qdrant-based retriever implementation for VoltAgent
 */
export class QdrantRetriever extends BaseRetriever {
  /**
   * Retrieve documents from Qdrant based on semantic similarity
   * @param input - The input to use for retrieval (string or BaseMessage[])
   * @param options - Configuration and context for the retrieval
   * @returns Promise resolving to a formatted context string
   */
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    // Convert input to searchable string
    let searchText = "";
    if (typeof input === "string") {
      searchText = input;
    } else if (Array.isArray(input) && input.length > 0) {
      const lastMessage = input[input.length - 1];
      if (Array.isArray(lastMessage.content)) {
        const textParts = lastMessage.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text);
        searchText = textParts.join(" ");
      } else {
        searchText = lastMessage.content as string;
      }
    }
    // Perform semantic search using Qdrant
    const results = await retrieveDocuments(searchText, 3);
    // Add references to context if available
    if (options.context && results.length > 0) {
      const references = results.map((doc: any, index: number) => ({
        id: doc.id,
        title: doc.metadata.topic || `Document ${index + 1}`,
        source: "Qdrant Knowledge Base",
        score: doc.score,
        category: doc.metadata.category,
      }));
      options.context.set("references", references);
    }
    // Return the concatenated content for the LLM
    if (results.length === 0) {
      return "No relevant documents found in the knowledge base.";
    }
    return results
      .map(
        (doc: any, index: number) =>
          `Document ${index + 1} (ID: ${doc.id}, Score: ${doc.score.toFixed(4)}, Category: ${doc.metadata.category}):\n${doc.content}`
      )
      .join("\n\n---\n\n");
  }
}

// Create retriever instance
export const retriever = new QdrantRetriever();
```

### Create Your Agents

Now create agents using different retrieval patterns in `src/index.ts`:

```typescript
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

import { retriever } from "./retriever/index.js";

// Agent 1: Using retriever directly
const agentWithRetriever = new Agent({
  name: "Assistant with Retriever",
  instructions:
    "A helpful assistant that can retrieve information from the Qdrant knowledge base using semantic search to provide better answers. I automatically search for relevant information when needed.",
  model: "openai/gpt-4o-mini",
  retriever: retriever,
});

// Agent 2: Using retriever as tool
const agentWithTools = new Agent({
  name: "Assistant with Tools",
  instructions:
    "A helpful assistant that can search the Qdrant knowledge base using tools. The agent will decide when to search for information based on user questions.",
  model: "openai/gpt-4o-mini",
  tools: [retriever.tool],
});

// Create logger
const logger = createPinoLogger({
  name: "with-qdrant",
  level: "info",
});

new VoltAgent({
  agents: {
    agentWithRetriever,
    agentWithTools,
  },
  server: honoServer(), // Default port: 3141; enable Swagger via options if needed
  logger,
});
```
