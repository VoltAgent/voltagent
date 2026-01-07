# VoltAgent Resumable Streams with VoltOps (No Next.js)

This example shows how to use resumable streams with VoltAgent and the Hono server, backed by the managed VoltOps store (no Redis setup).

## Features

- VoltAgent Hono server with resumable stream adapter
- Opt-in resumable streaming via `options.resumableStream: true`
- Resume endpoint using `userId` + `conversationId`
- VoltOps-managed stream storage (no Redis required)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set your environment variables:

```bash
cp .env.example .env
```

Update `OPENAI_API_KEY`, `VOLTAGENT_PUBLIC_KEY`, and `VOLTAGENT_SECRET_KEY` in `.env`.

Optional: set `VOLTAGENT_API_BASE_URL` if you are using a non-default VoltOps API URL.

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
- VoltOps-managed resumable streams are limited per project: Free 1, Core 100, Pro 1000 concurrent streams.
