---
"@voltagent/core": minor
---

Add parallel input guardrails for `streamText` so async input checks can run while the model starts, buffer streamed output until they pass, and replace blocked streams without persisting generated assistant output.

UI streams produced with `toUIMessageStreamResponse()` or consumed by AI SDK `useChat` receive a `data-input-guardrail-blocked` event before the replacement assistant text, so UIs can translate the block state without string-matching the fallback message:

```tsx
const blocked =
  message.role === "assistant" &&
  message.parts?.some((part) => part.type === "data-input-guardrail-blocked");
```
