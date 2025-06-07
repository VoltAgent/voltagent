---
"@voltagent/core": patch
---

feat: add messages parameter to onEnd hook

Added `messages` array to the `onEnd` hook arguments, containing the current conversation turn. On success, includes both user input and assistant response. On error, includes only user input. Perfect for storing conversation history without reconstructing from separate events.

```ts
const hooks = createHooks({
  onEnd: async ({ agent, output, error, messages, context }) => {
    console.log(`Conversation turn:`, {
      user: messages[0]?.content,
      assistant: messages[1]?.content,
    });
  },
});
```
