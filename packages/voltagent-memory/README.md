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
[![npm version](https://img.shields.io/npm/v/@voltagent/voltagent-memory.svg)](https://www.npmjs.com/package/@voltagent/voltagent-memory)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/voltagent-memory.svg)](https://www.npmjs.com/package/@voltagent/voltagent-memory)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/voltagent-memory

VoltAgent's managed memory adapter, backed by the VoltOps API. `ManagedMemoryAdapter` stores conversations, messages, working memory, and workflow state without you having to provision or operate a database, and `ManagedMemoryVectorAdapter` provides managed vector storage for RAG/retriever use cases.

---

## Install

```bash
npm install @voltagent/voltagent-memory
# or
yarn add @voltagent/voltagent-memory
# or
pnpm add @voltagent/voltagent-memory
```

## Setup

Managed memory requires a VoltOps project. Set your keys as environment variables, or pass a `voltOpsClient` explicitly:

```bash
VOLTAGENT_PUBLIC_KEY=...
VOLTAGENT_SECRET_KEY=...
```

## Usage

```typescript
import { Agent, Memory } from "@voltagent/core";
import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "my-database",
    // or: databaseId: "db_123"
  }),
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
  memory,
});
```

### Managed Memory Options

| Option          | Type            | Default | Description                                                           |
| --------------- | --------------- | ------- | --------------------------------------------------------------------- |
| `databaseId`    | `string`        | —       | Select a managed database by ID                                       |
| `databaseName`  | `string`        | —       | Select a managed database by name (used if `databaseId` is not set)   |
| `voltOpsClient` | `VoltOpsClient` | —       | Explicit VoltOps client; falls back to the globally registered client |
| `debug`         | `boolean`       | `false` | Enable debug logging                                                  |

Both `databaseId` and `databaseName` are optional individually, but at least one must be provided. If neither is given, `initialize()` throws an error because `findTargetDatabase()` cannot locate a target database and returns `undefined`.

## Vector Adapter

```typescript
import { ManagedMemoryVectorAdapter } from "@voltagent/voltagent-memory";

const vectorStore = new ManagedMemoryVectorAdapter({
  databaseName: "my-database",
});
```

`ManagedMemoryVectorAdapter` accepts the same options as `ManagedMemoryAdapter` above.

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Managed Memory](https://voltagent.dev/docs/agents/memory/managed-memory)
- [Memory Overview](https://voltagent.dev/docs/agents/memory/overview/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
