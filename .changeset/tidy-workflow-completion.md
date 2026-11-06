---
"@voltagent/core": minor
---

Clean up workflow signal polling intervals and abort listeners when a step settles, including successful and failed steps.

Expose a typed `completion` promise from `startAsync()` so callers can await execution and terminal handling while keeping the initial persisted-state acknowledgement and background execution behavior.
