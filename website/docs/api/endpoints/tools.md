---
title: Tool Endpoints
sidebar_label: Tools
---

# Tool Endpoints

VoltAgent can expose tools directly as REST endpoints (alongside agent/workflow APIs). Tools are discovered from registered agents and can be invoked over HTTP without going through an agent chat.

## List Tools

**Endpoint:** `GET /tools`  
**Auth:** Protected by default (follows your auth middleware config)

Returns all executable tools, including their schemas and owning agent metadata.

```bash
curl http://localhost:3141/tools
```

**Response**

```json
{
  "success": true,
  "data": [
    {
      "name": "web_search",
      "description": "Search the web",
      "tags": ["search", "external-api"],
      "parameters": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "count": { "type": "number" }
        },
        "required": ["query"]
      },
      "status": "ready",
      "agents": [
        { "id": "assistant", "name": "Assistant" },
        { "id": "assistant-shadow", "name": "Assistant Shadow" }
      ]
    }
  ]
}
```

## Execute Tool

**Endpoint:** `POST /tools/:name/execute`  
**Auth:** Protected by default (follows your auth middleware config)

```bash
curl -X POST http://localhost:3141/tools/web_search/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "query": "latest ai news", "count": 3 },
    "context": { "userId": "user-123" }
  }'
```

**Request Body**

```json
{
  "input": {}, // Tool-specific params (validated against the tool's schema)
  "context": {} // Optional metadata (forwarded to the tool)
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "toolName": "web_search",
    "result": {
      /* tool output */
    },
    "executionTime": 234,
    "timestamp": "2025-09-29T12:00:00Z"
  }
}
```

## Notes

- GET `/tools` remains public by default; POST `/tools/:name/execute` is protected in the default auth settings (aligns with `/agents/*` and `/workflows/*` execution routes).
- Tools appear in Swagger UI under the “Tools” tag when `enableSwaggerUI` is enabled.
