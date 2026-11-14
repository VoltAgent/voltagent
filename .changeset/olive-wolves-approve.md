---
"@voltagent/core": patch
---

fix(core): persist client approval decisions onto buffered tool parts so restored conversations keep `approval-responded` state instead of re-validating stale parts and throwing `AI_TypeValidationError`
