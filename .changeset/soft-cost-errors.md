---
"@voltagent/core": patch
---

fix: preserve usage and provider cost metadata on structured output failures

When `generateText` receives a successful model response but structured output is not produced,
VoltAgent now keeps the resolved usage, finish reason, and provider metadata on the resulting
error path.

This preserves provider-reported cost data for observability spans and makes the same metadata
available to error hooks through `VoltAgentError.metadata`.
