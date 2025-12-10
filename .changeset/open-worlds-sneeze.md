---
"@voltagent/voltagent-memory": patch
"@voltagent/serverless-hono": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/postgres": patch
"@voltagent/supabase": patch
"@voltagent/libsql": patch
"@voltagent/core": patch
---

feat: workflow execution listing - #844

Added a unified way to list workflow runs so teams can audit executions across every storage backend and surface them via the API and console.

## What changed

- `queryWorkflowRuns` now exists on all memory adapters (in-memory, libsql, Postgres, Supabase, voltagent-memory) with filters for `workflowId`, `status`, `from`, `to`, `limit`, and `offset`.
- Server routes are consolidated under `/workflows/executions` (no path param needed); `GET /workflows/:id` also returns the workflow result schema for typed clients. Handler naming is standardized to `listWorkflowRuns`.
- VoltOps Console observability panel lists the new endpoint; REST docs updated with query params and sample responses. New unit tests cover handlers and every storage adapter.

## Quick fetch

```ts
await fetch(
  "http://localhost:3141/workflows/executions?workflowId=expense-approval&status=completed&from=2024-01-01&to=2024-01-31&limit=20&offset=0"
);
```
