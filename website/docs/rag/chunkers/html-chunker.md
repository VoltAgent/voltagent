---
title: HTML Chunker
slug: /rag/chunkers/html
---

# HTML Chunker

Strips tags, removes script/style blocks, decodes common entities, replaces block tags with newlines, then chunks text with `RecursiveChunker`.

## Usage

```typescript
import { HtmlChunker } from "@voltagent/rag";

const html = `
<html>
  <body>
    <h1>Heading</h1>
    <p>First paragraph.</p>
    <p>Second paragraph with more words.</p>
    <script>console.log("ignored");</script>
  </body>
</html>
`;

const chunks = new HtmlChunker().chunk(html, { maxTokens: 80 });

// Output:
// [
//   { content: "Heading\nFirst paragraph.\nSecond paragraph with more words.", metadata: { sourceType: "html" } }
// ]
```

## Options

- `maxTokens` (number): token budget per chunk, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"html"`

Passing `tokenizer` to `chunk(html, { tokenizer })` overrides the constructor tokenizer for that call.

## Output

- `metadata.sourceType: "html"`
- Chunks are produced by `RecursiveChunker` on the cleaned text. Paragraph and sentence boundaries are preserved using newlines where block-level tags existed.
