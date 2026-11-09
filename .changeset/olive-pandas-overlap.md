---
"@voltagent/rag": patch
---

fix(rag): slice recursive overlap chunks by whole tokens instead of characters, so `overlapTokens` no longer produces mid-word fragments like "Fir" or " he"
