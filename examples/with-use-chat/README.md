# with-use-chat (Plain React + built-in server)

This example shows how to build a simple chat UI in plain React using the AI SDK's `useChat` hook with VoltAgent's chat SSE endpoint.

It now includes a minimal VoltAgent dev server inside the same project, exposing:

POST http://localhost:3141/agents/:id/chat

The endpoint streams UI messages in the AI SDK format, compatible with `useChat` and `DefaultChatTransport`.

## Prerequisites

- Node.js 18+
- OpenAI API key

Create a .env file from the provided template (recommended):

cp .env.example .env

# then edit .env and set OPENAI_API_KEY

Alternatively, you can export the variable in your shell:

export OPENAI_API_KEY=...

## Run

1. Install dependencies at the repo root:

   pnpm install

2. Start the VoltAgent dev server (from this example directory):

   cd examples/with-use-chat
   pnpm dev:server

   This will start Hono at http://localhost:3141 with an agent `cerbai`.

   Note: The React app now has a Port field (default 4310). If you run this embedded server, set the Port field to 3141 in the UI to match the server.

   You can test it via cURL:

   curl -N -X POST http://localhost:3141/agents/cerbai/chat \
    -H "Content-Type: application/json" \
    -d '{
   "input": "Tell me a story",
   "options": { "temperature": 0.7, "maxSteps": 10 }
   }'

3. In another terminal, start the React client:

   cd examples/with-use-chat
   pnpm dev

4. Open the app:

   http://localhost:5173

5. Type a message and press Send. You should see the assistant's response stream in real time. The default Agent ID is `cerbai` (you can change it in the UI).

## How it works

We configure a custom `DefaultChatTransport` so that the request body matches VoltAgent's expectations (last UI message as array plus options):

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
api: `http://localhost:3141/agents/${agentId}/chat`,
prepareSendMessagesRequest({ messages }) {
const lastMessage = messages[messages.length - 1];
return {
body: {
input: [lastMessage], // array of UIMessage
options: {
userId: "user-123",
conversationId: "conv-456",
temperature: 0.7,
maxSteps: 10,
},
},
};
},
});

const { messages, handleInputChange, handleSubmit, stop, status } = useChat({
transport,
});

This aligns with VoltAgent's AI SDK compatible chat stream endpoint.
