---
id: retrieval
title: Retrieval
slug: retrieval
description: Add document retrieval (RAG) to your agents.
---

# Retrieval

Retrieval lets agents search and use information from your documents (RAG - Retrieval Augmented Generation).

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";
import { retriever } from "./retriever";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});

const agent = new Agent({
  name: "Assistant with Retrieval",
  instructions: "A helpful assistant that can retrieve information from documents",
  model: openai("gpt-4o-mini"),
  retriever: retriever,
  memory,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Creating a Custom Retriever

Extend the `BaseRetriever` class to create your own retriever:

```typescript
// retriever/index.ts
import { type BaseMessage, BaseRetriever, type RetrieveOptions } from "@voltagent/core";

// Your document data
const documents = [
  { title: "Getting Started", content: "VoltAgent is...", source: "docs" },
  { title: "API Reference", content: "The Agent class...", source: "api" },
];

class SimpleRetriever extends BaseRetriever {
  private documents: typeof documents;

  constructor(docs: typeof documents) {
    super({});
    this.documents = docs;
  }

  async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
    // Convert input to searchable string
    let searchText = "";

    if (typeof input === "string") {
      searchText = input;
    } else if (Array.isArray(input) && input.length > 0) {
      const lastMessage = input[input.length - 1];
      searchText = typeof lastMessage.content === "string" ? lastMessage.content : "";
    }

    // Simple keyword-based search
    const searchTerms = searchText.toLowerCase().split(/\s+/);
    const matchedDocs = this.documents.filter((doc) => {
      const content = doc.content.toLowerCase();
      return searchTerms.some((term) => content.includes(term));
    });

    if (matchedDocs.length === 0) {
      return "No relevant documents found.";
    }

    return matchedDocs.map((doc) => `Title: ${doc.title}\nContent: ${doc.content}`).join("\n\n");
  }
}

export const retriever = new SimpleRetriever(documents);
```

## Using as a Tool

You can also use the retriever as a tool for on-demand search:

```typescript
const agent = new Agent({
  name: "Assistant",
  instructions: "Use the search tool to find relevant information",
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
});
```

## Full Example

See the complete example: [with-retrieval on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-retrieval)
