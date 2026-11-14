---
"@voltagent/evals": patch
---

Propagate experiment callback failures without orphaned promise rejections. Keep failed tasks observable while an asynchronous dataset is waiting for its next item, so a failed run cannot be reported as successful.
