---
title: Semantic Chunker
slug: /rag/chunkers/semantic
---

# Semantic Chunker

Merges adjacent chunks when embedding similarity exceeds a threshold.

## Usage

```typescript
import { SemanticChunker } from "@voltagent/rag";

const embedder = {
  embed: async (text: string) => text.split(" ").map((_, i) => i), // placeholder
};

const text = [
  "First sentence about cats.",
  "Second sentence about kittens.",
  "Unrelated line about databases.",
].join(" ");

const chunks = await new SemanticChunker().chunk(text, {
  embedder,
  similarityThreshold: 0.8,
  maxTokens: 120,
});

// Output (first two sentences merged):
// [
//   { content: "First sentence about cats. Second sentence about kittens.", metadata: { sourceType: "semantic", chunkIndex: 0 } },
//   { content: "Unrelated line about databases.", metadata: { sourceType: "semantic", chunkIndex: 1 } },
// ]
```

## Options

- `embedder` (required): `{ embed: (text) => number[] | Promise<number[]> }`
- `maxTokens` (number): seed and merged chunk budget, default `300`
- `similarityThreshold` (number): merge threshold, default `0.85`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"semantic"`

`tokenizer` may be provided per-call to override the constructor default.

## Output

- `metadata.sourceType: "semantic"`
- `metadata.chunkIndex`: merged order
- Merged content preserves the original sentence order with newlines inserted between merged segments.
