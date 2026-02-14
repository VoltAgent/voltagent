---
"@voltagent/core": patch
---

fix: persist conversation progress incrementally during multi-step runs

- Added step-level conversation persistence checkpoints so completed steps are no longer only saved at turn finish.
- Tool completion steps (`tool-result` / `tool-error`) now trigger immediate persistence flushes in step mode.
- Added configurable agent persistence options:
  - `conversationPersistence.mode` (`"step"` or `"finish"`)
  - `conversationPersistence.debounceMs`
  - `conversationPersistence.flushOnToolResult`
- Added global VoltAgent default `agentConversationPersistence` and wiring to registered agents.
