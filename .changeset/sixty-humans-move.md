---
"@voltagent/core": patch
---

fix: infer structured output types for `generateText`

`generateText` now propagates the provided `Output.*` spec into the return type, so `result.output` is no longer `unknown` when using `Output.object`, `Output.array`, etc.
