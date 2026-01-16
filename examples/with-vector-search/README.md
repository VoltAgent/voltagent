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
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
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

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent: Embeddings + Vector Search

This example shows how to enable semantic memory using embeddings and a vector database. Messages are embedded on save, stored in LibSQL via `LibSQLVectorAdapter`, and retrieved with semantic search when the agent answers.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-vector-search
```

## Highlights

- OpenAI embeddings via AI SDK (`text-embedding-3-small`)
- Vector DB via `LibSQLVectorAdapter`
- Automatic semantic recall in `Agent` when vector support exists
- Optional raw vector search API (`memory.searchSimilar`)

## Snippet

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter(),
});

const agent = new Agent({ name: "Semantic Memory Agent", model: "openai/gpt-4o-mini", memory });
new VoltAgent({ agents: { agent }, server: honoServer({ port: 3142 }) });
```

## Run Locally

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install deps and start:

```bash
pnpm i
pnpm dev
```

To observe semantic recall, seed a conversation with prior messages (see commented demo in `src/index.ts`), then ask a related question. The agent will merge relevant past messages using semantic search.
