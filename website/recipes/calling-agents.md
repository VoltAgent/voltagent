---
id: calling-agents
title: Calling Agents
slug: calling-agents
description: Different ways to invoke VoltAgent agents - programmatic, REST API, and framework integrations.
---

# Calling Agents

VoltAgent agents can be invoked in multiple ways depending on your use case.

## Programmatic Usage

The most direct way to call an agent is through its methods in your TypeScript code.

### generateText

Returns a complete text response after the agent finishes processing.

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
});

const response = await agent.generateText("What is the capital of France?");
console.log(response.text); // "The capital of France is Paris."
```

With options for conversation tracking:

```typescript
const response = await agent.generateText("Remember my name is John", {
  userId: "user-123",
  conversationId: "conv-456",
});
```

### streamText

Returns a streaming response for real-time output.

```typescript
const result = await agent.streamText("Write a short story about a robot.");

// Option 1: Iterate over text chunks
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Option 2: Get full text after stream completes
const fullText = await result.text;
```

For UI frameworks, use the built-in response helpers:

```typescript
// Next.js API route
export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await agent.streamText(messages, {
    userId: "user-id",
    conversationId: "thread-id",
  });

  // Returns SSE stream compatible with AI SDK UI
  return result.toUIMessageStreamResponse();
}
```

### generateObject

Returns a structured object matching a Zod schema.

```typescript
import { z } from "zod";

const WeatherSchema = z.object({
  location: z.string(),
  temperature: z.number(),
  unit: z.enum(["celsius", "fahrenheit"]),
  conditions: z.string(),
});

const response = await agent.generateObject("What's the weather in Tokyo?", WeatherSchema);

console.log(response.object);
// { location: "Tokyo", temperature: 18, unit: "celsius", conditions: "partly cloudy" }
```

### streamObject

Streams a structured object for progressive UI updates.

```typescript
const result = await agent.streamObject("Generate a user profile", UserProfileSchema);

for await (const partial of result.partialObjectStream) {
  // Receive partial object as it builds
  console.log(partial);
}

const finalObject = await result.object;
```

## REST API

When using `@voltagent/server-hono`, agents are exposed via REST endpoints.

### Generate Text

```bash
curl -X POST http://localhost:3141/api/agents/assistant/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "What is VoltAgent?",
    "userId": "user-123",
    "conversationId": "conv-456"
  }'
```

Response:

```json
{
  "text": "VoltAgent is an open-source TypeScript framework for building AI agents...",
  "usage": { "promptTokens": 25, "completionTokens": 150 }
}
```

### Stream Text

```bash
curl -X POST http://localhost:3141/api/agents/assistant/stream \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Write a haiku about coding"
  }'
```

Returns Server-Sent Events (SSE):

```
data: {"type":"text-delta","text":"Lines"}
data: {"type":"text-delta","text":" of"}
data: {"type":"text-delta","text":" code"}
...
data: {"type":"finish","usage":{"promptTokens":20,"completionTokens":30}}
```

### Chat Stream (UI Compatible)

For frontend integrations with `@ai-sdk/react` or similar:

```bash
curl -X POST http://localhost:3141/api/agents/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Generate Object

```bash
curl -X POST http://localhost:3141/api/agents/assistant/object \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Extract user info from: John Doe, john@example.com",
    "schema": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "email": {"type": "string"}
      }
    }
  }'
```

### Stream Object

```bash
curl -X POST http://localhost:3141/api/agents/assistant/stream-object \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Generate a product listing",
    "schema": { ... }
  }'
```

## Framework Integrations

### Next.js API Routes

```typescript
// app/api/chat/route.ts
import { agent } from "@/lib/agent";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await agent.streamText(messages, {
    userId: req.headers.get("x-user-id") || "anonymous",
    conversationId: req.headers.get("x-conversation-id"),
  });

  return result.toUIMessageStreamResponse();
}
```

Frontend with `@ai-sdk/react`:

```tsx
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### Webhook Handlers

Handle incoming webhooks (Slack, WhatsApp, etc.):

```typescript
import { Hono } from "hono";
import { agent } from "./agent";

const app = new Hono();

app.post("/webhook/whatsapp", async (c) => {
  const { from, body } = await c.req.json();

  const response = await agent.generateText(body, {
    userId: from,
    conversationId: `whatsapp_${from}`,
  });

  // Send response back via WhatsApp API
  await sendWhatsAppMessage(from, response.text);

  return c.json({ success: true });
});
```

## Calling from Workflows

Use `.andAgent()` to include agent calls in workflows:

```typescript
import { Workflow } from "@voltagent/core";

const workflow = new Workflow("research-workflow")
  .addStep("fetch", async (input) => {
    const data = await fetchData(input.topic);
    return { data };
  })
  .andAgent(researchAgent, {
    inputMapper: (prev) => `Analyze this data: ${JSON.stringify(prev.data)}`,
    outputMapper: (result) => ({ analysis: result.text }),
  })
  .addStep("format", async (input) => {
    return formatReport(input.analysis);
  });

const result = await workflow.run({ topic: "AI trends" });
```

## Calling from Tools

Agents can call other agents through tools:

```typescript
import { createTool, Agent } from "@voltagent/core";

const expertAgent = new Agent({
  name: "Expert",
  instructions: "You are a domain expert.",
  // ...
});

const consultExpert = createTool({
  name: "consult_expert",
  description: "Consult with a domain expert",
  parameters: z.object({
    question: z.string(),
  }),
  execute: async ({ question }) => {
    const response = await expertAgent.generateText(question);
    return response.text;
  },
});

const mainAgent = new Agent({
  name: "Coordinator",
  instructions: "You coordinate with experts when needed.",
  tools: [consultExpert],
  // ...
});
```

## Options Reference

All agent methods accept an options object:

| Option           | Type     | Description                               |
| ---------------- | -------- | ----------------------------------------- |
| `userId`         | `string` | User identifier for conversation tracking |
| `conversationId` | `string` | Conversation thread identifier            |
| `context`        | `object` | Additional context passed to the agent    |
| `maxTokens`      | `number` | Maximum tokens in response                |
| `temperature`    | `number` | Response randomness (0-1)                 |

```typescript
const response = await agent.generateText("Hello", {
  userId: "user-123",
  conversationId: "conv-456",
  context: { userName: "John", preferredLanguage: "en" },
  maxTokens: 500,
  temperature: 0.7,
});
```

## Full Example

See the complete examples:

- [with-assistant-ui](https://github.com/VoltAgent/voltagent/tree/main/examples/with-assistant-ui) - Next.js + AI SDK UI
- [with-whatsapp](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp) - WhatsApp webhook handler
- [with-guardrails](https://github.com/VoltAgent/voltagent/tree/main/examples/with-guardrails) - Programmatic usage with guardrails
