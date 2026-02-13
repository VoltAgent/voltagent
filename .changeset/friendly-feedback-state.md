---
"@voltagent/core": patch
---

fix: preserve request correlation with root workflow and agent spans

- Keep workflow and agent root spans as real roots when no explicit parent is provided.
- Add OpenTelemetry span links to the active ambient span so request-level correlation is preserved without reintroducing pending/running root-state issues.
- Keep existing workflow resume links and combine them with the new ambient link when both are available.
