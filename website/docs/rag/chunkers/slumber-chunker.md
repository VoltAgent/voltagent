---
title: Slumber Chunker
slug: /rag/chunkers/slumber
---

# Slumber Chunker

Combines small chunks into larger windows using min/max token targets, with optional overlaps.

## Usage

```typescript
import { SlumberChunker } from "@voltagent/rag";

const text = [
  "Short sentence.",
  "Another short one.",
  "A longer sentence that increases the token count.",
].join(" ");

const chunks = new SlumberChunker().chunk(text, {
  maxTokens: 120,
  minTokens: 40,
  overlapTokens: 3,
});

// Output (first two merged, third separate with overlap):
// [
//   { content: "Short sentence.\nAnother short one.", metadata: { sourceType: "slumber", smoothed: true } },
//   { content: "A longer sentence", metadata: { sourceType: "slumber-token" } }, // overlap from next chunk
//   { content: "A longer sentence that increases the token count.", metadata: { sourceType: "slumber", smoothed: false } },
// ]
```

## Options

- `maxTokens` (number): hard ceiling for a smoothed chunk, default `300`
- `minTokens` (number): minimum target before flushing, default `maxTokens / 2`
- `overlapTokens` (number): token overlap between consecutive smoothed chunks, default `0`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"slumber"`

`tokenizer` can be supplied on the constructor or per-call when invoking `chunk`.

## Output

- `metadata.sourceType: "slumber"` or `"slumber-token"` when token chunking was required
- `metadata.smoothed`: `true` when merged from multiple seed chunks
