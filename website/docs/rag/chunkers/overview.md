---
title: Overview
slug: /rag/chunkers/overview
---

# Chunkers

Chunkers split raw content into smaller units with metadata so you can index and retrieve context. VoltAgent ships multiple chunkers for different formats and a `StructuredDocument` helper to orchestrate extractors and chunking strategies. An `auto` heuristic uses format detection (JSON/HTML/LaTeX/code/table/markdown signals) to pick a chunker when you do not know the format ahead of time.

- [`StructuredDocument`](./structured-document.md): wraps raw text and applies extractors before chunking.
- [Token](./token-chunker.md), [Sentence](./sentence-chunker.md), [Recursive](./recursive-chunker.md): general-purpose text chunking.
- [Table](./table-chunker.md), [Code](./code-chunker.md), [Markdown](./markdown-chunker.md), [Semantic Markdown](./semantic-markdown-chunker.md), [HTML](./html-chunker.md), [JSON](./json-chunker.md), [LaTeX](./latex-chunker.md): format-aware chunkers.
- [Semantic](./semantic-chunker.md), [Late](./late-chunker.md), [Neural](./neural-chunker.md), [Slumber](./slumber-chunker.md): semantic or post-processing chunkers.
- [Parser Registry](./code-chunker.md#parser-registry): register parsers for language-aware code chunking.

Each chunker returns an array of chunks with `content`, positional metadata, and optional labels. Pass configuration through constructor options or per-call options.

## Quick Example

```typescript
import { RecursiveChunker } from "@voltagent/rag";

const text = "First paragraph.\n\nSecond paragraph that is longer.";
const chunks = new RecursiveChunker().chunk(text, { maxTokens: 120 });

// Output:
// [
//   { content: "First paragraph.", metadata: { sourceType: "paragraph", paragraphIndex: 0 } },
//   { content: "Second paragraph that is longer.", metadata: { sourceType: "paragraph", paragraphIndex: 1 } },
// ]
```

## Common Configuration

- **Tokenizer**: Any object with `{ tokenize: (text: string) => { value: string; start: number; end: number }[], countTokens: (text: string) => number }`. Default is tiktoken (`cl100k_base`). Override on the constructor or per-call:

  ```typescript
  import { TokenChunker, createTikTokenizer } from "@voltagent/rag";

  const tokenizer = createTikTokenizer({ model: "gpt-4o-mini" });
  const chunker = new TokenChunker(tokenizer);
  const chunks = chunker.chunk(text, { maxTokens: 256, overlap: 16, tokenizer });
  ```

- **Per-call overrides**: Options passed to `chunk(text, options)` (e.g., `maxTokens`, `overlap`, `label`, parser) override constructor defaults.
- **Positions**: Most chunkers include `metadata.position` with line/column start/end. Code fences additionally expose `fencePosition`.

## What Is Not Included

- Chunkers do not handle embedding or vector index creation; pipe chunk outputs into your own embedding/vector store flow.
- Inline AST fidelity is limited: markdown/html inline elements and attributes are not preserved beyond text content and basic paths.
- Code chunk `start/end` offsets refer to the fenced body; use `position`/`fencePosition` for absolute line/column context.
