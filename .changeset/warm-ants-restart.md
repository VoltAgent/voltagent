---
"@voltagent/core": patch
---

Preserve resume data when restarting an interrupted workflow and expose a stable top-level step execution ID. Nested steps and iterations share this ID and need their own discriminator for idempotent side effects. Fixes #1435.
