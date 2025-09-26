---
"@voltagent/core": patch
---

feat: add `onPrepareModelMessages` hook

- ensure `onPrepareMessages` now receives the sanitized UI payload while exposing `rawMessages` for audit or metadata recovery without sending it to the LLM.
- introduce `onPrepareModelMessages` so developers can tweak the final provider-facing message array (e.g. add guardrails, adapt to provider quirks) after conversion.

```ts
const hooks = createHooks({
  onPrepareMessages: ({ messages, rawMessages }) => ({
    messages: messages.map((msg) =>
      messageHelpers.addTimestampToMessage(msg, new Date().toISOString())
    ),
    rawMessages, // still available for logging/analytics
  }),
  onPrepareModelMessages: ({ modelMessages }) => ({
    modelMessages: modelMessages.map((message, idx) =>
      idx === modelMessages.length - 1 && message.role === "assistant"
        ? {
            ...message,
            content: [
              ...message.content,
              { type: "text", text: "Please keep the summary under 200 words." },
            ],
          }
        : message
    ),
  }),
});
```
