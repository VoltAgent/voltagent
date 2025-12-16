---
title: Markdown Chunker
slug: /rag/chunkers/markdown
---

# Markdown Chunker

Parses headings, lists, blockquotes, paragraphs, and code fences. Text blocks use `RecursiveChunker`; code blocks use `CodeChunker`.

## Usage

````typescript
import { MarkdownChunker } from "@voltagent/rag";

const markdown = `
# Title

Intro paragraph with context.

- bullet one
- bullet two

> quoted line

```ts
function ping() { return "pong"; }
```
`;

const chunks = new MarkdownChunker().chunk(markdown, { maxTokens: 120 });

// Output:
// [
//   { content: "Intro paragraph with context.", metadata: { sourceType: "markdown", blockType: "paragraph", headingPath: ["Title"], blockIndex: 0 } },
//   { content: "- bullet one\n- bullet two", metadata: { sourceType: "markdown", blockType: "list", headingPath: ["Title"], blockIndex: 1 } },
//   { content: "quoted line", metadata: { sourceType: "markdown", blockType: "blockquote", headingPath: ["Title"], blockIndex: 2 } },
//   { content: "function ping() { return \"pong\"; }", metadata: { sourceType: "code", blockType: "code", headingPath: ["Title"], blockIndex: 3, language: "ts" } },
// ]
````

## Options

- `maxTokens` (number): token budget per block before falling back to `RecursiveChunker`, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids and metadata, default `"markdown"`

`tokenizer` can be set on the constructor or per-call to override it for a single chunking run.

## Output

- `metadata.headingPath`: array of headings leading to the block
- `metadata.blockType`: `paragraph`, `list`, `blockquote`, `code`
- `metadata.blockIndex`
- `metadata.language` for code blocks
- `metadata.sourceType`: `"markdown"` for prose blocks, `"code"` for fenced code blocks

When a code fence specifies a language and a parser is registered for that language, `CodeChunker` emits function/class-level chunks instead of the whole fence.

### Limitations

- Inline markdown elements (links, emphasis, inline code) are not preserved as structured metadata; only block-level paths and text are emitted.
