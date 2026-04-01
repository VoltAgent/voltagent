---
title: JSON Chunker
slug: /rag/chunkers/json
---

# JSON Chunker

Walks JSON into `path: value` lines and chunks the combined text. Invalid JSON falls back to token chunking.

## Usage

```typescript
import { JsonChunker } from "@voltagent/rag";

const json = JSON.stringify(
  { user: { name: "alice", age: 30 }, tags: ["a", "b"], active: true },
  null,
  2
);

const chunks = new JsonChunker().chunk(json, { maxTokens: 120 });

// Output:
// [
//   {
//     content: "user.name: alice\nuser.age: 30\ntags.0: a\ntags.1: b\nactive: true",
//     metadata: {
//       sourceType: "json",
//       fields: 5,
//       samplePaths: [
//         { path: "user.name", line: 1 },
//         { path: "user.age", line: 2 },
//         { path: "tags.0", line: 3 },
//       ],
//     },
//   },
// ]
```

If the JSON cannot be parsed, the raw string is split with token chunking.

## Options

- `maxTokens` (number): token budget per chunk, default `300`
- `tokenizer`: `{ tokenize(text), countTokens(text) }`, default tiktoken (`cl100k_base`)
- `label` (string): prefix for chunk ids, default `"json"`

`tokenizer` can be set on the constructor or per-call.

## Output

- `metadata.fields`: count of walked fields
- `metadata.samplePaths`: first few paths with their line numbers in the flattened view
- `metadata.sourceType: "json"`

### Limitations

- Paths are flattened strings; schema-aware typing or attribute metadata is not added.
- Only path/value/line are emitted; complex structures (e.g., arrays of objects) are still flattened into `path: value` lines.
