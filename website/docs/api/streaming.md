---
title: Streaming
sidebar_label: Streaming
---

# Streaming (SSE & WebSocket)

VoltAgent supports real-time outputs via Server-Sent Events (SSE) and WebSockets.

## SSE Endpoints

- `POST /agents/:id/chat` - stream text generation as AI SDK UI message format (useChat compatible)
- `POST /agents/:id/stream` - stream raw fullStream events (all event types)
- `POST /agents/:id/stream-object` - stream partial object updates
- `POST /workflows/:id/stream` - stream workflow execution events

### Agents: Chat Stream (useChat Compatible)

Optimized for AI SDK's `useChat` hook. Returns UI message format.

```bash
curl -N -X POST http://localhost:3141/agents/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a haiku"}'
```

React consumption with useChat:

```ts
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
  api: "http://localhost:3141/agents/assistant/chat",
  prepareSendMessagesRequest({ messages }) {
    return {
      body: {
        input: [messages[messages.length - 1]],
        options: {
          /* your options */
        },
      },
    };
  },
});

const { messages, sendMessage } = useChat({ transport });
```

### Agents: Raw Stream (fullStream)

Provides all stream events for custom processing.

```bash
curl -N -X POST http://localhost:3141/agents/assistant/stream \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a poem"}'
```

JavaScript consumption:

```ts
const res = await fetch("http://localhost:3141/agents/assistant/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: "Write a poem" }),
});

const reader = res.body!.getReader();
const dec = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = dec.decode(value);
  // Parse SSE: data: {type: 'text-delta', delta: '...'}\n\n
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      // Handle event.type: 'start' (includes messageId), 'text-delta', 'tool-call', 'tool-result', 'finish'
    }
  }
}
```

### Agents: Stream Object

```bash
curl -N -X POST http://localhost:3141/agents/assistant/stream-object \
  -H "Content-Type: application/json" \
  -d '{
    "input": "List two cities with populations",
    "schema": {"type": "array", "items": {"type": "object", "properties": {"name": {"type":"string"}, "pop": {"type":"number"}}}}
  }'
```

Events are `text/event-stream` lines with JSON content containing partial updates or the final object.

### Workflows: Stream Execution

```bash
curl -N -X POST http://localhost:3141/workflows/my-workflow/stream \
  -H "Content-Type: application/json" \
  -d '{"input": {"id": "123"}}'
```

Event types include: `workflow-start`, `step-start`, `step-complete`, `workflow-suspended`, `workflow-complete`, and a final `workflow-result` event.

## WebSockets

Base path: `/ws`

- `/ws` - connection test/echo
- `/ws/logs` - real-time logs (filters via query: `level`, `agentId`, `workflowId`, `executionId`, `since`, `until`, `limit`)
- `/ws/observability` - spans and logs; supports `?entityType=agent|workflow&entityId=<id>` for filtering root entities

Examples:

```ts
// Echo
const testWs = new WebSocket("ws://localhost:3141/ws");

// Logs
const logsWs = new WebSocket("ws://localhost:3141/ws/logs?level=info");
logsWs.onmessage = (e) => console.log("log event", JSON.parse(e.data));

// Observability
const obsWs = new WebSocket(
  "ws://localhost:3141/ws/observability?entityType=agent&entityId=assistant"
);
obsWs.onmessage = (e) => console.log("obs event", JSON.parse(e.data));
```

Message envelopes:

- Observability span events: `{ type: "OBSERVABILITY_EVENT", success: true, data: {...} }`
- Observability log events: `{ type: "OBSERVABILITY_LOG", success: true, data: {...} }`

Note: WebSockets are currently unauthenticated. If you need auth on `/ws/*`, enforce it via a proxy or a custom provider.
