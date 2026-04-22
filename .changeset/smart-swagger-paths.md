---
"@voltagent/server-hono": patch
---

fix(server-hono): generate Swagger schemas with a single Zod instance

Built-in Swagger route schemas now reuse the same schema definitions with the Zod instance selected
by server-hono's OpenAPI compatibility layer. This avoids mixing Zod v3/v4 schema instances and
prevents `/doc` from failing during OpenAPI generation.
