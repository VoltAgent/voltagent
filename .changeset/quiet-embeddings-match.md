---
"@voltagent/core": patch
---

Key the embedding cache by the full input text so distinct messages cannot reuse each other's embeddings after a hash collision.
