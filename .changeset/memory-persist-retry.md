---
"@voltagent/core": patch
---

Keep conversation messages pending until their memory writes succeed and retry failed writes on the next operation for the same conversation. Memory failures remain best effort for agent responses.
