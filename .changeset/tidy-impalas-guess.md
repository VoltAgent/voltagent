---
"@voltagent/core": patch
---

fix: userContext changes in onEnd hook now properly reflected in final response

The `userContext` changes made in the `onEnd` hook were not being reflected in the final response from `.generateText()` and `.generateObject()` methods. This was because the userContext snapshot was taken before the `onEnd` hook execution, causing any modifications made within the hook to be lost.

**Before**:

```typescript
const agent = new Agent({
  name: "TestAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  hooks: createHooks({
    onEnd: ({ context }) => {
      // This change was lost in the final response
      context.userContext.set("agent_response", "bye");
    },
  }),
});

const response = await agent.generateText("Hello", {
  userContext: new Map([["agent_response", "hi"]]),
});

console.log(response.userContext?.get("agent_response")); // ❌ "hi" (old value)
```

**After**:

```typescript
const agent = new Agent({
  name: "TestAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  hooks: createHooks({
    onEnd: ({ context }) => {
      // This change is now preserved in the final response
      context.userContext.set("agent_response", "bye");
    },
  }),
});

const response = await agent.generateText("Hello", {
  userContext: new Map([["agent_response", "hi"]]),
});

console.log(response.userContext?.get("agent_response")); // ✅ "bye" (updated value)
```
