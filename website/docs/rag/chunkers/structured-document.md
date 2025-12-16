---
title: StructuredDocument
slug: /rag/chunkers/structured-document
---

# StructuredDocument

`StructuredDocument` wraps raw text inputs, runs optional extractors, and then delegates to a chunker strategy. Each node keeps a `docId` and links to generated chunks.

## Workflow

1. Create a document node (or multiple nodes).
2. Run extractors (title, summary, keywords, questions).
3. Chunk the document using a strategy.
4. Read the link graph for document → chunk relationships.

## Usage

```typescript
import { StructuredDocument } from "@voltagent/rag";

const doc = StructuredDocument.fromText(`# Heading
Body paragraph with details.`);

doc.extract({ title: true, summary: true, keywords: true, questions: true });

const { chunks } = doc.chunk({ strategy: "markdown", maxTokens: 200 });

// Example chunk output:
// [
//   {
//     content: "Body paragraph with details.",
//     metadata: { sourceType: "markdown", blockType: "paragraph", headingPath: ["Heading"], docId: "<doc-id>" },
//   },
// ]

const nodes = doc.getNodes();
const links = doc.getLinkGraph();

// links example:
// { "<doc-id>": ["<chunk-id>"] }
```

## Strategies

- `"markdown"`: uses `MarkdownChunker`
- `"html"`: uses `HtmlChunker`
- `"json"`: uses `JsonChunker`
- `"latex"`: uses `LatexChunker`
- `"recursive"`: uses `RecursiveChunker`
- `"sentence"`: uses `SentenceChunker`
- `"token"`: uses `TokenChunker`
- `"table"`: uses `TableChunker`
- `"code"`: uses `CodeChunker`
- `"auto"`: heuristic: JSON parseable → `json`, HTML tags → `html`, LaTeX commands → `latex`, fenced code → `code`, table-like pipes → `table`, else `recursive`

`chunk()` forwards `maxTokens` to the underlying chunker. Chunker-specific options (tokenizer, parser, labels) use chunker defaults; configure those chunkers directly if you need custom tokenization or parsing.

## Extractors

Enable any of the following booleans:

- `title`
- `summary`
- `keywords`
- `questions`

Each extractor appends metadata to the document node; chunk metadata always includes `docId` so downstream consumers can relate chunks back to their source nodes.
