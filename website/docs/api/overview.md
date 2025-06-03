---
title: API Overview
sidebar_label: Overview
---

The VoltAgent Core API provides a programmatic interface to manage and interact with your VoltAgents. It allows you to list agents, generate text or structured object responses, manage agent history, check for updates, and more.

The API is built using [Hono](https://hono.dev/), a fast and lightweight web framework for Node.js and other JavaScript runtimes.

## Getting Started

The Core API server is typically started as part of your application when you initialize VoltAgent. By default, it tries to run on port `3141`, but may use other ports (like 4310, 1337) if the default is unavailable. Check your console output when starting your application to see the exact URL.

```bash
# Example console output
$ node your-app.js

  ══════════════════════════════════════════════════
    VOLTAGENT SERVER STARTED SUCCESSFULLY
  ══════════════════════════════════════════════════
    ✓ HTTP Server:  http://localhost:3141
    ✓ Swagger UI:   http://localhost:3141/ui

    Developer Console:    https://console.voltagent.dev
  ══════════════════════════════════════════════════
```

## Interactive API Documentation (Swagger UI)

![VoltAgent Swagger UI Demo](https://cdn.voltagent.dev/docs/swagger-ui-demo.gif)

To make exploring and interacting with the API easier, we provide interactive documentation using Swagger UI.

- **Access:** Navigate to `/ui` on your running API server (e.g., `http://localhost:3141/ui`).
- **Features:**
  - Lists all available API endpoints grouped by tags (e.g., "Agent Generation", "Agent Management").
  - Shows details for each endpoint: HTTP method, path, parameters, request body structure, and possible responses.
  - Provides example values and schemas.
  - Allows you to **execute API calls directly from your browser** ("Try it out" button) and see the results.

This is the recommended way to explore the API's capabilities.

:::tip[Discoverability]
Links to the Swagger UI (`/ui`) is also conveniently available on the API server's root page (`/`) and printed in the console logs when the server starts.
:::

## Common Generation Options

When using the generation endpoints (`/text`, `/stream`, `/object`, `/stream-object`), you can provide an `options` object in the request body to customize the generation process. All options are optional.

| Option             | Description                                                                   | Type                | Default |
| ------------------ | ----------------------------------------------------------------------------- | ------------------- | ------- |
| `userId`           | Optional user ID for context tracking.                                        | `string`            | -       |
| `conversationId`   | Optional conversation ID for context tracking.                                | `string`            | -       |
| `contextLimit`     | Optional limit for conversation history context.                              | `number` (integer)  | `10`    |
| `temperature`      | Controls randomness (0-1). Lower is more deterministic.                       | `number`            | `0.7`   |
| `maxTokens`        | Maximum number of tokens to generate in the response.                         | `number` (integer)  | `4000`  |
| `topP`             | Controls diversity via nucleus sampling (0-1).                                | `number`            | `1.0`   |
| `frequencyPenalty` | Penalizes repeated tokens (0-2). Higher values decrease repetition.           | `number`            | `0.0`   |
| `presencePenalty`  | Penalizes tokens based on presence (0-2). Higher values encourage new topics. | `number`            | `0.0`   |
| `seed`             | Optional integer seed for reproducible results.                               | `number` (integer)  | -       |
| `stopSequences`    | An array of strings that will stop generation if encountered.                 | `array` of `string` | -       |
| `extraOptions`     | A key-value object for provider-specific options.                             | `object`            | -       |

## OpenAPI Specification

For developers needing the raw API specification for code generation or other tooling, the OpenAPI 3.1 specification is available in JSON format.

- **Access:** Navigate to `/doc` on your running API server (e.g., `http://localhost:3141/doc`).

## Key Endpoints (via Swagger UI)

While the Swagger UI (`/ui`) provides the most comprehensive details, here's a brief overview of the main functionalities documented:

- **`GET /agents`**: Lists all agents currently registered with the `AgentRegistry`.
- **`POST /agents/{id}/text`**: Generates a plain text response from the specified agent based on the input prompt and options.
- **`POST /agents/{id}/stream`**: Streams a text response chunk by chunk using Server-Sent Events (SSE).
- **`POST /agents/{id}/object`**: Generates a structured JSON object response from the agent, guided by a provided schema.
- **`POST /agents/{id}/stream-object`**: Streams parts of a structured JSON object response using SSE.
- **(Other endpoints)**: Explore `/ui` for details on history, tool execution, update checks, etc.

:::warning[Object Generation Schema Mismatch]
Please note that while the API documentation for `/object` and `/stream-object` specifies that the `schema` parameter should be a standard JSON Schema object, the current backend implementation (`Agent.generateObject`, `Agent.streamObject`) still expects a Zod schema instance.
:::

## Authentication

Currently, the Core API does not implement built-in authentication routes. Ensure that your API server is deployed in a secure environment or protected by appropriate network-level security (e.g., firewall rules, reverse proxy authentication) if exposing it outside your local machine.

## Error Handling

The VoltAgent Core API provides comprehensive error handling for both regular HTTP endpoints and streaming endpoints.

### Regular Endpoints (Non-Streaming)

For regular endpoints like `/text` and `/object`, errors are returned as standard HTTP responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:

- `404`: Agent not found
- `500`: Internal server error (e.g., invalid schema, agent processing error)

### Streaming Endpoints (SSE)

For streaming endpoints like `/stream` and `/stream-object`, errors are delivered as Server-Sent Events within the stream itself. This allows real-time error reporting during long-running operations.

#### Error Event Format

When an error occurs during streaming, you'll receive an SSE event with `type: "error"`:

```javascript
data: {
  "type": "error",
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

#### Error Types and Codes

| Error Code        | Description                    | When it occurs                                        |
| ----------------- | ------------------------------ | ----------------------------------------------------- |
| `SETUP_ERROR`     | Error during initial setup     | Agent initialization or configuration issues          |
| `STREAM_ERROR`    | Generic streaming error        | LLM provider errors, network issues, invalid API keys |
| `ITERATION_ERROR` | Error during stream processing | Issues while processing stream chunks                 |

#### Streaming Event Flow

A typical successful stream contains these event types:

1. `text` or `object` events (data chunks)
2. `completion` event (stream finished successfully)

A stream with errors will contain:

1. `text` or `object` events (if any data was processed)
2. `error` event (when error occurs)
3. Stream closes after error event

#### Example Error Scenarios

**Invalid API Key:**

```javascript
data: {
  "type": "error",
  "error": "Incorrect API key provided: sk-proj-...",
  "code": "STREAM_ERROR",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**Schema Validation Error (Object Streaming):**

```javascript
data: {
  "type": "error",
  "error": "Schema validation failed: Expected string, received number",
  "code": "STREAM_ERROR",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

#### Handling Errors in Client Code

**JavaScript/TypeScript Example:**

```javascript
// Fetch-based SSE streaming (supports POST with request body)
const streamUrl = "/agents/your-agent-id/stream";
const response = await fetch(streamUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    input: "Tell me a joke!",
    options: { temperature: 0.7, maxTokens: 100 },
  }),
});

