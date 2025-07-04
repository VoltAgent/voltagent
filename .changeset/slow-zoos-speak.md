---
"@voltagent/core": patch
---

fix: separate conversation memory from history storage when memory: false

When `memory: false` is set, conversation memory and user messages should be disabled, but history storage and timeline events should continue working. Previously, both conversation memory and history storage were being disabled together.

**Before:**

```typescript
const agent = new Agent({
  name: "TestAgent",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: false, // ❌ Disabled both conversation memory AND history storage
});

// Result: No conversation context + No history/events tracking
```

**After:**

```typescript
const agent = new Agent({
  name: "TestAgent",
  instructions: "You are a helpful assistant",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  memory: false, // ✅ Disables only conversation memory, history storage remains active
});

// Result: No conversation context + History/events tracking still works
```

**What this means for users:**

- ✅ `memory: false` now only disables conversation memory (user messages and context)
- ✅ History storage and timeline events continue to work for debugging and observability
- ✅ Agent interactions are still tracked in VoltAgent Console
- ✅ Tools and sub-agents can still access operation context and history

This change improves the observability experience while maintaining the expected behavior of disabling conversation memory when `memory: false` is set.

Fixes the issue where setting `memory: false` would prevent history and events from being tracked in the VoltAgent Console.
