---
"@voltagent/core": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/serverless-hono": patch
"@voltagent/server-elysia": patch
---

Add stream attach support for in-progress workflow executions.

- Add `GET /workflows/:id/executions/:executionId/stream` to attach to an active workflow SSE stream.
- Add replay support for missed SSE events via `fromSequence` and `Last-Event-ID`.
- Keep `POST /workflows/:id/stream` behavior unchanged for starting new executions.
- Ensure streamed workflow resume uses a fresh suspend controller so attach clients continue receiving events after resume.
