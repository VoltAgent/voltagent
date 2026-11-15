---
"@voltagent/rag": patch
---

Treat tokenizer special-token spellings as ordinary document text, so token counting and chunking no longer throw on content such as `<|endoftext|>`.
