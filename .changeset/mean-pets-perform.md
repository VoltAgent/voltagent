---
"@voltagent/core": patch
---

Fix stale semantic-search results after `Memory.clearMessages()`.

Previously, `clearMessages()` removed conversation messages from storage but left vector
embeddings behind when a vector adapter was configured. This meant semantic search could
still return hits for cleared conversations even though the message history had been removed.

## What Changed

- `Memory.clearMessages(userId, conversationId)` now deletes vector entries for that
  conversation before clearing storage
- `Memory.clearMessages(userId)` now also deletes vector entries across all of the user's
  conversations

## Impact

- Cleared conversations no longer appear in semantic search results
- Message storage and vector storage stay in sync after cleanup
