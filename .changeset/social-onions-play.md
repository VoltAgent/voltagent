---
"@voltagent/postgres": major
---

feat(postgres-memory-adapter): add schema configuration support

Adds support for defining a custom PostgreSQL schema during adapter initialization.
By default, the schema is set to `public`. Users can now query and mutate tables
within a specific schema through new helper functions.

Includes tests for schema configuration and related functions.

Resolves #763
