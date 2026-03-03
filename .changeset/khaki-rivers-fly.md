---
"@voltagent/core": patch
---

fix: prevent duplicate assistant message persistence during step checkpoints (#1121)

When `conversationPersistence.mode = "step"` flushed around tool results, the same assistant
response could be persisted multiple times with different `message_id` values. This created
duplicate assistant rows in memory and could surface downstream provider errors like duplicate
OpenAI reasoning item ids.

This update keeps a stable assistant response message id across step checkpoints and skips duplicate
step response payloads before buffering, so intermediate checkpoint flushes update the same memory
message instead of inserting new duplicates.
