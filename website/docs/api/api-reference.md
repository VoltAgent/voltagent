---
title: API Reference
sidebar_label: Quick Reference
---

# API Quick Reference

Complete reference of all VoltAgent Server API endpoints.

## Base URL

```
http://localhost:3141
```

Default port is 3141, but may vary based on configuration.

## Documentation Endpoints

| Method | Path   | Description                 | Auth |
| ------ | ------ | --------------------------- | ---- |
| GET    | `/`    | Landing page with links     | No   |
| GET    | `/doc` | OpenAPI 3.1 specification   | No   |
| GET    | `/ui`  | Swagger UI interactive docs | No   |

## Agent Endpoints

| Method | Path                        | Description                    | Auth |
| ------ | --------------------------- | ------------------------------ | ---- |
| GET    | `/agents`                   | List all registered agents     | No   |
| GET    | `/agents/:id`               | Get agent details              | No   |
| POST   | `/agents/:id/text`          | Generate text response         | Yes  |
| POST   | `/agents/:id/stream`        | Stream text response (SSE)     | Yes  |
| POST   | `/agents/:id/object`        | Generate structured object     | Yes  |
| POST   | `/agents/:id/stream-object` | Stream object generation (SSE) | Yes  |
| GET    | `/agents/:id/history`       | Get agent execution history    | No   |

## Tool Endpoints

| Method | Path                   | Description                       | Auth |
| ------ | ---------------------- | --------------------------------- | ---- |
| GET    | `/tools`               | List all registered tools         | No   |
| POST   | `/tools/:name/execute` | Execute a tool directly over HTTP | Yes  |

### Common Request Format

```json
{
  "input": "string or message array",
  "options": {
    "userId": "string",
    "conversationId": "string",
    "contextLimit": 10,
    "maxSteps": 5,
    "temperature": 0.7,
    "maxOutputTokens": 4000,
    "topP": 1.0,
    "frequencyPenalty": 0.0,
    "presencePenalty": 0.0,
    "seed": 42,
    "stopSequences": ["\\n\\n"],
    "providerOptions": {},
    "context": {}
  }
}
```

## Workflow Endpoints

| Method | Path                                             | Description                     | Auth |
| ------ | ------------------------------------------------ | ------------------------------- | ---- |
| GET    | `/workflows`                                     | List all workflows              | No   |
| GET    | `/workflows/:id`                                 | Get workflow details            | No   |
| POST   | `/workflows/:id/execute`                         | Execute workflow                | Yes  |
| POST   | `/workflows/:id/stream`                          | Stream workflow execution (SSE) | Yes  |
| POST   | `/workflows/:id/executions/:executionId/suspend` | Suspend execution               | No\* |
| POST   | `/workflows/:id/executions/:executionId/resume`  | Resume execution                | No\* |
| GET    | `/workflows/:id/executions/:executionId/state`   | Get execution state             | No   |

### Workflow Request Format

```json
{
  "input": {},
  "options": {
    "userId": "string",
    "conversationId": "string",
    "executionId": "string",
    "context": {}
  }
}
```

## Logging & Observability

| Method | Path                                  | Description                 | Auth |
| ------ | ------------------------------------- | --------------------------- | ---- |
| GET    | `/api/logs`                           | Query system logs (filters) | No   |
| GET    | `/observability/status`               | Observability status        | No   |
| GET    | `/observability/traces`               | List traces                 | No   |
| GET    | `/observability/traces/:traceId`      | Get trace by ID             | No   |
| GET    | `/observability/spans/:spanId`        | Get span by ID              | No   |
| GET    | `/observability/traces/:traceId/logs` | Logs for a trace            | No   |
| GET    | `/observability/spans/:spanId/logs`   | Logs for a span             | No   |
| GET    | `/observability/logs`                 | Query logs (filters)        | No   |
| POST   | `/setup-observability`                | Configure VoltAgent keys    | No   |

## System

| Method | Path       | Description             | Auth |
| ------ | ---------- | ----------------------- | ---- |
| GET    | `/updates` | Check available updates | No   |
| POST   | `/updates` | Install updates         | No   |

## WebSockets

```javascript
// Connection test / echo
const ws = new WebSocket("ws://localhost:3141/ws");

// Real-time logs (supports ?level, ?agentId, ?workflowId, ?executionId, ?since, ?until, ?limit)
const logsWs = new WebSocket("ws://localhost:3141/ws/logs?level=info");

// Observability (optional filters: ?entityId=&entityType=agent|workflow)
const obsWs = new WebSocket(
  "ws://localhost:3141/ws/observability?entityType=agent&entityId=assistant"
);
```

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### SSE Event Format

```
event: event-type
data: {"key": "value"}
id: optional-id

```

## HTTP Status Codes

| Code | Description                            |
| ---- | -------------------------------------- |
| 200  | Success                                |
| 201  | Created                                |
| 400  | Bad Request - Invalid input            |
| 401  | Unauthorized - Authentication required |
| 404  | Not Found - Resource doesn't exist     |
| 500  | Internal Server Error                  |

## Authentication

Include JWT token in Authorization header for protected endpoints:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## cURL Examples

### List Agents

```bash
curl http://localhost:3141/agents
```

### Generate Text (Protected)

```bash
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input": "Hello"}'
```

### Execute Workflow

```bash
curl -X POST http://localhost:3141/workflows/my-workflow/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input": {"key": "value"}}'
```

### Stream Response

```bash
curl -N -X POST http://localhost:3141/agents/assistant/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input": "Tell me a story"}'
```

## JavaScript/TypeScript Client

### Basic Request

```typescript
const response = await fetch("http://localhost:3141/agents", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});

const agents = await response.json();
```

### Authenticated Request

```typescript
const response = await fetch("http://localhost:3141/agents/assistant/text", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    input: "Hello",
    options: { temperature: 0.7 },
  }),
});
```

### Stream Handling

```typescript
const response = await fetch("http://localhost:3141/agents/assistant/stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ input: "Stream this" }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Process SSE chunk
}
```

## Environment Variables

| Variable               | Description                          | Default     |
| ---------------------- | ------------------------------------ | ----------- |
| `PORT`                 | Server port                          | -           |
| `NODE_ENV`             | Environment (development/production) | development |
| `JWT_SECRET`           | JWT signing secret                   | -           |
| `VOLTAGENT_PUBLIC_KEY` | VoltOps public key                   | -           |
| `VOLTAGENT_SECRET_KEY` | VoltOps secret key                   | -           |

Note: The server reads its port from the `honoServer({ port })` config. `PORT` is not used by default.

## Related Documentation

- **[Server Architecture](./server-architecture.md)** - Understanding server design
- **[Agent Endpoints](./endpoints/agents.md)** - Detailed agent API
- **[Workflow Endpoints](./endpoints/workflows.md)** - Workflow execution details
- **[Authentication](./authentication.md)** - Security and auth setup
- **[Custom Endpoints](./custom-endpoints.md)** - Adding custom routes

## Additional Resources

- **Interactive API Explorer**: Navigate to `/ui` on your running server
- **OpenAPI Specification**: Available at `/doc` for code generation
- **GitHub Repository**: [github.com/voltagent/voltagent](https://github.com/voltagent/voltagent)

Footnote: `*` As of the current version, `suspend` and `resume` are not in the default protected route list. Secure them explicitly if needed.
