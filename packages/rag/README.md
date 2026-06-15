<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="VoltAgent RAG Package Banner" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/rag.svg)](https://www.npmjs.com/package/@voltagent/rag)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

## `@voltagent/rag`

Chunking and RAG (Retrieval-Augmented Generation) utilities for VoltAgent. This package provides a collection of text chunkers and utility functions for splitting documents into semantically meaningful pieces before embedding and retrieval.

## Installation

```bash
npm install @voltagent/rag
# or
yarn add @voltagent/rag
# or
pnpm add @voltagent/rag
```

## Chunkers

Each chunker implements the `Chunker` interface and returns an array of `Chunk` objects containing `id`, `content`, `start`, `end`, and optional `metadata` and `tokens` fields.

### TokenChunker

Splits text into fixed-size token windows with optional overlap. Best for uniform context windows.

```typescript
import { TokenChunker } from "@voltagent/rag";

const chunker = new TokenChunker();
const chunks = chunker.chunk("Your long document text here...", {
  maxTokens: 200,  // tokens per chunk
  overlap: 20,     // token overlap between chunks
});
```

### SentenceChunker

Groups sentences into chunks that stay within a token budget. Preserves sentence boundaries for more natural splits.

```typescript
import { SentenceChunker } from "@voltagent/rag";

const chunker = new SentenceChunker();
const chunks = chunker.chunk("Your text with multiple sentences.", {
  maxTokens: 200,
  overlapSentences: 1, // sentences to repeat at chunk boundaries
});
```

### RecursiveChunker

Splits text hierarchically: paragraphs → sentences → tokens. Tries to keep semantically related content together.

```typescript
import { RecursiveChunker } from "@voltagent/rag";

const chunker = new RecursiveChunker();
const chunks = chunker.chunk(text, {
  maxTokens: 300,
  overlapTokens: 30,
});
```

### MarkdownChunker

Splits Markdown documents respecting heading structure, code blocks, and list items.

```typescript
import { MarkdownChunker } from "@voltagent/rag";

const chunker = new MarkdownChunker();
const chunks = chunker.chunk(markdownString, {
  maxTokens: 400,
});
```

### CodeChunker

Splits source code files at function and class boundaries using language-aware parsing.

```typescript
import { CodeChunker } from "@voltagent/rag";

const chunker = new CodeChunker();
const chunks = chunker.chunk(sourceCode, {
  maxTokens: 500,
});
```

### HTMLChunker

Splits HTML documents preserving tag boundaries and structure.

```typescript
import { HTMLChunker } from "@voltagent/rag";

const chunker = new HTMLChunker();
const chunks = chunker.chunk(htmlString, { maxTokens: 300 });
```

### JSONChunker

Splits JSON documents by top-level keys or array elements.

```typescript
import { JSONChunker } from "@voltagent/rag";

const chunker = new JSONChunker();
const chunks = chunker.chunk(jsonString, { maxTokens: 200 });
```

### LaTeXChunker

Splits LaTeX documents at section and environment boundaries.

```typescript
import { LaTeXChunker } from "@voltagent/rag";

const chunker = new LaTeXChunker();
const chunks = chunker.chunk(latexSource, { maxTokens: 400 });
```

### TableChunker

Splits tabular data (CSV-style) into row-based chunks.

```typescript
import { TableChunker } from "@voltagent/rag";

const chunker = new TableChunker();
const chunks = chunker.chunk(csvText, { maxTokens: 200 });
```

### SemanticChunker

Groups sentences by semantic similarity using embeddings. Requires an embedding function.

```typescript
import { SemanticChunker } from "@voltagent/rag";

const chunker = new SemanticChunker(async (texts) => {
  // return embeddings for each text
  return texts.map((t) => getEmbedding(t));
});
const chunks = await chunker.chunk(text, { maxTokens: 300 });
```

### SemanticMarkdownChunker

Combines Markdown structure awareness with semantic similarity grouping.

```typescript
import { SemanticMarkdownChunker } from "@voltagent/rag";

const chunker = new SemanticMarkdownChunker(async (texts) => {
  return texts.map((t) => getEmbedding(t));
});
const chunks = await chunker.chunk(markdownString, { maxTokens: 400 });
```

### LateChunker

Uses late-interaction chunking: splits into small units first, then enriches each chunk's embedding with its surrounding context.

```typescript
import { LateChunker } from "@voltagent/rag";

const chunker = new LateChunker(async (texts) => {
  return texts.map((t) => getEmbedding(t));
});
const chunks = await chunker.chunk(text);
```

### NeuralChunker

Topic-boundary chunking based on embedding cosine similarity between adjacent windows.

```typescript
import { NeuralChunker } from "@voltagent/rag";

const chunker = new NeuralChunker(async (texts) => {
  return texts.map((t) => getEmbedding(t));
});
const chunks = await chunker.chunk(text, { threshold: 0.5 });
```

### SlumberChunker

Sliding-window chunker that groups sentences when similarity drops below a threshold.

```typescript
import { SlumberChunker } from "@voltagent/rag";

const chunker = new SlumberChunker(async (texts) => {
  return texts.map((t) => getEmbedding(t));
});
const chunks = await chunker.chunk(text);
```

## Utility Functions

### Tokenizer

```typescript
import { defaultTokenizer, countTokens } from "@voltagent/rag";

const tokens = defaultTokenizer.tokenize("Hello world");
const count = defaultTokenizer.countTokens("Hello world"); // 2
```

### Similarity

```typescript
import { cosineSimilarity } from "@voltagent/rag";

const similarity = cosineSimilarity([1, 0, 0], [0, 1, 0]); // 0
const same = cosineSimilarity([1, 2, 3], [1, 2, 3]);         // 1
```

### Text Utilities

```typescript
import { splitIntoSentences, splitIntoParagraphs, normalizeText } from "@voltagent/rag";
```

## Chunk Type

All chunkers return `Chunk[]`:

```typescript
type Chunk = {
  id: string;
  content: string;
  start: number;        // byte/char offset in source
  end: number;
  metadata?: Record<string, unknown>;
  tokens?: number;
  label?: string;
  score?: number;       // populated by semantic chunkers
};
```

## Custom Tokenizer

Pass a custom tokenizer to any chunker via constructor or options:

```typescript
import type { Tokenizer } from "@voltagent/rag";

const myTokenizer: Tokenizer = {
  tokenize: (text) => text.split(/\s+/).map((v, i) => ({ value: v, start: i, end: i + v.length })),
  countTokens: (text) => text.split(/\s+/).length,
};

const chunker = new TokenChunker(myTokenizer);
```

## Documentation

- [RAG Overview](https://voltagent.dev/docs/rag/overview/)
- [VoltAgent Knowledge Base](https://voltagent.dev/docs/rag/voltagent/)
- [Full Documentation](https://voltagent.dev/docs/)

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.
