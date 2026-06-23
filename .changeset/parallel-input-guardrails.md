---
"@voltagent/core": minor
---

Add parallel input guardrails for `streamText` so async input checks can run while the model starts, buffer streamed output until they pass, and replace blocked streams without persisting generated assistant output.

UI streams produced with `toUIMessageStreamResponse()` or consumed by AI SDK `useChat` receive a blocked parallel input guardrail as replacement assistant text, so existing chat UIs can render it without using an error callback:

```tsx
const INPUT_BLOCKED_MESSAGE = "This request cannot be answered.";

const blocked =
  message.role === "assistant" &&
  message.parts?.some((part) => part.type === "text" && part.text === INPUT_BLOCKED_MESSAGE);
```
