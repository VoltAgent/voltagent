---
"@voltagent/rag": patch
---

fix(rag): detect top-level JSON arrays in `detectFormat` so the `auto` chunking strategy routes them to the JSON chunker instead of the recursive one
