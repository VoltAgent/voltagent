---
title: Resumable Streaming
slug: /agents/resumable-streaming
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Resumable Streaming

Resumable streaming lets a client reconnect to an in-flight stream (for example after a refresh) and continue receiving the same response. VoltAgent provides this via `@voltagent/resumable-streams`.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/resumable-stream.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Install

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>
    ```bash
    npm install @voltagent/resumable-streams
    ```
  </TabItem>
  <TabItem value="yarn" label="yarn">
    ```bash
    yarn add @voltagent/resumable-streams
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm add @voltagent/resumable-streams
    ```
  </TabItem>
</Tabs>

## How it works

Resumable streaming is split into two storages:

1. **Stream store**: stores stream chunks and pub/sub messages.
2. **Active stream store**: maps `userId + "-" + conversationId` -> `streamId`.

When a stream starts, a new `streamId` is created, the stream store persists the output, and the active stream store is updated. When the client reconnects, the active stream store is used to find the `streamId`, and the stream store resumes from the last position. When the stream finishes, the active stream store entry is cleared.

## Basic usage (Hono server)

Create a Redis-backed store, build the adapter, and pass it to the Hono server.

```ts
import { Agent, VoltAgent } from "@voltagent/core";
import {
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";
import { honoServer } from "@voltagent/server-hono";

const streamStore = await createResumableStreamRedisStore();
const resumableStream = await createResumableStreamAdapter({ streamStore });

const agent = new Agent({
  id: "assistant",
  name: "Resumable Stream Agent",
  instructions: "You are a helpful assistant.",
  model: "openai/gpt-4o-mini",
});

new VoltAgent({
  agents: { assistant: agent },
  server: honoServer({
    resumableStream: { adapter: resumableStream },
  }),
});
```

By default, the adapter uses `streamStore` as the `activeStreamStore`.  
For production, use a shared stream store (Redis) so multiple instances can resume.

### Enabling resumable streams

Resumable streams are **opt-in**. You must set:

- `options.resumableStream: true`
- `options.conversationId`
- `options.userId`

