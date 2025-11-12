---
title: Agent Endpoints
sidebar_label: Agents
---

# Agent API Endpoints

The Agent API provides endpoints for managing and interacting with VoltAgent agents. All agent endpoints follow the pattern `/agents/*`.

## List All Agents

Returns a list of all registered agents with their configurations.

**Endpoint:** `GET /agents`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "assistant",
      "name": "Assistant",
      "description": "A helpful AI assistant",
      "status": "idle",
      "model": "gpt-4o-mini",
      "tools": [],
      "subAgents": [],
      "memory": null,
      "isTelemetryEnabled": false
    }
  ]
}
```

**cURL Example:**

```bash
curl http://localhost:3141/agents
```

## Get Agent by ID

Retrieve detailed information about a specific agent.

**Endpoint:** `GET /agents/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "assistant",
    "name": "Assistant",
    "description": "A helpful AI assistant",
    "status": "idle",
    "model": "gpt-4o-mini",
    "tools": ["search", "calculator"],
    "subAgents": [],
    "memory": {
      "config": {}
    },
    "isTelemetryEnabled": true
  }
}
```

**cURL Example:**

```bash
curl http://localhost:3141/agents/assistant
```

## Generate Text

Generate a text response from an agent synchronously.

**Endpoint:** `POST /agents/:id/text`

**Request Body:**

```json
// Example 1: Simple string input
{
  "input": "What is the weather like today?",
  "options": {
    "userId": "user-123",
    "conversationId": "conv-456",
    "contextLimit": 10,
    "maxSteps": 5,
    "temperature": 0.7,
    "maxOutputTokens": 1000,
    "topP": 1.0,
    "frequencyPenalty": 0.0,
    "presencePenalty": 0.0,
    "seed": 42,
    "stopSequences": ["\n\n"],
    "providerOptions": {
      "reasoningEffort": "medium"
    },
    "context": {
      "role": "admin",
      "tier": "premium"
    }
  }
}

// Example 2: UIMessage array format (with parts)
{
  "input": [
    {
      "role": "user",
      "parts": [
        { "type": "text", "text": "What is the weather?" }
      ]
    },
    {
      "role": "assistant",
      "parts": [
        { "type": "text", "text": "I can't access real-time weather data." }
      ]
    },
    {
      "role": "user",
      "parts": [
        { "type": "text", "text": "Can you explain why?" }
      ]
    }
  ],
  "options": {
    "temperature": 0.7
  }
}

// Example 3: ModelMessage array format (with role/content)
{
  "input": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the weather?"
    },
    {
      "role": "assistant",
      "content": "I can't access real-time weather data."
    },
    {
      "role": "user",
      "content": "Can you explain why?"
    }
  ],
  "options": {
    "temperature": 0.7
  }
}
```

**Input Format:**

- `input` can be either:
  - A string for simple text input
  - An array of AI SDK UIMessage format (messages with `parts`)
  - An array of AI SDK ModelMessage format (messages with `role` and `content`)

**Options:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | string | - | User ID for tracking |
| `conversationId` | string | - | Conversation ID for context |
| `contextLimit` | number | 10 | Message history limit |
| `maxSteps` | number | - | Max iteration steps (for tool use) |
| `temperature` | number | 0.7 | Randomness (0-1) |
| `maxOutputTokens` | number | 4000 | Max tokens to generate |
| `topP` | number | 1.0 | Nucleus sampling (0-1) |
| `frequencyPenalty` | number | 0.0 | Repeat penalty (0-2) |
| `presencePenalty` | number | 0.0 | New topic penalty (0-2) |
| `seed` | number | - | For reproducible results |
| `stopSequences` | string[] | - | Stop generation sequences |
| `providerOptions` | object | - | Provider-specific options |
| `context` | object | - | Dynamic agent context |

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "I don't have access to real-time weather data...",
    "usage": {
      "promptTokens": 45,
      "completionTokens": 120,
      "totalTokens": 165,
      "cachedInputTokens": 0,
      "reasoningTokens": 0
    },
    "finishReason": "stop",
    "toolCalls": [],
    "toolResults": []
  }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Tell me a joke",
    "options": {
      "temperature": 0.8,
      "maxOutputTokens": 100
    }
  }'
```

### Using experimental_output for Structured Generation

