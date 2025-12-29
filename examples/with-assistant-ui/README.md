Assistant UI starter wired to VoltAgent.

## Getting Started

1. Copy `.env.example` to `.env.local` and set:
   - `OPENAI_API_KEY`
2. Start the dev server:
   ```bash
   pnpm dev
   ```

## How it works

- `voltagent/index.ts` defines the `AssistantUIAgent` using VoltAgent with shared LibSQL-backed memory (`voltagent/memory.ts`).
- The agent includes a `getWeather` tool (mock data) to demonstrate tool calls from the UI.
- `app/api/chat/route.ts` streams responses from the VoltAgent agent using `toUIMessageStreamResponse`, so Assistant UI receives tool/reasoning aware events.
- `app/assistant.tsx` uses `AssistantChatTransport` pointing to `/api/chat` to keep the UI runtime in sync with the agent.
