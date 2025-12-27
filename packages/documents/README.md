# @voltagent/documents

Utilities for document processing, chunking, and embedding generation.

## Installation

```bash
pnpm add @voltagent/documents
```

## Usage

### Text Splitting

Use `RecursiveCharacterTextSplitter` to split text into chunks while preserving context.

```typescript
import { RecursiveCharacterTextSplitter } from "@voltagent/documents";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const text = "Your long text here...";
const chunks = await splitter.splitText(text);
```

### Embeddings

Use `OpenAIEmbeddingModel` to generate embeddings for your text.

```typescript
import { OpenAIEmbeddingModel } from "@voltagent/documents";

const embedder = new OpenAIEmbeddingModel({
  apiKey: process.env.OPENAI_API_KEY, // Optional if set in env
  model: "text-embedding-ada-002", // Default
});

const embedding = await embedder.embedQuery("Hello world");
```

### Document Processor

The `DocumentProcessor` combines splitting and embedding.

```typescript
import { DocumentProcessor } from "@voltagent/documents";

const processor = new DocumentProcessor();
// Or with custom splitter/embedder:
// const processor = new DocumentProcessor(uniqueSplitter, uniqueEmbedder);

const documents = await processor.process("Long text content...", {
  source: "example.txt",
  author: "Me",
});

/*
Returns:
[
  {
    text: "chunk 1...",
    embedding: [0.123, ...],
    metadata: { source: "example.txt", author: "Me", chunkIndex: 0, ... }
  },
  ...
]
*/
```
