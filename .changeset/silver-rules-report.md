---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

fix(server-hono): require server-core schema factory release

Publishes the `createServerCoreSchemas` export used by `@voltagent/server-hono` to build Swagger
schemas with the active Zod instance, and updates `server-hono` to require a `server-core` release
that provides the runtime export.
