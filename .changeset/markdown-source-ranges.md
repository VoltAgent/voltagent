---
"@voltagent/rag": patch
---

fix(rag): map MarkdownChunker ranges and position metadata back to the original Markdown source, including sections, CRLF, list/quote markers, and fenced code. Addresses the Markdown offsets portion of #1542.
