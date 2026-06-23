---
"@voltagent/core": minor
---

Add parallel input guardrails for `streamText` so async input checks can run while the model starts, buffer streamed output until they pass, and replace blocked streams without persisting generated assistant output.
