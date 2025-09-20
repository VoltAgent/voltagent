---
title: A2A Server
description: Step-by-step guide for exposing VoltAgent over the Agent-to-Agent protocol.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# VoltAgent A2A Server Quick Start

Follow the steps below to let other agents talk to your VoltAgent application over the Agent-to-Agent (A2A) protocol.

## Install Packages

<Tabs>
  <TabItem value="pnpm" label="pnpm" default>
    ```bash
    pnpm add @voltagent/a2a-server @voltagent/server-hono
    ```
  </TabItem>
  <TabItem value="npm" label="npm">
    ```bash
    npm install @voltagent/a2a-server @voltagent/server-hono
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @voltagent/a2a-server @voltagent/server-hono
    ```
  </TabItem>
</Tabs>

`@voltagent/a2a-server` exposes VoltAgent agents via JSON-RPC. `@voltagent/server-hono` wires the routes into the default Hono server (feel free to swap it out for another framework later).

## Create An A2A Server Instance

```ts title="src/a2a/server.ts"
import { A2AServer } from "@voltagent/a2a-server";

export const a2aServer = new A2AServer({
  name: "support-agent",
  version: "0.1.0",
  description: "VoltAgent A2A example",
  provider: {
    organization: "Acme",
    url: "https://acme.example",
  },
});
```

The server metadata feeds the discovery card served from `/.well-known/{agentId}/agent-card.json`.

## Register The Server With VoltAgent

```ts title="src/voltagent.ts"
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { a2aServer } from "./a2a/server";
import { assistant } from "./agents/assistant";

export const voltAgent = new VoltAgent({
  agents: {
    assistant,
  },
  a2aServers: {
    a2aServer,
  },
  server: honoServer({ port: 3141 }),
});
```

With this in place, VoltAgent automatically exposes:

- `GET /.well-known/{agentId}/agent-card.json`
- `POST /a2a/{agentId}`

The JSON-RPC handler accepts `message/send`, `message/stream`, `tasks/get`, and `tasks/cancel` requests.

## Available Endpoints

| Method | Path                                     | Description                                                                                                      |
| ------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/.well-known/{agentId}/agent-card.json` | Returns the discovery card for the specified agent.                                                              |
| `POST` | `/a2a/{agentId}`                         | Accepts JSON-RPC 2.0 requests. Supported methods: `message/send`, `message/stream`, `tasks/get`, `tasks/cancel`. |

Example JSON-RPC payload for `message/send`:

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "message/send",
  "params": {
    "message": {
      "kind": "message",
      "role": "user",
      "messageId": "msg-1",
      "parts": [{ "kind": "text", "text": "Hello" }]
    }
  }
}
```

You can include an optional `context` object alongside the JSON-RPC payload to forward metadata such as `userId`, `sessionId`, or arbitrary `metadata` fields:

```json
{
  "context": {
    "userId": "user-42",
    "sessionId": "chat-1",
    "metadata": { "tenant": "acme" }
  },
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "message/send",
  "params": {
    /* ... */
  }
}
```

The context values surface inside the agent call so you can track callers or reuse an existing conversation identifier. `context.userId` is forwarded directly as the VoltAgent `userId` option, while `sessionId` and any nested `metadata` keys are merged into the agent's `options.context` map together with the request-level `params.metadata` and per-message `message.metadata` fields.

If you cannot modify the JSON body, send the same object as a JSON-encoded query parameter. VoltAgent reads `context` (or the legacy `runtimeContext`) from the query string and merges it with the body-provided values, letting the body override duplicated keys while metadata objects are combined.

```bash
curl \
  -X POST "http://localhost:3141/a2a/support-agent?context=%7B%22userId%22%3A%22user-42%22%7D" \
  -H "Content-Type: application/json" \
  -d '{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "message/send",
  "params": { "message": { "kind": "message", "role": "user", "messageId": "msg-1", "parts": [{ "kind": "text", "text": "Hello" }] } }
}'
```

## Configure Which Agents Are Exposed (Optional)

You can publish agents that are not part of the primary VoltAgent registry or filter the combined list before answering A2A requests:

```ts title="src/a2a/server.ts"
import { A2AServer } from "@voltagent/a2a-server";
import { assistant } from "./agents/assistant";
import { shadowAgent } from "./agents/shadow";

export const a2aServer = new A2AServer({
  name: "support-agent",
  version: "0.1.0",
  agents: {
    "shadow-agent": shadowAgent,
  },
  filterAgents: ({ items }) => items.filter((agent) => agent.id !== "internal"),
});
```

Configured agents appear alongside registry entries. The filter receives the merged list and can drop or reorder entries before discovery and JSON-RPC calls run.

VoltAgent already formats Server-Sent Events when you use `@voltagent/server-hono`, so no extra work is needed for streaming clients. If you forward chunks manually, serialize each payload with `safeStringify` and prepend `\x1E` before the JSON string.

## Provide A Different Task Store (Optional)

By default, `A2AServer` uses an in-memory store. Provide your own implementation (Redis, Postgres, KV…) by implementing the `TaskStore` interface:

```ts title="src/a2a/redis-store.ts"
import { createClient } from "redis";
import type { TaskRecord, TaskStore } from "@voltagent/a2a-server";

export class RedisTaskStore implements TaskStore {
  private client = createClient({ url: process.env.REDIS_URL });

  async load({ agentId, taskId }: { agentId: string; taskId: string }): Promise<TaskRecord | null> {
    const raw = await this.client.get(`${agentId}::${taskId}`);
    return raw ? (JSON.parse(raw) as TaskRecord) : null;
  }

  async save({ agentId, data }: { agentId: string; data: TaskRecord }): Promise<void> {
    await this.client.set(`${agentId}::${data.id}`, JSON.stringify(data));
  }
}
```

Pass the store during initialisation:

```ts title="src/a2a/server.ts"
import { RedisTaskStore } from "./redis-store";
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { assistant } from "../agents/assistant";

const redisTaskStore = new RedisTaskStore();

export const a2aServer = new A2AServer({
  name: "support-agent",
  version: "0.1.0",
});

export const voltAgent = new VoltAgent({
  agents: { assistant },
  a2aServers: { a2aServer },
  server: honoServer({ port: 3141 }),
});

a2aServer.initialize({
  agentRegistry: voltAgent.agentRegistry,
  taskStore: redisTaskStore,
});
```

Remember to implement TTL or pruning inside your custom store if you need to cap history growth.

## Run The Example Smoke Test

Create the example project and run its smoke test to ensure everything is wired correctly:

```bash
npm create voltagent-app@latest -- --example with-a2a-server
cd with-a2a-server
pnpm test:smoke
```

The test sends a `message/send`, streams a `message/stream`, and exercises `tasks/cancel` to verify streaming cancellation propagation.

## Troubleshooting checklist

- **404 for discovery card**: ensure the agent ID you request matches the key inside `VoltAgent({ agents: { ... } })`.
- **Unexpected JSON in SSE**: confirm you are stripping the `\x1E` prefix before parsing the JSON payload.
- **Cancellation not propagating**: verify you call `tasks/cancel` with the task ID from the stream and that your TaskStore preserves the `activeCancellations` set.