if (!response.ok) {
  throw new Error(`Stream request failed: ${response.status}`);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      try {
        const data = JSON.parse(line.substring(6));

        switch (data.type) {
          case "text":
            // Handle text chunk
            console.log("Text:", data.text);
            break;

          case "object":
            // Handle object chunk
            console.log("Object:", data.object);
            break;

          case "error":
            // Handle error
            console.error("Stream error:", data.error);
            console.error("Error code:", data.code);
            return; // Exit on error

          case "completion":
            // Handle completion
            console.log("Stream completed successfully");
            return;
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    }
  }
}
```

**cURL Example (Streaming with Error):**

```bash
# This will show error events in the stream if API key is invalid
curl -N -X POST http://localhost:3141/agents/your-agent-id/stream \
     -H "Content-Type: application/json" \
     -d '{ "input": "Hello!", "options": { "temperature": 0.7 } }'

# Example output with error:
# data: {"type":"error","error":"Incorrect API key provided","code":"STREAM_ERROR","timestamp":"2024-01-15T10:30:45.123Z"}
```

## Basic Example (Using cURL)

You can quickly test the API using `curl`. Below are examples for key endpoints. You can optionally include `userId` and `conversationId` in the `options` object for context tracking, as shown in the second example for each generation endpoint.

**List all agents:**

```bash
curl http://localhost:3141/agents
```

**Generate text (Basic):**

```bash
curl -X POST http://localhost:3141/agents/your-agent-id/text \
     -H "Content-Type: application/json" \
     -d '{ "input": "Tell me a joke!" }'
