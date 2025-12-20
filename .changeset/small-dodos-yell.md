---
"@voltagent/core": minor
---

feat: add VoltAgentRagRetriever to @voltagent/core

Added `VoltAgentRagRetriever` - a built-in retriever that connects to VoltAgent Knowledge Bases for fully managed RAG. No infrastructure setup required - just upload documents to the Console and start searching.

## Features

- **Automatic context injection**: Searches before each response and injects relevant context
- **Tool-based retrieval**: Use as a tool that the agent calls when needed
- **Tag filtering**: Filter results by custom document tags
- **Source tracking**: Access retrieved chunk references via `rag.references` context

## Usage

```typescript
import { Agent, VoltAgentRagRetriever } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const retriever = new VoltAgentRagRetriever({
  knowledgeBaseName: "my-docs",
  topK: 8,
  includeSources: true,
});

// Option 1: Automatic context injection
const agent = new Agent({
  name: "RAG Assistant",
  model: openai("gpt-4o-mini"),
  retriever,
});

// Option 2: Tool-based retrieval
const agentWithTool = new Agent({
  name: "RAG Assistant",
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
});
```

## Configuration

| Option              | Default  | Description                  |
| ------------------- | -------- | ---------------------------- |
| `knowledgeBaseName` | required | Name of your knowledge base  |
| `topK`              | 8        | Number of chunks to retrieve |
| `tagFilters`        | null     | Filter by document tags      |
| `includeSources`    | true     | Include document metadata    |
| `includeSimilarity` | false    | Include similarity scores    |

## Environment Variables

```bash
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
# Optional
VOLTAGENT_API_BASE_URL=https://api.voltagent.dev
```
