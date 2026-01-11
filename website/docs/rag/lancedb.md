---
title: LanceDB Integration
slug: /rag/lancedb
---

# VoltAgent with LanceDB

[LanceDB](https://lancedb.com/) is a developer-friendly, serverless vector database for developers. It runs in-process (embedded) or in the cloud, making it perfect for both local prototyping and production scaling without managing infrastructure.

## Prerequisites

Before starting, ensure you have:

- Node.js 20+ installed
- OpenAI API key (for embeddings)
- (Optional) LanceDB Cloud account if deploying to production

## Installation

Create a new VoltAgent project with LanceDB integration:

```bash
npm create voltagent-app@latest -- --example with-lancedb
cd with-lancedb
```

This creates a complete VoltAgent + LanceDB setup with sample data and two different agent configurations.

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
# OpenAI API key for embeddings and LLM
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Custom path for local DB (defaults to .voltagent/lancedb)
# LANCEDB_URI=.voltagent/lancedb
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
🚀 VoltAgent with LanceDB is running!
Connected to LanceDB at .voltagent/lancedb
📋 Creating new table "voltagent-knowledge-base"...
📚 Generating embeddings for sample documents...
✅ Table "voltagent-knowledge-base" created with 3 records
📚 Two different agents are ready:
  1️⃣ Assistant with Retriever - Automatic semantic search on every interaction
  2️⃣ Assistant with Tools - LLM decides when to search autonomously

 ══════════════════════════════════════════════════
   VOLTAGENT SERVER STARTED SUCCESSFULLY
 ══════════════════════════════════════════════════
   ✓ HTTP Server:  http://localhost:3141
```

## How It Works

### Create the LanceDB Retriever

Create `src/retriever/index.ts`:

```typescript
import fs from "node:fs/promises";
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { connect } from "@lancedb/lancedb";
import { BaseRetriever, type BaseMessage, type RetrieveOptions } from "@voltagent/core";
import { embed } from "ai";

// Initialize LanceDB configuration
const dbUri = process.env.LANCEDB_URI || path.resolve(process.cwd(), ".voltagent/lancedb");
const tableName = "voltagent-knowledge-base";
```

**Key Components Explained**:

- **Embedded Database**: LanceDB runs locally within your Node.js process by default
- **Zero Config**: No servers to provision or manage
- **Path-based Storage**: Data persists in the `.voltagent/lancedb` directory

### Initialize Table and Sample Data

The example checks if the table exists and populates it if not:

```typescript
async function initializeIndex() {
  try {
    // Ensure directory exists
    if (!dbUri.startsWith("lancedb+")) {
      await fs.mkdir(path.dirname(dbUri), { recursive: true });
    }

    const db = await connect(dbUri);
    const tableNames = await db.tableNames();

    if (!tableNames.includes(tableName)) {
      console.log(`📋 Creating new table "${tableName}"...`);
      // ... generate embeddings ...
      await db.createTable(tableName, recordsWithEmbeddings);
    }
  } catch (error) {
    console.error("Error initializing LanceDB:", error);
  }
}
```

### Implement the Retriever Class

```typescript
export class LanceDBRetriever extends BaseRetriever {
  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    const db = await connect(dbUri);
    const table = await db.openTable(tableName);

    // 1. Determine search text
    let searchText = "";
    if (typeof input === "string") {
      searchText = input;
    } else if (Array.isArray(input)) {
      const lastMessage = input[input.length - 1];
      searchText =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : lastMessage.content.map((p) => (p.type === "text" ? p.text : "")).join(" ");
    }

    // 2. Generate Embedding
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: searchText,
    });

    // 3. Vector Search
    const results = await table.vectorSearch(embedding).limit(3).toArray();

    // 4. Format Output
    if (results.length === 0) return "No relevant documents found.";

    return results
      .map((doc, i) => `Document ${i + 1} (${doc.title}):\n${doc.text}`)
      .join("\n\n---\n\n");
  }
}
```

## Customization Options

### Different Embedding Models

You can swap OpenAI for other providers:

```typescript
// Using a larger model
const { embedding } = await embed({
  model: openai.embedding("text-embedding-3-large"),
  value: query,
});
```

### Adding Documents Programmatically

```typescript
async function addDocument(text: string, metadata: Record<string, any>) {
  const db = await connect(dbUri);
  const table = await db.openTable(tableName);

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });

  await table.add([
    {
      text,
      vector: embedding,
      ...metadata,
      timestamp: Date.now(),
    },
  ]);
}
```

### Filtering

LanceDB supports SQL-like filtering:

```typescript
const results = await table
  .vectorSearch(embedding)
  .where("category = 'documentation' AND timestamp > 1700000000")
  .limit(5)
  .toArray();
```

## Best Practices

**Storage**:

- For local dev, `.voltagent/lancedb` is great (git-ignore it).
- For production, store data in S3/GCS or use **LanceDB Cloud**.

**Performance**:

- Create an IVFFlat index for large datasets (>100k vectors) to speed up search.
- Use `table.createIndex()` for scalar columns you filter on frequently.

**Multimodal**:

- LanceDB isn't just for text! It natively stores images, audio, and more. You can store file paths or binary data in columns alongside your vectors.

## Troubleshooting

**Native Module Errors**:

- Ensure you are on a supported architecture (x64/arm64).
- If you see errors about `libssl` or GLIBC, try rebuilding: `npm rebuild @lancedb/lancedb`.

**Version Mismatches**:

- Ensure your embedding dimensions (e.g. 1536) match what you defined when creating the table. LanceDB infers schema from the first row, so be consistent.

**Lockfile Issues**:

- Local LanceDB uses file locks. Ensure you don't have multiple processes trying to write to the same table path simultaneously in strict modes.
