---
"@voltagent/core": patch
---

fix: normalize MCP elicitation requests with empty `message` by falling back to the schema description so handlers receive a usable prompt.
