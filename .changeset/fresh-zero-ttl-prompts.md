---
"@voltagent/core": patch
---

Honor a prompt cache TTL of zero for both global and per-prompt settings, including consecutive lookups in the same millisecond. Related to the prompt-cache correctness finding in #1493.
