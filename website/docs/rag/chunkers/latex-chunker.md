---
title: LaTeX Chunker
slug: /rag/chunkers/latex
---

# LaTeX Chunker

Splits content on section/subsection commands and chunks section bodies with `RecursiveChunker`.

## Usage

```typescript
import { LatexChunker } from "@voltagent/rag";

const tex = `
\\section{Intro}
Intro text with context.

\\subsection{Details}
More text inside the subsection.
`;

const chunks = new LatexChunker().chunk(tex, { maxTokens: 120 });

// Output:
// [
//   { content: "Intro text with context.", metadata: { sourceType: "latex", heading: "Intro", sectionType: "section" } },
//   { content: "More text inside the subsection.", metadata: { sourceType: "latex", heading: "Details", sectionType: "subsection" } },
// ]
```

## Options

- `maxTokens` (number): token budget per section chunk, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"latex"`

## Output

- `metadata.heading`
- `metadata.sectionType`: `section`, `subsection`, `subsubsection`, or `none`
- `metadata.sourceType: "latex"`
