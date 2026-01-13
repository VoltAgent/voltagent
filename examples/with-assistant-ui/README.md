Assistant UI starter wired to VoltAgent.

## Getting Started

1. Copy `.env.example` to `.env` and set:
   - `OPENAI_API_KEY`
2. Start the dev server:
   ```bash
   pnpm dev
   ```
3. Start the VoltAgent built-in server in a separate terminal:
   ```bash
   pnpm voltagent:run
   ```

Then open `https://console.voltagent.dev` and connect it to `http://localhost:3141`.

## How it works

- `voltagent/agents.ts` defines the `AssistantUIAgent` with shared LibSQL-backed memory (`voltagent/memory.ts`).
- `voltagent/server.ts` starts the built-in server that exposes the REST API used by `console.voltagent.dev`.
- The agent includes a `getWeather` tool (mock data) to demonstrate tool calls from the UI.
- `app/api/chat/route.ts` streams responses from the VoltAgent agent using `toUIMessageStreamResponse`, so Assistant UI receives tool/reasoning aware events.
- `app/assistant.tsx` uses `AssistantChatTransport` pointing to `/api/chat` to keep the UI runtime in sync with the agent.
