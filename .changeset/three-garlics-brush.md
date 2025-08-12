---
"@voltagent/core": patch
---

fix: InMemoryStorage timestamp field for VoltOps history display

Fixed an issue where VoltOps history wasn't displaying when using InMemoryStorage. The problem was caused by using `updatedAt` field instead of `timestamp` when setting history entries.

The fix ensures that the `timestamp` field is properly preserved when updating history entries in InMemoryStorage, allowing VoltOps to correctly display workflow execution history.
