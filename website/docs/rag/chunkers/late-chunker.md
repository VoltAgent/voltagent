---
title: Late Chunker
slug: /rag/chunkers/late
---

# Late Chunker

Merges base chunks into sliding windows for late fusion.

## Usage

```typescript
import { LateChunker, TokenChunker } from "@voltagent/rag";

const base = new TokenChunker(); // uses tiktoken by default
const seeds = base.chunk("a b c d e", { maxTokens: 2 });
// seeds =>
// [
//   { id: "token-0", content: "a b", metadata: { sourceType: "token" } },
//   { id: "token-1", content: "c d", metadata: { sourceType: "token" } },
//   { id: "token-2", content: "e", metadata: { sourceType: "token" } },
// ]

const late = new LateChunker(base);

const chunks = await late.chunk("a b c d e", { windowSize: 3, stride: 2 });

// Windows built from the seed chunks:
// [
//   { content: "a b\nc d\ne", metadata: { sourceType: "late-window", mergedFrom: ["token-0", "token-1", "token-2"] } },
//   { content: "e", metadata: { sourceType: "late-window", mergedFrom: ["token-2"] } },
// ]
```

## Options

- `baseChunker` (Chunker): defaults to `RecursiveChunker`
- `windowSize` (number): window length, default `2`
- `stride` (number): step size, default `1`
- `label` (string): prefix for chunk ids, default `"late"`

Pass tokenizer settings to the base chunker (constructor or per-call) if you need a different model; LateChunker forwards the base chunker output as-is.

## Output

- `metadata.mergedFrom`: IDs of chunks included in the window
- `metadata.sourceType: "late-window"`
