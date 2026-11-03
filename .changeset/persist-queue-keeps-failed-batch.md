---
"@voltagent/core": patch
---

Keep buffered conversation messages pending until their storage write succeeds: `MemoryPersistQueue` now peeks the buffer and acknowledges each message individually instead of draining the whole batch up front, so a failed write leaves the failed message and the unattempted rest pending for the next flush, and a message updated during an in-flight write is saved with its newer content. `MemoryManager.saveMessage` rethrows storage failures (the persistence queue and `saveCurrentInput` keep their best-effort handling), so a failed write can no longer be acknowledged as success.
