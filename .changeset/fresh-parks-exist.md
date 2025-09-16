---
"@voltagent/server-hono": patch
---

fix: add Zod v3/v4 compatibility layer for @hono/zod-openapi

- Added dynamic detection of Zod version using `toJSONSchema` method check
- Conditionally loads correct @hono/zod-openapi version based on installed Zod
- Fixed route definitions to use enhanced `z` from zod-openapi-compat instead of extending base schemas
- Resolves `.openapi()` method not found errors when using Zod v4
