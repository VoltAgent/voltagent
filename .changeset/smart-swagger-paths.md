---
"@voltagent/server-hono": patch
---

fix(server-hono): keep Swagger docs populated when OpenAPI generation falls back

Swagger now falls back to registered VoltAgent and custom route metadata when schema generation
throws, so `/ui` and `/doc` still list available APIs instead of rendering an empty spec.
