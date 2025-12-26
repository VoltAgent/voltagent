---
title: Table Chunker
slug: /rag/chunkers/table
---

# Table Chunker

Detects markdown/CSV-style tables and separates them from prose.

## Usage

```typescript
import { TableChunker } from "@voltagent/rag";

const text = `
Summary line above.
| col1 | col2 |
| ---- | ---- |
| a    | b    |
| c    | d    |
Closing sentence after table.
`;

const chunks = new TableChunker().chunk(text, { maxTokens: 120 });

// Output:
// [
//   { content: "Summary line above.", metadata: { sourceType: "text" } },
//   { content: "| col1 | col2 |\n| ---- | ---- |\n| a    | b    |\n| c    | d    |", metadata: { sourceType: "table", type: "table" } },
//   { content: "Closing sentence after table.", metadata: { sourceType: "text" } },
// ]
```

If a table chunk exceeds the token budget, it is split with token chunking.

## Options

- `maxTokens` (number): limit per chunk, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"table"`

## Output

- Table chunks: `metadata.type: "table"`, `metadata.sourceType: "table"`
- Prose chunks: `metadata.sourceType: "text"`
