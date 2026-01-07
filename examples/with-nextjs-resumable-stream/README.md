# VoltAgent + AI Elements (Next.js)

This example shows how to build a chat UI with [AI Elements](https://ai-sdk.dev/elements) and VoltAgent in a Next.js app, including resumable streams.

## Features

- AI Elements chat components (conversation, message, prompt input)
- VoltAgent streaming via `/api/chat`
- Resumable streams via `@voltagent/resumable-streams` (Redis-backed in this example)
- Tailwind + shadcn UI setup for styling

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set your API key:

```bash
cp .env.example .env
```

Update `OPENAI_API_KEY` and `REDIS_URL` in `.env`.

3. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Notes

- The AI Elements components live in `components/ai-elements`.
- Resumable adapter is created in `lib/resumable-stream.ts`, and route handlers use `createResumableChatSession` to manage lifecycle.
- Stream creation is in `app/api/chat/route.ts`.
- Stream resume endpoint is `app/api/chat/[id]/stream/route.ts`.
- The active stream index defaults to the same Redis store; override `activeStreamStore` if you need a different backend.
- The agent setup is in `voltagent/`.
