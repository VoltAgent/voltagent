---
"@voltagent/postgres": minor
---

feat(postgres-memory-adapter): add schema configuration support

Add support for defining a custom PostgreSQL schema during adapter initialization.
Defaults to undefined (uses the database’s default schema if not provided).

Includes tests for schema configuration.

Resolves #763
