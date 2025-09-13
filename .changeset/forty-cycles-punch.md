---
"@voltagent/core": patch
---

feat(core): semantic memory defaults and retrieval fixes

## Summary

- Default `semanticMemory.mergeStrategy` is now `"append"` (previously `"prepend"`).
- Default `semanticMemory.semanticThreshold` is `0.7`.
- Fix: propagate `semanticMemory` options end‑to‑end (Agent → MemoryManager → Memory).
- Fix: preserve vector result order when mapping `messageIds` → `UIMessage`.
- Docs: updated Semantic Search/Overview to reflect new defaults.
- Examples: long conversation demo with optional real LLM seeding.

## Why

Appending semantic hits after the recent context reduces stale facts overriding recent ones (e.g., old name "Ömer" overshadowing newer "Ahmet"). Preserving vector result order ensures the most relevant semantic hits remain in ranked order.

## Defaults

When `userId` + `conversationId` are provided and vectors are configured:

- `enabled: true`
- `semanticLimit: 5`
- `semanticThreshold: 0.7`
- `mergeStrategy: "append"`

## Migration Notes

If you relied on the previous default `mergeStrategy: "prepend"`, explicitly set:

```ts
await agent.generateText(input, {
  userId,
  conversationId,
  semanticMemory: { mergeStrategy: "prepend" },
});
```

Otherwise, no action is required.
