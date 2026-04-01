# VoltAgent Resumable Streams (No Next.js)

This example shows how to use resumable streams with VoltAgent and the Hono server, without Next.js.

## Features

- VoltAgent Hono server with resumable stream adapter
- Opt-in resumable streaming via `options.resumableStream: true`
- Resume endpoint using `userId` + `conversationId`
- Redis-backed stream storage via `resumable-stream/redis`

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set your environment variables:

```bash
cp .env.example .env
```

Update `OPENAI_API_KEY` and `REDIS_URL` in `.env`.

3. Start the server:

```bash
pnpm dev
```

The server runs on `http://localhost:3141` by default.

## Usage

Start a resumable stream:

```bash
curl -N -X POST http://localhost:3141/agents/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Say hello in Turkish and English.",
    "options": {
      "conversationId": "conv-1",
      "userId": "user-1",
      "resumableStream": true
    }
  }'
```

Resume the stream (after closing the first request):

```bash
curl -N "http://localhost:3141/agents/assistant/chat/conv-1/stream?userId=user-1"
```

## Notes

- `options.conversationId` and `options.userId` are required for resumable streams.
- If you do not have a `userId`, generate a stable one (e.g. `crypto.randomUUID()`) and reuse it for the conversation.
- To enable resumable streaming by default, set `resumableStream.defaultEnabled: true` in `honoServer` and omit `options.resumableStream`.
- This example uses Redis. Set `REDIS_URL` or `KV_URL` for the adapter.
- The active stream store defaults to the same Redis store; override `activeStreamStore` if you need a different backend.
