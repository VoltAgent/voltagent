---
title: Sentence Chunker
slug: /rag/chunkers/sentence
---

# Sentence Chunker

Groups sentences until a token budget is reached.

## Quick Start

```typescript
import { SentenceChunker } from "@voltagent/rag";

const chunker = new SentenceChunker();
const chunks = chunker.chunk("A short sentence. Another one. This third sentence is longer.", {
  maxTokens: 10,
  overlapSentences: 1,
});

// chunks:
// [
//   { content: "A short sentence. Another one.", metadata: { sourceType: "sentence", sentenceCount: 2 } },
//   { content: "Another one. This third sentence is longer.", metadata: { sourceType: "sentence", sentenceCount: 2 } },
// ]
```

## Options

- `maxTokens` (number): tokens per chunk, default `200`
- `overlapSentences` (number): number of sentences to overlap, default `0`
- `tokenizer`: optional tokenizer

`tokenizer` must implement `{ tokenize(text): Token[]; countTokens(text): number }`. Default is tiktoken (`cl100k_base`).

## Output

- `metadata.sourceType: "sentence"`
- `metadata.sentenceCount`
- `tokens`: sum of tokens in grouped sentences

```typescript
import { SentenceChunker } from "@voltagent/rag";

const chunker = new SentenceChunker();
const chunks = chunker.chunk("First sentence. Second sentence.", {
  maxTokens: 20,
  overlapSentences: 1,
});
```
