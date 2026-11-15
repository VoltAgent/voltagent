---
"@voltagent/core": patch
---

Prevent model retries and fallback from replaying tool calls in `generateText`, including when
an approved tool executes before the first model step. Surface the original failure to the caller.

Fixes #1537.
