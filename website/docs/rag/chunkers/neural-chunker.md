---
title: Neural Chunker
slug: /rag/chunkers/neural
---

# Neural Chunker

Segments text using a boundary detector function, then applies token chunking to enforce budgets.

## Usage

```typescript
import { NeuralChunker } from "@voltagent/rag";

// Detector returns character offsets where chunks should split
const detector = (text: string) => [25, 60];

const chunks = await new NeuralChunker().chunk(
  "First segment that is long enough. Second segment. Third segment.",
  { detector, maxTokens: 120 }
);

// Output:
// [
//   { content: "First segment that is long enough.", metadata: { sourceType: "neural" } },
//   { content: " Second segment.", metadata: { sourceType: "neural" } },
//   { content: " Third segment.", metadata: { sourceType: "neural" } },
// ]
```

If any detector-produced chunk exceeds the token budget, it is further split with token chunking and labeled `sourceType: "neural-token"`.

## Options

- `detector` (required): `(text) => number[] | Promise<number[]>` returning character offsets
- `maxTokens` (number): token budget for each detector or fallback chunk, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"neural"`

`tokenizer` may be provided on the constructor or per-call to adjust token counts.

## Output

- `metadata.sourceType: "neural"` for detector chunks
- `metadata.sourceType: "neural-token"` for token fallback chunks
