---
"@voltagent/server-hono": patch
---

fix(server-hono): support Zod v4 record schemas in Swagger docs

The built-in tool OpenAPI schemas now use explicit record key and value schemas so Zod v4 does not
produce undefined record value types during Swagger document generation.
