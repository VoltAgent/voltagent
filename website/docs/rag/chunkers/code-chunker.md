---
title: Code Chunker
slug: /rag/chunkers/code
---

# Code Chunker

Splits fenced code blocks and surrounding prose. For code blocks, it uses a pluggable parser to chunk by functions/classes/methods; if the parser returns no blocks, it falls back to token chunking.

## Usage

````typescript
import { CodeChunker } from "@voltagent/rag";

const input = `
Intro sentence before the code.

```ts
function add(a: number, b: number) {
  return a + b;
}
class Calc {
  sum(x: number, y: number) {
    return add(x, y);
  }
}
```

Trailing note.
`;

const chunks = new CodeChunker().chunk(input, { maxTokens: 120 });

// Output (shape):
// [
//   { content: "Intro sentence before the code.", metadata: { sourceType: "text" } },
//   { content: "...code...", metadata: { sourceType: "code", language: "ts", position: {...}, fencePosition: {...} } },
//   { content: "Trailing note.", metadata: { sourceType: "text" } },
// ]
````

If the parser does not return any blocks for a fence, the code block is split by tokens instead.

## Options

- `maxTokens` (number): limit per chunk, default `400`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids and metadata, default `"code"`
- `parser`: `(source) => CodeBlock[]`; overrides the registry lookup for the block language

`tokenizer` must implement `{ tokenize(text): Token[]; countTokens(text): number }`. Default is tiktoken (`cl100k_base`). Pass it to the constructor or per-call.

Pass `parser` when you want to override the registry lookup, or register a parser for the language identifier used in fenced code blocks. `tokenizer` can be set on the constructor or per-call.

## Output

- Code chunks: `metadata.sourceType: "code"`, optional `language`, `blockKind`, `blockName`
- Text chunks: `metadata.sourceType: "text"`
- When the parser returns hierarchy, `metadata.blockPath` includes enclosing names (e.g., `["ClassName", "methodName"]`), and `metadata.blockParent` carries the parent path.
- Positions: `metadata.position` holds `{ start: { line, column }, end: { line, column } }` for the chunk; `metadata.fencePosition` captures the fenced block span.
- When a parser returns parents, `metadata.blockParent` carries the parent path (e.g., `["ClassName"]` for a method).

````typescript
import { CodeChunker } from "@voltagent/rag";

const code = "```ts\nfunction foo() { return 1; }\n```";
const chunks = new CodeChunker().chunk(code, { maxTokens: 200 });

// Passing parser directly
// const chunks = new CodeChunker().chunk(code, { parser: jsParser, maxTokens: 200 });

// Override tokenizer per call:
// const tokenizer = createTikTokenizer({ model: "gpt-4o-mini" });
// const chunks = new CodeChunker(tokenizer).chunk(code, { tokenizer, parser: jsParser });
````

## Parser Registry

CodeChunker uses a pluggable parser registry. Register any `(source) => CodeBlock[]` function per language. When a fenced code block declares a language, CodeChunker looks up the parser; you can also pass a `parser` directly in options, which takes precedence. If no parser is available, the code block falls back to token-based splitting.

- No default parsers are registered; add the languages you need.
- Built-in aliases: `js` → `javascript`, `ts` → `typescript`, `py` → `python`, `c++` → `cpp`.

### Register Parsers

```typescript
import { registerCodeParser } from "@voltagent/rag";

registerCodeParser("python", (source) => {
  // Return CodeBlock[] from your preferred parser (AST, regex, etc).
  return [];
});
```

@voltagent/rag does not bundle any language parsers; register the languages you need.

### Limitations

- `start/end` offsets refer to the fenced body, not including the ```fence. Use`position`/`fencePosition` for absolute line/column.
- No default language parsers are bundled; you must register your own parsers and aliases.

### Custom Parser Signature

`(source: string) => CodeBlock[]`, where:

```typescript
type CodeBlock = {
  kind: "function" | "class" | "method";
  name?: string;
  start: number;
  end: number;
};
```

Example manual parser:

```typescript
import { registerCodeParser } from "@voltagent/rag";

registerCodeParser("lua", (source) => {
  return source
    .split("function")
    .slice(1)
    .map((body, i) => {
      const text = "function" + body;
      const start = source.indexOf(text);
      return {
        kind: "function",
        name: `fn_${i}`,
        start,
        end: start + text.length,
      };
    });
});
```
