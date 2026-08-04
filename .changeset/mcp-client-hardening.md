---
"@voltagent/core": patch
---

Harden MCP client transport setup by filtering stdio environment variables and rejecting local, private, link-local, and reserved MCP server URL targets.