The `/text`, `/stream`, and `/chat` endpoints support structured output generation using the `experimental_output` option. Unlike the `/object` endpoint, this allows you to get structured data **while maintaining full tool calling capabilities**.

**Key Differences:**

| Feature           | `/object` endpoint | `experimental_output` with `/text` |
| ----------------- | ------------------ | ---------------------------------- |
| Structured output | ✅                 | ✅                                 |
| Tool calling      | ❌                 | ✅                                 |

**Request Body with experimental_output:**

```json
{
  "input": "Create a recipe for pasta carbonara",
  "options": {
    "experimental_output": {
      "type": "object",
      "schema": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "ingredients": {
            "type": "array",
            "items": { "type": "string" }
          },
          "steps": {
            "type": "array",
            "items": { "type": "string" }
          },
          "prepTime": { "type": "number" }
        },
        "required": ["name", "ingredients", "steps"]
      }
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "Here is a classic pasta carbonara recipe...",
    "experimental_output": {
      "name": "Classic Pasta Carbonara",
      "ingredients": [
        "400g spaghetti",
        "200g guanciale or pancetta",
        "4 large eggs",
        "100g Pecorino Romano cheese",
        "Black pepper"
      ],
      "steps": [
        "Bring a large pot of salted water to boil",
        "Cook pasta according to package directions",
        "While pasta cooks, dice guanciale and cook until crispy",
        "Beat eggs with grated cheese and black pepper",
        "Drain pasta, reserving 1 cup pasta water",
        "Off heat, toss pasta with guanciale and fat",
        "Add egg mixture, tossing quickly with pasta water"
      ],
      "prepTime": 20
    },
    "usage": {
      "promptTokens": 145,
      "completionTokens": 238,
      "totalTokens": 383
    },
    "finishReason": "stop",
    "toolCalls": [],
    "toolResults": []
  }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Create a recipe for pasta carbonara",
    "options": {
      "experimental_output": {
        "type": "object",
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "ingredients": {
              "type": "array",
              "items": { "type": "string" }
            },
            "prepTime": { "type": "number" }
          },
          "required": ["name", "ingredients"]
        }
      }
    }
  }'
```

**Supported Types:**

- `"object"` - Returns structured JSON conforming to the provided schema
- `"text"` - Returns constrained text output

**When to Use:**

- Use `experimental_output` when you need structured output AND tool calling
- Use `/object` endpoint for simple data extraction without tools

## Stream Text (Raw)

Generate a text response and stream raw fullStream data via Server-Sent Events (SSE). This endpoint provides direct access to all stream events for custom implementations.

**Endpoint:** `POST /agents/:id/stream`

**Request Body:** Same as `/text` endpoint (supports string, UIMessage[], or ModelMessage[] input)

**Response:** Server-Sent Events stream with raw fullStream data

The stream returns raw AI SDK fullStream events. Each event is a JSON object containing the complete event data.

**Event Types:**

- `text-delta` - Incremental text chunks with delta content
- `tool-call` - Tool invocation events
- `tool-result` - Tool execution results
- `finish` - Stream completion with usage statistics
- `error` - Error events if something goes wrong

**Use Cases:**

- Custom stream processing
- Full control over event handling
- Advanced implementations requiring all event details

**cURL Example:**

```bash
curl -N -X POST http://localhost:3141/agents/assistant/stream \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Write a short story",
    "options": {
      "temperature": 0.9,
      "maxOutputTokens": 500
    }
  }'
```

**JavaScript Example (Raw Stream Processing):**

```javascript
const response = await fetch("http://localhost:3141/agents/assistant/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: "Write a poem",
    options: { temperature: 0.9 },
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Parse SSE format: data: {...}\n\n
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const eventData = JSON.parse(line.slice(6));
      // Handle different event types
      switch (eventData.type) {
        case "text-delta":
          console.log("Text:", eventData.delta);
          break;
        case "tool-call":
          console.log("Tool call:", eventData.toolName);
          break;
        case "finish":
          console.log("Finished:", eventData.finishReason);
          break;
      }
    }
  }
}
```

## Chat Stream (AI SDK Compatible)

Generate a text response and stream it as UI messages via Server-Sent Events (SSE). This endpoint is optimized for the AI SDK's `useChat` hook and chat interfaces.

**Endpoint:** `POST /agents/:id/chat`

**Request Body:** Same as `/text` endpoint (supports string, UIMessage[], or ModelMessage[] input)

**Response:** Server-Sent Events stream in AI SDK UI message format

