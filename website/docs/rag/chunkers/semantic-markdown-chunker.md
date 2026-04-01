---
title: Semantic Markdown Chunker
slug: /rag/chunkers/semantic-markdown
---

# Semantic Markdown Chunker

Runs `MarkdownChunker` and then merges adjacent chunks using `SemanticChunker`.

## Usage

```typescript
import { SemanticMarkdownChunker } from "@voltagent/rag";

const embedder = {
  embed: async (text: string) => text.split(" ").map((_, i) => i), // placeholder vector
};

const md = `
# Title

Intro line.

Another sentence that stays close in meaning.

## Details

Farther content that should be separate.
`;

const chunks = await new SemanticMarkdownChunker().chunk(md, {
  embedder,
  similarityThreshold: 0.8,
  maxTokens: 200,
});

// Output (merged by similarity):
// [
//   { content: "Intro line.\n\nAnother sentence that stays close in meaning.", metadata: { sourceType: "semantic-markdown", chunkIndex: 0 } },
//   { content: "Farther content that should be separate.", metadata: { sourceType: "semantic-markdown", chunkIndex: 1 } },
// ]
```

## Options

- `embedder` (required): `{ embed: (text) => number[] | Promise<number[]> }`
- `similarityThreshold` (number): merge threshold, default `0.85`
- `maxTokens` (number): token budget for seeds and merged chunks, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"semantic-markdown"`

`tokenizer` may be overridden per-call if you need a different model for token counting.

## Output

- `metadata.sourceType: "semantic-markdown"`
- `metadata.chunkIndex`: merged order
- Content is the merged markdown text, preserving newline separation between combined blocks.
