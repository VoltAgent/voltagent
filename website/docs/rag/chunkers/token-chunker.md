---
title: Token Chunker
slug: /rag/chunkers/token
---

# Token Chunker

Splits text by token count using the default tiktoken tokenizer.

## Quick Start

```typescript
import { TokenChunker } from "@voltagent/rag";

const chunker = new TokenChunker();
const chunks = chunker.chunk("one two three four five six", {
  maxTokens: 3,
  overlap: 1,
});

// chunks:
// [
//   { content: "one two three", metadata: { tokenStart: 0, tokenEnd: 2, sourceType: "token" } },
//   { content: "three four five", metadata: { tokenStart: 2, tokenEnd: 4, sourceType: "token" } },
//   { content: "five six", metadata: { tokenStart: 4, tokenEnd: 5, sourceType: "token" } },
// ]
```

## Options

- `maxTokens` (number): tokens per chunk, default `200`
- `overlap` (number): token overlap between chunks, default `0`
- `tokenizer`: optional custom tokenizer

`tokenizer` must implement `{ tokenize(text): Token[]; countTokens(text): number }`. Default is a tiktoken tokenizer (`cl100k_base`).

Pass `tokenizer` either to the constructor or per-call. If both are provided, the per-call option is used.

## Output

Each chunk includes:

- `metadata.tokenStart`, `metadata.tokenEnd`
- `metadata.sourceType: "token"`
- `tokens`: token count in the chunk

```typescript
import { TokenChunker } from "@voltagent/rag";

const chunker = new TokenChunker();
const chunks = chunker.chunk("one two three four five", { maxTokens: 3, overlap: 1 });

// With custom tokenizer
// const tokenizer = createTikTokenizer({ model: "gpt-4o-mini" });
// const chunker = new TokenChunker(tokenizer);
// const chunks = chunker.chunk(text, { tokenizer });
```

## When to Use

- Fixed-size token windows for embedding or vector indexing.
- Applying overlap to preserve context across chunks.
