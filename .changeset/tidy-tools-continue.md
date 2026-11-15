---
"@voltagent/core": patch
---

Prevent model retries and fallback from replaying completed tool calls in `generateText`. Once a
step records a tool result or error, subsequent failures are surfaced to the caller.

Fixes #1537.
