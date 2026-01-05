# @voltagent/cloudflare-d1

Cloudflare D1 storage adapter for VoltAgent Memory V2.

## Installation

```bash
pnpm add @voltagent/cloudflare-d1
```

## Usage

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
    name: "serverless-assistant",
    instructions: "Answer user questions quickly.",
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

## Options

- `binding` (required): Cloudflare D1 binding from the Worker env.
- `tablePrefix`: Customize the table name prefix. Default is `voltagent_memory`.
- `maxRetries`: Retry count for busy/locked database operations. Default is `3`.
- `retryDelayMs`: Initial backoff delay in milliseconds. Default is `100`.
- `debug`: Enable debug logging. Default is `false`.
- `logger`: Provide a custom logger.
