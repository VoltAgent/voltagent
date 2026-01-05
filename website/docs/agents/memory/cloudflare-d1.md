---
title: Cloudflare D1 Memory
slug: /agents/memory/cloudflare-d1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Cloudflare D1 Memory

`D1MemoryAdapter` stores conversations in Cloudflare D1 for Workers deployments.

## Installation

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/cloudflare-d1
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/cloudflare-d1
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/cloudflare-d1
```

  </TabItem>
</Tabs>

## Cloudflare D1 binding

Add a D1 binding to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "voltagent"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Configuration (Workers)

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { D1MemoryAdapter } from "@voltagent/cloudflare-d1";
import { serverlessHono } from "@voltagent/serverless-hono";
import type { D1Database } from "@cloudflare/workers-types";

import { weatherTool } from "./tools";

type Env = {
  DB: D1Database;
  OPENAI_API_KEY: string;
};

const createWorker = (env: Env) => {
  const memory = new Memory({
    storage: new D1MemoryAdapter({
      binding: env.DB,
      tablePrefix: "voltagent_memory",
    }),
  });

  const agent = new Agent({
    name: "Assistant",
    model: openai("gpt-4o-mini"),
    tools: [weatherTool],
    memory,
  });

  const voltAgent = new VoltAgent({
    agents: { agent },
    serverless: serverlessHono(),
  });

  return voltAgent.serverless().toCloudflareWorker();
};

let cached: ReturnType<typeof createWorker> | undefined;

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
    if (!cached) {
      cached = createWorker(env);
    }

    return cached.fetch(request, env, ctx);
  },
};
```

### Configuration Options

| Option         | Type         | Description                                              |
| -------------- | ------------ | -------------------------------------------------------- |
| `binding`      | `D1Database` | Worker D1 binding (required)                             |
| `tablePrefix`  | `string`     | Table name prefix (default: `voltagent_memory`)          |
| `maxRetries`   | `number`     | Retry count for busy/locked DB operations (default: `3`) |
| `retryDelayMs` | `number`     | Initial backoff delay in ms (default: `100`)             |
| `debug`        | `boolean`    | Enable debug logging (default: `false`)                  |
| `logger`       | `Logger`     | Optional logger for structured logging                   |

## Features

### Automatic Schema Creation

Tables are created automatically on first use:

- `${tablePrefix}_users`
- `${tablePrefix}_conversations`
- `${tablePrefix}_messages`
- `${tablePrefix}_workflow_states`
- `${tablePrefix}_steps`

### Conversation Storage

- Messages stored per `userId` and `conversationId`
- All `StorageAdapter` methods supported
- No automatic message pruning - all messages are preserved

### Working Memory

Supports both conversation and user-scoped working memory:

```ts
import { z } from "zod";

const memory = new Memory({
  storage: new D1MemoryAdapter({ binding: env.DB }),
  workingMemory: {
    enabled: true,
    scope: "conversation", // or "user"
    schema: z.object({
      preferences: z.array(z.string()).optional(),
    }),
  },
});
```

See [Working Memory](./working-memory.md) for configuration details.

### Semantic Search (Optional)

D1 provides storage only. To enable semantic search, pair it with an embedding + vector adapter (for example, `AiSdkEmbeddingAdapter` and `InMemoryVectorAdapter`).

See [Semantic Search](./semantic-search.md) for usage.

## Learn More

- **[Working Memory](./working-memory.md)** - Maintain compact context
- **[Semantic Search](./semantic-search.md)** - Vector search configuration
