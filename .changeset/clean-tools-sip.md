---
"@voltagent/core": patch
---

Sanitize tool call inputs before model replay so malformed or non-object values cannot break provider history conversion.
