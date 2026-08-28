# @voltagent/redis

Redis memory storage adapter for [VoltAgent](https://voltagent.dev) agents. Stores conversations, messages, working memory, and workflow state in Redis for low-latency retrieval.

## Installation

```bash
npm install @voltagent/redis
```

## Usage

```ts
import { Agent, Memory } from "@voltagent/core";
import { RedisMemoryAdapter } from "@voltagent/redis";

const memory = new Memory({
  storage: new RedisMemoryAdapter({
    // Connection string or ioredis options object
    connection: process.env.REDIS_URL || "redis://localhost:6379",
    // Optional: prefix for all Redis keys (default: "voltagent")
    keyPrefix: "voltagent",
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

## Options

| Option       | Type               | Description                                        |
| ------------ | ------------------ | -------------------------------------------------- |
| `connection` | `string \| object` | Redis connection string or ioredis options object  |
| `keyPrefix`  | `string`           | Prefix for all Redis keys (default: `"voltagent"`) |
| `debug`      | `boolean`          | Enable debug logging (default: `false`)            |

## Persistence

Redis is an in-memory store. If you need durability, configure RDB snapshots and/or AOF on your Redis instance, or use a managed Redis provider. See the [documentation](https://voltagent.dev/docs/agents/memory/redis/) for data modeling details and persistence guidance.

## License

MIT