```ts
await fetch(`${baseUrl}/agents/${agentId}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: `{"input":"Hello!","options":{"conversationId":"conv-1","userId":"user-1","resumableStream":true}}`,
});
```

### Server-level default (optional)

If you want resumable streaming enabled by default, set it at the server level and omit the per-request flag. You can still opt out by sending `options.resumableStream: false`.

```ts
new VoltAgent({
  agents: { assistant: agent },
  server: honoServer({
    resumableStream: {
      adapter: resumableStream,
      defaultEnabled: true,
    },
  }),
});
```

### Resume endpoint

The Hono server exposes:

- `GET /agents/:id/chat/:conversationId/stream?userId=...`

If there is no active stream, it returns `204`. `userId` is required.

## Store options

### VoltOps managed store

`createResumableStreamVoltOpsStore` stores streams in VoltOps. It uses:

- the global `VoltOpsClient` if one is already configured by `VoltAgent`, or
- your explicit `voltOpsClient`, or
- `VOLTAGENT_PUBLIC_KEY` + `VOLTAGENT_SECRET_KEY` from env.

```ts
import {
  createResumableStreamAdapter,
  createResumableStreamVoltOpsStore,
} from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamVoltOpsStore();
const adapter = await createResumableStreamAdapter({ streamStore });
```

If you need a custom base URL, pass `baseUrl` or set `VOLTAGENT_API_BASE_URL`.

Custom VoltOps client:

```ts
import { VoltOpsClient } from "@voltagent/core";
import {
  createResumableStreamAdapter,
  createResumableStreamVoltOpsStore,
} from "@voltagent/resumable-streams";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const streamStore = await createResumableStreamVoltOpsStore({ voltOpsClient });
const adapter = await createResumableStreamAdapter({ streamStore });
```

### Redis store (recommended)

`createResumableStreamRedisStore` reads `REDIS_URL` or `KV_URL` by default.  
If you need a custom connection string, pass your own Redis clients as `publisher` and `subscriber`.

```ts
import { createClient } from "redis";
import {
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";

// Option A: use REDIS_URL or KV_URL from env
const streamStore = await createResumableStreamRedisStore();
const adapter = await createResumableStreamAdapter({ streamStore });

// Option B: pass your own clients (custom connection string)
const publisher = createClient({ url: "redis://localhost:6379" });
const subscriber = createClient({ url: "redis://localhost:6379" });
const customStreamStore = await createResumableStreamRedisStore({ publisher, subscriber });
const adapter = await createResumableStreamAdapter({ streamStore: customStreamStore });
```

If you pass custom clients, you must connect them yourself.

### Memory store (dev/test)

`createResumableStreamMemoryStore` keeps everything in-process.  
Data is lost on restart and not shared across instances.

```ts
import {
  createResumableStreamAdapter,
  createResumableStreamMemoryStore,
} from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamMemoryStore();
const adapter = await createResumableStreamAdapter({ streamStore });
```

### Generic store (custom backend)

`createResumableStreamGenericStore` accepts your own `publisher`/`subscriber`.  
Use this for non-Redis backends that still provide pub/sub + KV semantics.

```ts
import type {
  ResumableStreamPublisher,
  ResumableStreamSubscriber,
} from "@voltagent/resumable-streams";
import {
  createResumableStreamAdapter,
  createResumableStreamGenericStore,
} from "@voltagent/resumable-streams";

const publisher: ResumableStreamPublisher = {
  async connect() {},
  async publish(channel, message) {
    return 1;
  },
  async set(key, value, options) {
    return "OK";
  },
  async get(key) {
    return null;
  },
  async incr(key) {
    return 1;
  },
};

const subscriber: ResumableStreamSubscriber = {
  async connect() {},
  async subscribe(channel, callback) {
    return 1;
  },
  async unsubscribe(channel) {},
};

const streamStore = await createResumableStreamGenericStore({
  publisher,
  subscriber,
  keyPrefix: "voltagent",
  waitUntil: null,
});

const adapter = await createResumableStreamAdapter({ streamStore });
```

## Next.js + AI SDK (useChat)

This section mirrors the `with-nextjs-resumable-stream` example. Full project:  
https://github.com/VoltAgent/voltagent/tree/main/examples/with-nextjs-resumable-stream

### 1) Adapter helper

Create the adapter once and reuse it across routes.

```ts
// lib/resumable-stream.ts
import type { ResumableStreamAdapter } from "@voltagent/core";
import {
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";
import { after } from "next/server";

let adapterPromise: Promise<ResumableStreamAdapter> | undefined;

export function getResumableStreamAdapter() {
  if (!adapterPromise) {
    adapterPromise = (async () => {
      const streamStore = await createResumableStreamRedisStore({ waitUntil: after });
      return createResumableStreamAdapter({ streamStore });
    })();
  }

  return adapterPromise;
}
```

### 2) POST route (create stream)

```ts
// app/api/chat/route.ts
import { getResumableStreamAdapter } from "@/lib/resumable-stream";
import { agent } from "@/voltagent";
import { createResumableChatSession } from "@voltagent/resumable-streams";
import { setWaitUntil } from "@voltagent/core";
import { after } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { message, messages, options } = body;
  const conversationId = options.conversationId;
  const userId = options.userId;
  const input = message ?? messages;

  setWaitUntil(after);

  const adapter = await getResumableStreamAdapter();
  const session = createResumableChatSession({
    adapter,
    conversationId,
    userId,
    agentId: agent.id,
  });

  await session.clearActiveStream();

  const result = await agent.streamText(input, {
    userId,
    conversationId,
  });

  return result.toUIMessageStreamResponse({
    consumeSseStream: session.consumeSseStream,
    onFinish: session.onFinish,
  });
}
```

### 3) GET route (resume stream)

```ts
// app/api/chat/[id]/stream/route.ts
import { getResumableStreamAdapter } from "@/lib/resumable-stream";
import { agent } from "@/voltagent";
import { createResumableChatSession } from "@voltagent/resumable-streams";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = new URL(request.url).searchParams.get("userId") as string;

  const adapter = await getResumableStreamAdapter();
  const session = createResumableChatSession({
    adapter,
    conversationId: id,
    userId,
    agentId: agent.id,
  });

  return session.resumeResponse();
}
```

### 4) Client-side resume

```tsx
// components/chat-interface.tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { messages, sendMessage } = useChat({
  id: chatId,
  messages: initialMessages,
  resume: true,
  transport: new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        message: messages[messages.length - 1],
        options: {
          conversationId: id,
          userId,
        },
      },
    }),
    prepareReconnectToStreamRequest: ({ id }) => ({
      api: `/api/chat/${id}/stream?userId=${encodeURIComponent(userId)}`,
    }),
  }),
});
```

## Custom usage (no AI SDK)

Use `createResumableChatSession` when you control the SSE pipeline.

```ts
import {
  createResumableChatSession,
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamRedisStore();
const adapter = await createResumableStreamAdapter({ streamStore });

const sseHeaders = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

export async function POST(req: Request) {
  const { options, agentId, text } = await req.json();
  const conversationId = options.conversationId;
  const userId = options.userId;

  const session = createResumableChatSession({
    adapter,
    conversationId,
    userId,
    agentId,
    resumeHeaders: sseHeaders,
  });

  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue(`data: ${text}\n\n`);
      controller.close();
    },
  });

  const [persistStream, responseStream] = stream.tee();
  await session.createStream(persistStream);

  return new Response(responseStream.pipeThrough(new TextEncoderStream()), {
    headers: sseHeaders,
  });
}
```

If you want JSON payloads in SSE, serialize them with your preferred helper.

## Route helpers (optional)

`createResumableChatHandlers` can generate `POST`/`GET` handlers.  
Defaults:

- `conversationId`: `body.options.conversationId` (GET uses `params.id`)
- `userId`: `body.options.userId` (GET uses `?userId=...`)

## Custom stores and adapters

You have two extension points:

- Implement `ResumableStreamStore` and pass it to the adapter.
- Implement `ResumableStreamAdapter` directly for full control.

`ResumableStreamStore` handles stream chunk storage.  
If it also implements `ResumableStreamActiveStore`, it can be used as `activeStreamStore`.  
Otherwise, pass a separate `activeStreamStore`.

## Important notes

- Keying rule: `userId + "-" + conversationId`. `userId` is required.  
  If you do not have a user identity, generate a stable id (for example `crypto.randomUUID()`).
- When resumable streaming is enabled, the abort signal is removed.  
  If you need abortable streams, do not use `resumableStream`.
- Resumable streaming does not persist messages. For message persistence, enable memory.  
  See [Memory](../agents/memory.md).

## VoltOps plan limits (managed store)

When you use the VoltOps managed store, concurrent resumable streams are limited per project:

- Free: 1 concurrent stream
- Core: 100 concurrent streams
- Pro: 1000 concurrent streams

## API reference (@voltagent/resumable-streams)

### createResumableStreamAdapter

Builds the adapter used by servers or custom routes.

Props:

- `streamStore` (required): a `ResumableStreamStore` for stream chunks.
- `activeStreamStore` (optional): overrides the active stream index.  
  If omitted, the adapter uses `streamStore` when it implements `ResumableStreamActiveStore`.

```ts
import {
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamRedisStore({ keyPrefix: "voltagent" });
const adapter = await createResumableStreamAdapter({ streamStore });
```

### createResumableStreamRedisStore

Creates a Redis-backed stream store.

Props:

- `keyPrefix` (optional): prefix for Redis keys.
- `waitUntil` (optional): keep-alive hook for serverless environments.
- `publisher` (optional): Redis publisher client.
- `subscriber` (optional): Redis subscriber client.

```ts
import { createClient } from "redis";
import { createResumableStreamRedisStore } from "@voltagent/resumable-streams";

// Option A: use REDIS_URL or KV_URL from env
const streamStore = await createResumableStreamRedisStore();

// Option B: custom clients (custom connection string)
const publisher = createClient({ url: "redis://localhost:6379" });
const subscriber = createClient({ url: "redis://localhost:6379" });
const customStreamStore = await createResumableStreamRedisStore({ publisher, subscriber });
```

If you pass custom clients, you must connect them yourself.

### createResumableStreamVoltOpsStore

Creates a managed store backed by VoltOps.

Props:

- `voltOpsClient` (optional)
- `publicKey` / `secretKey` (optional, used if `voltOpsClient` is not provided)
- `baseUrl` (optional)
- `waitUntil` (optional)

```ts
import { createResumableStreamVoltOpsStore } from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamVoltOpsStore({
  baseUrl: "https://api.voltagent.dev",
});
```

### createResumableStreamMemoryStore

Creates an in-process stream store (dev/test).

Props:

- `keyPrefix` (optional)
- `waitUntil` (optional)

```ts
import { createResumableStreamMemoryStore } from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamMemoryStore({ keyPrefix: "local" });
```

### createResumableStreamGenericStore

Creates a store from a custom pub/sub + KV backend.

Props:

- `publisher` (required)
- `subscriber` (required)
- `keyPrefix` (optional)
- `waitUntil` (optional)

```ts
import type {
  ResumableStreamPublisher,
  ResumableStreamSubscriber,
} from "@voltagent/resumable-streams";
import { createResumableStreamGenericStore } from "@voltagent/resumable-streams";

const publisher: ResumableStreamPublisher = {
  async connect() {},
  async publish(channel, message) {
    return 1;
  },
  async set(key, value, options) {
    return "OK";
  },
  async get(key) {
    return null;
  },
  async incr(key) {
    return 1;
  },
};

const subscriber: ResumableStreamSubscriber = {
  async connect() {},
  async subscribe(channel, callback) {
    return 1;
  },
  async unsubscribe(channel) {},
};

const streamStore = await createResumableStreamGenericStore({
  publisher,
  subscriber,
  keyPrefix: "voltagent",
  waitUntil: null,
});
```

### createMemoryResumableStreamActiveStore

Creates an in-memory active stream index. Use this to override `activeStreamStore`.

```ts
import {
  createMemoryResumableStreamActiveStore,
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";

const streamStore = await createResumableStreamRedisStore();
const activeStreamStore = createMemoryResumableStreamActiveStore();
const adapter = await createResumableStreamAdapter({ streamStore, activeStreamStore });
```

### createResumableChatSession

Builds a session helper for custom route handlers.

Props:

- `adapter` (required)
- `conversationId` (required)
- `userId` (required)
- `agentId` (optional)
- `logger` (optional)
- `resumeHeaders` (optional): headers for SSE resume responses

```ts
import { createResumableChatSession } from "@voltagent/resumable-streams";

const session = createResumableChatSession({
  adapter,
  conversationId,
  userId,
  agentId,
});

const result = await agent.streamText(input, { conversationId, userId });
return result.toUIMessageStreamResponse({
  consumeSseStream: session.consumeSseStream,
  onFinish: session.onFinish,
});
```

```ts
return session.resumeResponse();
```

### createResumableChatHandlers

Generates `POST` and `GET` handlers.

Props:

- `agent` (required)
- `adapter` (required)
- `waitUntil` (optional)
- `logger` (optional)
- `agentId` (optional)
- `sendReasoning` (optional)
- `sendSources` (optional)
- `resolveInput` (optional)
- `resolveConversationId` (optional)
- `resolveUserId` (optional)
- `resolveOptions` (optional)

```ts
import { createResumableChatHandlers } from "@voltagent/resumable-streams";

const { POST, GET } = createResumableChatHandlers({
  agent,
  adapter,
  resolveConversationId: ({ body }) => body.options.conversationId,
  resolveUserId: ({ body }) => body.options.userId,
});

export { POST, GET };
```

## Type contracts

### ResumableStreamStore

- `createNewResumableStream(streamId, makeStream, skipCharacters?)`
- `resumeExistingStream(streamId, skipCharacters?)`

### ResumableStreamActiveStore

- `getActiveStreamId(context)`
- `setActiveStreamId(context, streamId)`
- `clearActiveStream(context)`

### ResumableStreamAdapter

- `createStream({ conversationId, userId, stream, agentId? })`
- `resumeStream(streamId)`
- `getActiveStreamId(context)`
- `clearActiveStream(context)`

### ResumableStreamPublisher / ResumableStreamSubscriber

Publisher methods:

- `connect()`
- `publish(channel, message)`
- `set(key, value, { EX })` (TTL in seconds)
- `get(key)`
- `incr(key)`

Subscriber methods:

- `connect()`
- `subscribe(channel, callback)`
- `unsubscribe(channel)`
