---
title: Redis Memory
slug: /agents/memory/redis
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Redis Memory

`RedisMemoryAdapter` stores conversations in Redis for low-latency memory retrieval. It is a good fit for short-term conversational memory, working memory, or as a caching layer in front of slower persistent stores.

## Installation

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/redis
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/redis
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/redis
```

  </TabItem>
</Tabs>

## Configuration

```ts
import { Agent, Memory } from "@voltagent/core";
import { RedisMemoryAdapter } from "@voltagent/redis";

// Using connection string
const memory = new Memory({
  storage: new RedisMemoryAdapter({
    connection: process.env.REDIS_URL!,
    // or: "redis://localhost:6379"
  }),
});

// Using connection object (any ioredis options)
const memory = new Memory({
  storage: new RedisMemoryAdapter({
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

### Configuration Options

| Option       | Type               | Description                                                                                      |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| `connection` | `string \| object` | Connection string or [ioredis options](https://github.com/redis/ioredis#connect-to-redis) object |
| `keyPrefix`  | `string`           | Prefix for all Redis keys (default: `voltagent`)                                                 |
| `debug`      | `boolean`          | Enable debug logging (default: `false`)                                                          |

## Features

### Conversation Storage

- Messages stored per `conversationId` in Redis hashes, ordered by creation time in sorted sets
- All `StorageAdapter` methods supported
- Conversation indexes by resource, user, and globally for efficient lookups
- Supports filtering, pagination, and sorting
- No automatic message pruning - all messages are preserved until deleted. Note that the adapter never removes keys on its own, but a Redis eviction policy (e.g. `maxmemory-policy`) may still evict keys before they are explicitly deleted

### Working Memory

Supports both conversation and user-scoped working memory:

```ts
import { z } from "zod";

const memory = new Memory({
  storage: new RedisMemoryAdapter({
    connection: process.env.REDIS_URL!,
  }),
  workingMemory: {
    enabled: true,
    scope: "user", // or "conversation"
    schema: z.object({
      preferences: z.array(z.string()).optional(),
    }),
  },
});
```

Storage:

- Conversation scope: `${keyPrefix}:wm:conv:{conversationId}`
- User scope: `${keyPrefix}:wm:user:{userId}`

See [Working Memory](./working-memory.md) for configuration details.

## Data Modeling

The adapter maps memory structures to native Redis data types (assuming the default `voltagent` key prefix):

| Key pattern                             | Type   | Contents                                 |
| --------------------------------------- | ------ | ---------------------------------------- |
| `voltagent:conv:{id}`                   | STRING | Serialized conversation                  |
| `voltagent:convs:all`                   | ZSET   | Conversation ids scored by creation time |
| `voltagent:convs:resource:{resourceId}` | ZSET   | Conversation ids per resource            |
| `voltagent:convs:user:{userId}`         | ZSET   | Conversation ids per user                |
| `voltagent:msgs:{conversationId}`       | ZSET   | Message ids scored by creation time      |
| `voltagent:msgdata:{conversationId}`    | HASH   | Message id → serialized message          |
| `voltagent:steps:{conversationId}`      | ZSET   | Step ids scored by creation time         |
| `voltagent:stepdata:{conversationId}`   | HASH   | Step id → serialized step                |
| `voltagent:wm:conv:{conversationId}`    | STRING | Working memory (conversation scope)      |
| `voltagent:wm:user:{userId}`            | STRING | Working memory (user scope)              |
| `voltagent:wf:state:{executionId}`      | STRING | Serialized workflow state                |
| `voltagent:wf:all`                      | ZSET   | Execution ids scored by creation time    |
| `voltagent:wf:idx:{workflowId}`         | ZSET   | Execution ids per workflow               |
| `voltagent:wf:suspended:{workflowId}`   | SET    | Suspended execution ids per workflow     |

Multi-key writes are batched with Redis pipelines, and duplicate conversation creation is guarded by an atomic `SET ... NX`.

## Persistence Considerations

Redis is an in-memory store. By default, data can be lost on restart:

- **RDB snapshots**: Configure `save` directives in `redis.conf` (e.g. `save 900 1`) for periodic point-in-time snapshots.
- **AOF (Append Only File)**: Enable with `appendonly yes` for durable, per-write persistence. Use `appendfsync everysec` for a good durability/performance balance.
- **Managed Redis**: Providers like AWS ElastiCache, Upstash, or Redis Cloud handle persistence for you.

If you need durable long-term history, consider pairing Redis with a disk-based adapter such as [PostgreSQL](./postgres.md) or [LibSQL](./libsql.md), or use Redis primarily for working memory and short-term conversations.

## Memory Limits

Since Redis is memory-bound, very large or numerous conversation histories can consume significant RAM. Consider:

- Setting a `maxmemory` policy appropriate to your workload
- Using `keyPrefix` to isolate VoltAgent keys, making them easy to inspect (`SCAN`) or flush
- Periodically deleting old conversations via `deleteConversation`

## Connection Management

The adapter holds a single ioredis connection. Close it during graceful shutdown:

```ts
const storage = new RedisMemoryAdapter({ connection: process.env.REDIS_URL! });

process.on("SIGTERM", async () => {
  await storage.disconnect();
  process.exit(0);
});
```
