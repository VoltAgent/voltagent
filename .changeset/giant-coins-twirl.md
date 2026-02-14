---
"@voltagent/core": patch
---

Add multi-step loop bodies for `andDoWhile` and `andDoUntil`.

- Loop steps now accept either a single `step` or a sequential `steps` array.
- When `steps` is provided, each iteration runs the steps in order and feeds each output into the next step.
- Workflow step serialization now includes loop `subSteps` when a loop has multiple steps.
- Added runtime and type tests for chained loop steps.
