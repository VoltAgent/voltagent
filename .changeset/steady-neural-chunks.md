---
"@voltagent/rag": patch
---

Assign distinct NeuralChunker IDs to fitting detector segments after earlier token expansion, so returned chunks do not overwrite each other in ID-keyed stores. Fixes #1518.