The stream returns AI SDK UI message stream format, directly compatible with `useChat` hook. This format handles automatic message assembly, tool calls, and metadata.

**Features:**

- Automatic message assembly
- Built-in tool call handling
- Metadata and reasoning support
- Direct compatibility with AI SDK's `useChat` hook

**Use Cases:**

- Chat interfaces
- Conversational UIs
- Applications using AI SDK's React hooks

**cURL Example:**

```bash
curl -N -X POST http://localhost:3141/agents/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Tell me a story",
    "options": {
      "temperature": 0.9,
      "maxOutputTokens": 500
    }
  }'
```

**React Example with useChat:**

```javascript
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback } from "react";

function ChatComponent({ agentId }) {
  const createTransport = useCallback(() => {
    return new DefaultChatTransport({
      api: `http://localhost:3141/agents/${agentId}/chat`,
      prepareSendMessagesRequest({ messages }) {
        // VoltAgent expects specific format
        const lastMessage = messages[messages.length - 1];

        return {
          body: {
            input: [lastMessage], // Send as array of UIMessage
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
  }, [agentId]);

  const { messages, sendMessage, stop, status } = useChat({
    transport: createTransport(),
    onFinish: () => {
      console.log("Stream completed");
    },
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}
      {/* Add your input form here */}
    </div>
  );
}
```

**Note:** VoltAgent requires a custom transport with `prepareSendMessagesRequest` to format the request body correctly. The endpoint expects `input` as an array of UIMessage objects and options in a specific format.

## Generate Object

Generate a structured object that conforms to a JSON schema.

**Endpoint:** `POST /agents/:id/object`

**Request Body:**

```json
// Input can be string, UIMessage[], or ModelMessage[]
{
  "input": "Extract user info: John Doe, 30 years old, john@example.com",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "number" },
      "email": { "type": "string", "format": "email" }
    },
    "required": ["name", "age", "email"]
  },
  "options": {
    "temperature": 0.3
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com"
  }
}
```

**Note:** The schema is converted from JSON Schema to Zod internally using `convertJsonSchemaToZod`.

**cURL Example:**

```bash
curl -X POST http://localhost:3141/agents/assistant/object \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Product: iPhone 15, Price: $999, In stock",
    "schema": {
      "type": "object",
      "properties": {
        "product": { "type": "string" },
        "price": { "type": "number" },
        "inStock": { "type": "boolean" }
      },
      "required": ["product", "price", "inStock"]
    }
  }'
```

## Stream Object

Generate a structured object and stream partial updates via SSE.

**Endpoint:** `POST /agents/:id/stream-object`

**Request Body:** Same as `/object` endpoint

**Response:** Server-Sent Events stream with partial object updates

**cURL Example:**

```bash
curl -N -X POST http://localhost:3141/agents/assistant/stream-object \
  -H "Content-Type: application/json" \
  -d '{
    "input": "List 3 programming languages with their years",
    "schema": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "year": { "type": "number" }
        }
      }
    }
  }'
```

## Abort Signal Support

All generation endpoints support request cancellation via `AbortSignal`:

```javascript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

const response = await fetch("http://localhost:3141/agents/assistant/text", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: "Long task..." }),
  signal: controller.signal,
});
```

## Dynamic Agent Context

Agents can adapt behavior based on context:

```bash
curl -X POST http://localhost:3141/agents/dynamic-agent/text \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Help me",
    "options": {
      "context": {
        "role": "admin",
        "language": "Spanish",
        "tier": "premium"
      }
    }
  }'
```

The agent receives this context and can:

- Use different instructions based on role
- Switch models based on tier
- Enable/disable tools based on permissions
- Respond in the specified language

## Best Practices

1. **Use streaming for long responses** - Better UX for lengthy generation
2. **Set appropriate temperature** - Lower (0.3) for factual, higher (0.9) for creative
3. **Limit tokens for cost control** - Use `maxOutputTokens` wisely
4. **Provide context** - Use `userId` and `conversationId` for conversation continuity
5. **Handle errors gracefully** - Check `success` field and handle errors
6. **Use abort signals** - Allow users to cancel long-running requests

## Next Steps

- Explore [Workflow Endpoints](./workflows.md) for multi-step operations
- Learn about [Streaming](../streaming.md) for real-time features
- Check [Authentication](../authentication.md) to secure your endpoints
