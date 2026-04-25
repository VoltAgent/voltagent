---
"@voltagent/server-core": patch
"@voltagent/server-elysia": patch
"@voltagent/server-hono": patch
---

fix(server-core): enable explicit cancellation for resumable chat streams

When resumableStream is enabled, the AbortSignal was unconditionally cleared, preventing clients from explicitly cancelling ongoing chat streams. This update replaces the cleared signal with an internal AbortController that can be triggered via a new cancel endpoint.

Adds:
- `handleCancelChat` handler in server-core
- `POST /agents/:id/chat/:conversationId/cancel` route in server-elysia and server-hono
- Internal AbortController management keyed by `${agentId}:${conversationId}:${userId}`

The cancel endpoint aborts the stream and cleans up both the AbortController and the resumable stream adapter state.

Note: The in-memory AbortController map only supports single-instance deployments; horizontally scaled environments require external coordination.
