---
"@voltagent/serverless-hono": patch
"@voltagent/server-elysia": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

feat: add memory HTTP endpoints for conversations, messages, working memory, and search across server-core, Hono, Elysia, and serverless runtimes.

### Endpoints

- `GET /api/memory/conversations`
- `POST /api/memory/conversations`
- `GET /api/memory/conversations/:conversationId`
- `PATCH /api/memory/conversations/:conversationId`
- `DELETE /api/memory/conversations/:conversationId`
- `POST /api/memory/conversations/:conversationId/clone`
- `GET /api/memory/conversations/:conversationId/messages`
- `GET /api/memory/conversations/:conversationId/working-memory`
- `POST /api/memory/conversations/:conversationId/working-memory`
- `POST /api/memory/save-messages`
- `POST /api/memory/messages/delete`
- `GET /api/memory/search`

Note: include `agentId` (query/body) when multiple agents are registered or no global memory is configured.

### Examples

Create a conversation:

```bash
curl -X POST http://localhost:3141/api/memory/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "resourceId": "assistant",
    "title": "Support Chat",
    "metadata": { "channel": "web" }
  }'
```

Save messages into the conversation:

```bash
curl -X POST http://localhost:3141/api/memory/save-messages \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "conversationId": "conv-001",
    "messages": [
      { "role": "user", "content": "Hi there" },
      { "role": "assistant", "content": "Hello!" }
    ]
  }'
```

Update working memory (append mode):

```bash
curl -X POST http://localhost:3141/api/memory/conversations/conv-001/working-memory \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Customer prefers email follow-ups.",
    "mode": "append"
  }'
```

Search memory (requires embedding + vector adapters):

```bash
curl "http://localhost:3141/api/memory/search?searchQuery=refund%20policy&limit=5"
```
