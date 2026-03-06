---
"@voltagent/core": patch
"@voltagent/server-core": patch
---

feat: add per-call memory read-only mode via `memory.options.readOnly`.

When `readOnly` is enabled, the agent still reads conversation context and working memory, but skips memory writes for the current call.

What changes in read-only mode:

- Conversation message persistence is disabled.
- Step persistence/checkpoint writes are disabled.
- Background input persistence for context hydration is disabled.
- Working memory write tools are disabled (`update_working_memory`, `clear_working_memory`).
- Read-only tool remains available (`get_working_memory`).

`@voltagent/server-core` now accepts `memory.options.readOnly` in request schema/options parsing.

### Before

```ts
await agent.generateText("Summarize this", {
  memory: {
    userId: "user-123",
    conversationId: "conv-456",
  },
});
// reads + writes memory
```

### After

```ts
await agent.generateText("Summarize this", {
  memory: {
    userId: "user-123",
    conversationId: "conv-456",
    options: {
      readOnly: true,
    },
  },
});
// reads memory only, no writes
```
