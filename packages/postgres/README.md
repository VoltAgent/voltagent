<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent Engineering Platform
</h3>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@voltagent/postgres.svg)](https://www.npmjs.com/package/@voltagent/postgres)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/postgres.svg)](https://www.npmjs.com/package/@voltagent/postgres)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/postgres

PostgreSQL adapters for VoltAgent: a memory adapter for conversations/messages/working memory/workflow state, and a vector adapter for embedding storage and cosine-similarity search. Both are backed by a `pg` connection pool and create their own tables on first use.

---

## Install

```bash
npm install @voltagent/postgres pg
# or
yarn add @voltagent/postgres pg
# or
pnpm add @voltagent/postgres pg
```

## Memory Adapter

`PostgreSQLMemoryAdapter` implements VoltAgent's `StorageAdapter` interface, storing conversations, messages, working memory, and workflow state in PostgreSQL.

```typescript
import { Agent, Memory } from "@voltagent/core";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new PostgreSQLMemoryAdapter({
    connection: process.env.DATABASE_URL,
    // or: { host, port, database, user, password, ssl }
  }),
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
  memory,
});
```

### Memory Options

| Option           | Type               | Default              | Description                                                          |
| ---------------- | ------------------ | -------------------- | -------------------------------------------------------------------- |
| `connection`     | `string \| object` | —                    | Connection string or `{ host, port, database, user, password, ssl }` |
| `maxConnections` | `number`           | `10`                 | Maximum connections in the pool                                      |
| `tablePrefix`    | `string`           | `"voltagent_memory"` | Prefix used for all created tables                                   |
| `schema`         | `string`           | `undefined`          | PostgreSQL schema to use for all tables                              |
| `debug`          | `boolean`          | `false`              | Enable debug logging                                                 |

## Vector Adapter

`PostgreSQLVectorAdapter` implements VoltAgent's `VectorAdapter` interface, providing persistent vector storage with cosine-similarity search for RAG and retriever use cases.

```typescript
import { PostgreSQLVectorAdapter } from "@voltagent/postgres";

const vectorStore = new PostgreSQLVectorAdapter({
  connection: process.env.DATABASE_URL,
});
```

### Vector Options

| Option                | Type               | Default              | Description                                                          |
| --------------------- | ------------------ | -------------------- | -------------------------------------------------------------------- |
| `connection`          | `string \| object` | —                    | Connection string or `{ host, port, database, user, password, ssl }` |
| `tablePrefix`         | `string`           | `"voltagent_vector"` | Prefix used for the created table                                    |
| `maxVectorDimensions` | `number`           | `1536`               | Maximum allowed vector dimensions                                    |
| `cacheSize`           | `number`           | `100`                | LRU cache size for fetched vectors                                   |
| `batchSize`           | `number`           | `100`                | Batch size for bulk operations                                       |
| `maxRetries`          | `number`           | `3`                  | Maximum retry attempts for database operations                       |
| `retryDelayMs`        | `number`           | `100`                | Initial retry delay (ms) for exponential backoff                     |
| `searchPath`          | `string`           | `undefined`          | Optional search path to set for each connection                      |
| `maxConnections`      | `number`           | `10`                 | Maximum connections in the pool                                      |
| `debug`               | `boolean`          | `false`              | Enable verbose logging                                               |

## Testing

See [README.integration.md](./README.integration.md) for running the integration test suite against a real PostgreSQL instance via Docker.

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Memory Overview](https://voltagent.dev/docs/agents/memory/overview/)
- [RAG Overview](https://voltagent.dev/docs/rag/overview/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
