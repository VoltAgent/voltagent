---
"@voltagent/core": patch
"@voltagent/internal": patch
---

Copy embeddings in in-memory vector search results and deep-clone metadata at the store, get and search boundaries so caller mutations do not corrupt stored memories or change subsequent user-filtered searches. Only selected search results are cloned. Make the internal deep-clone fallback recursive, preserving cycles and shared references when metadata contains functions.

Compatibility note: nested custom class instances in vector metadata are now copied as plain data objects, rather than returned by reference. Their prototypes and prototype methods are not retained, so `instanceof` checks against the original class no longer succeed. Store plain data records (for example, the result of an explicit serializer) and reconstruct application-specific classes after retrieval if needed. Functions retain their existing references in the fallback.

The fallback copies binary storage using the built-in buffer slice methods and preserves own enumerable properties on buffers and views, including cyclic references.
