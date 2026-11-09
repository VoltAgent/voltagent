---
"@voltagent/rag": patch
---

fix(rag): count recursive overlap in whole tokenizer tokens instead of characters, so `overlapTokens` no longer slices mid-token fragments like "Fir" or " he"; fractional `overlapTokens` values are rounded up instead of duplicating the next chunk
