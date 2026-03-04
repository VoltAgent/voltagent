---
"@voltagent/core": patch
---

fix(core): persist reasoning and tool parts across step checkpoint flushes (#1130)

When `conversationPersistence.mode = "step"` was used with tool calls, some checkpoint flows could
persist incomplete assistant messages and lose non-text parts in stored conversation history.

This update preserves complete assistant message parts during checkpoint merges and persistence
flushes, including reasoning, tool-call, tool-result, and text parts.

Regression coverage is expanded with end-to-end agent persistence tests against both LibSQL and
PostgreSQL backends to reduce the chance of similar regressions.