```

**Generate text (With Options):**

```bash
curl -X POST http://localhost:3141/agents/your-agent-id/text \
     -H "Content-Type: application/json" \
     -d '{ "input": "Tell me a joke!", "options": { "userId": "user-123", "conversationId": "your-unique-conversation-id" } }'
```

**Stream text (Basic):**

```bash
# Note: SSE streams are continuous. This command will keep the connection open.
curl -N -X POST http://localhost:3141/agents/your-agent-id/stream \
     -H "Content-Type: application/json" \
     -d '{ "input": "Tell me a joke!" }'
```

**Stream text (With Options):**

```bash
# Note: SSE streams are continuous. This command will keep the connection open.
curl -N -X POST http://localhost:3141/agents/your-agent-id/stream \
     -H "Content-Type: application/json" \
     -d '{ "input": "Tell me a joke!", "options": { "userId": "user-123", "conversationId": "your-unique-conversation-id" } }'
```

**Generate object (Basic - requires a Zod schema JSON representation, see warning above):**

```bash
# Replace '{"type":"object", ...}' with the JSON representation of your Zod schema
curl -X POST http://localhost:3141/agents/your-agent-id/object \
     -H "Content-Type: application/json" \
     -d '{ "input": "Extract the name and age from: John Doe is 30 years old.", "schema": {"type":"object", "properties": {"name": {"type": "string"}, "age": {"type": "number"}}, "required": ["name", "age"]} }'
```

**Generate object (With Options - requires a Zod schema JSON representation, see warning above):**

```bash
# Replace '{"type":"object", ...}' with the JSON representation of your Zod schema
curl -X POST http://localhost:3141/agents/your-agent-id/object \
     -H "Content-Type: application/json" \
     -d '{ "input": "Extract the name and age from: John Doe is 30 years old.", "schema": {"type":"object", "properties": {"name": {"type": "string"}, "age": {"type": "number"}}, "required": ["name", "age"]}, "options": { "userId": "user-123", "conversationId": "your-unique-conversation-id" } }'
```

**Stream object parts (Basic - requires a Zod schema JSON representation, see warning above):**

```bash
# Note: SSE streams are continuous.
# Replace '{"type":"object", ...}' with the JSON representation of your Zod schema
curl -N -X POST http://localhost:3141/agents/your-agent-id/stream-object \
     -H "Content-Type: application/json" \
     -d '{ "input": "Generate user profile: Name: Alice, City: Wonderland", "schema": {"type":"object", "properties": {"name": {"type": "string"}, "city": {"type": "string"}}, "required": ["name", "city"]} }'
```

**Stream object parts (With Options - requires a Zod schema JSON representation, see warning above):**

```bash
# Note: SSE streams are continuous.
# Replace '{"type":"object", ...}' with the JSON representation of your Zod schema
curl -N -X POST http://localhost:3141/agents/your-agent-id/stream-object \
     -H "Content-Type: application/json" \
     -d '{ "input": "Generate user profile: Name: Alice, City: Wonderland", "schema": {"type":"object", "properties": {"name": {"type": "string"}, "city": {"type": "string"}}, "required": ["name", "city"]}, "options": { "userId": "user-123", "conversationId": "your-unique-conversation-id" } }'
```

(Replace `your-agent-id` with the actual ID of one of your agents)

---

Explore the **Swagger UI at `/ui`** for detailed information on all endpoints, parameters, and schemas!
