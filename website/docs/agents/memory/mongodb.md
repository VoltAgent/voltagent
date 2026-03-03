---
title: MongoDB Memory
slug: /agents/memory/mongodb
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# MongoDB Memory

`MongoDBMemoryAdapter` stores VoltAgent conversations, conversation steps, workflow state, and working memory in MongoDB.

## Installation

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/mongodb
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/mongodb
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/mongodb
```

  </TabItem>
</Tabs>

## Minimal Setup

```ts
import { Agent, Memory } from "@voltagent/core";
import { MongoDBMemoryAdapter } from "@voltagent/mongodb";

const memory = new Memory({
  storage: new MongoDBMemoryAdapter({
    connection: process.env.MONGODB_URI!,
    database: process.env.MONGODB_DATABASE ?? "voltagent",
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

Example environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=voltagent
```

## Configuration Options

| Option             | Type      | Description                             |
| ------------------ | --------- | --------------------------------------- |
| `connection`       | `string`  | MongoDB connection URI                  |
| `database`         | `string`  | Database name (default: `voltagent`)    |
| `collectionPrefix` | `string`  | Collection prefix (default: `voltagent_memory`) |
| `debug`            | `boolean` | Enable debug logging (default: `false`) |

## Features

- Persists messages, conversations, conversation steps, workflow state, and working memory.
- Automatically creates the indexes needed for common conversation and workflow queries.
- Supports both local MongoDB deployments and hosted MongoDB Atlas clusters.
- Works well when your application stack already uses MongoDB as the primary database.

## Example: Custom Collection Prefix

```ts
import { Memory } from "@voltagent/core";
import { MongoDBMemoryAdapter } from "@voltagent/mongodb";

const memory = new Memory({
  storage: new MongoDBMemoryAdapter({
    connection: process.env.MONGODB_URI!,
    database: "voltagent",
    collectionPrefix: "support_bot",
  }),
});
```

This creates collections like:

- `support_bot_conversations`
- `support_bot_messages`
- `support_bot_workflow_states`
- `support_bot_steps`

## Learn More

- **[Memory Overview](./overview.md)** - Core memory concepts and adapter selection
- **[Working Memory](./working-memory.md)** - Maintain compact context across turns
- **[Semantic Search](./semantic-search.md)** - Add embedding-based retrieval on top of storage
