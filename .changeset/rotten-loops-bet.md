---
"@voltagent/serverless-hono": patch
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

feat: add first-class REST tool endpoints and UI support - #638

- Server: list and execute registered tools over HTTP (`GET /tools`, `POST /tools/:name/execute`) with zod-validated inputs and OpenAPI docs.
- Auth: Both GET and POST tool endpoints are behind the same auth middleware as agent/workflow execution (protected by default).
- Multi-agent tools: tools now report all owning agents via `agents[]` (no more single `agentId`), including tags when provided.
- Safer handlers: input validation via safeParse guard, tag extraction without `any`, and better error shaping.
- Serverless: update install route handles empty bodies and `/updates/:packageName` variant.
- Console: Unified list surfaces tools, tool tester drawer with Monaco editors and default context, Observability page adds a Tools tab with direct execution.
- Docs: New tools endpoint page and API reference entries for listing/executing tools.
