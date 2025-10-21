---
"@voltagent/core": patch
---

fix: sanitize stored assistant/tool messages so GPT-5 conversations no longer crash with "missing reasoning item" errors when replaying memory history

fixes:

- #706
