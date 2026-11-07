---
"@voltagent/rag": patch
---

Fix `buildMetadata` letting `extra` overwrite the `format` and `sourceType` identifiers declared by the calling chunker, so delegating chunkers (`HtmlChunker`, `TableChunker`, `NeuralChunker`, `SlumberChunker`) keep reporting their own format.
