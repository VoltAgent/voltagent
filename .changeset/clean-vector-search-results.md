---
"@voltagent/core": patch
"@voltagent/internal": patch
---

Copy embeddings in in-memory vector search results and deep-clone metadata at the store, get and search boundaries so caller mutations do not corrupt stored memories or change subsequent user-filtered searches. Only selected search results are cloned. Make the internal deep-clone fallback recursive, preserving cycles and shared references when metadata contains functions.
