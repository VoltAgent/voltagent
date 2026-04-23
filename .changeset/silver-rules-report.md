---
"@voltagent/server-core": patch
---

fix(server-core): publish schema factory required by server-hono

Publishes the `createServerCoreSchemas` export used by `@voltagent/server-hono` to build Swagger
schemas with the active Zod instance. This keeps `server-hono` releases from resolving against a
`server-core` package that does not provide the required runtime export.
