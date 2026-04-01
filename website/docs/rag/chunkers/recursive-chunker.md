---
title: Recursive Chunker
slug: /rag/chunkers/recursive
---

# Recursive Chunker

Splits text by paragraphs, falls back to sentence grouping, and finally token chunking when needed.

## Quick Start

```typescript
import { RecursiveChunker } from "@voltagent/rag";

const text = "Para one.\n\nPara two is longer and may be split.";
const chunks = new RecursiveChunker().chunk(text, { maxTokens: 15, overlapTokens: 5 });

// Example output (content shortened):
// [
//   { content: "Para one.", metadata: { sourceType: "paragraph", paragraphIndex: 0 } },
//   { content: "Para two is longer", metadata: { sourceType: "sentence", paragraphIndex: 1 } },
//   { content: "longer ...", metadata: { sourceType: "sentence-token", paragraphIndex: 1 } },
// ]
```

## Options

- `maxTokens` (number): limit per chunk, default `300`
- `overlapTokens` (number): token overlap between chunks, default `0`
- `tokenizer`

`tokenizer` must implement `{ tokenize(text): Token[]; countTokens(text): number }`. Default is tiktoken (`cl100k_base`).

Provide `tokenizer` per-call to override the constructor setting.

## Output

- `metadata.sourceType`: `paragraph`, `sentence`, or `sentence-token`
- `metadata.paragraphIndex`
- Overlap chunks are labeled with `*-overlap`.

```typescript
import { RecursiveChunker } from "@voltagent/rag";

const chunker = new RecursiveChunker();
const chunks = chunker.chunk("Paragraph one.\n\nParagraph two...", {
  maxTokens: 150,
  overlapTokens: 10,
});
```

## When to Use

- Mixed-length content with natural paragraph boundaries.
- Need graceful fallback to smaller units when paragraphs exceed token limits.
