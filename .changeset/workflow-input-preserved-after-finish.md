---
"@voltagent/core": patch
---

Fixed workflow `state.input` being overwritten with the final output once a workflow finished. `finish()` reassigned the stored input to the current data, so reading `state.input` after completion returned the final result instead of the initial input it documents. The initial input is now preserved through completion; `state.data` still reflects the final value.
