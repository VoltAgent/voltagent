---
"@voltagent/core": major
---

feat(core): Config to disable swagger ui

## By default:

In development (NODE_ENV !== 'production'): Swagger UI is enabled

In production (NODE_ENV === 'production'): Swagger UI is disabled

// Enable Swagger UI even in production
`startServer({ enableSwaggerUI: true });`

// Disable Swagger UI even in development
`startServer({ enableSwaggerUI: false });`

Resolves [#241](https://github.com/VoltAgent/voltagent/issues/241)
