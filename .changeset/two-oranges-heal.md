---
"@voltagent/voltagent-memory": patch
"@voltagent/cloudflare-d1": patch
"@voltagent/server-elysia": patch
"@voltagent/server-core": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
---

feat: add multi-tenant filters to workflow execution listing (`/workflows/executions`)

You can now filter workflow execution history by `userId` and metadata fields in addition to
existing filters (`workflowId`, `status`, `from`, `to`, `limit`, `offset`).

### What's New

- Added `userId` filter support for workflow run queries.
- Added metadata filtering support:
  - `metadata` as URL-encoded JSON object
  - `metadata.<key>` query params (for example: `metadata.tenantId=acme`)
- Added status aliases for compatibility:
  - `success` -> `completed`
  - `pending` -> `running`
- Implemented consistently across storage adapters:
  - In-memory
  - PostgreSQL
  - LibSQL
  - Supabase
  - Cloudflare D1
  - Managed Memory (`@voltagent/voltagent-memory`)
- Updated server docs and route descriptions to include new filters.

### TypeScript Example

```ts
const params = new URLSearchParams({
  workflowId: "order-approval",
  status: "completed",
  userId: "user-123",
  "metadata.tenantId": "acme",
  "metadata.region": "eu",
  limit: "20",
  offset: "0",
});

const response = await fetch(`http://localhost:3141/workflows/executions?${params.toString()}`);
const data = await response.json();
```

### cURL Examples

```bash
# Filter by workflow + user + metadata key
curl "http://localhost:3141/workflows/executions?workflowId=order-approval&userId=user-123&metadata.tenantId=acme&status=completed&limit=20&offset=0"
```

```bash
# Filter by metadata JSON object (URL-encoded)
curl "http://localhost:3141/workflows/executions?metadata=%7B%22tenantId%22%3A%22acme%22%2C%22region%22%3A%22eu%22%7D"
```
