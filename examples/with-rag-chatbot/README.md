# RAG Chatbot Example

This VoltAgent example answers questions using local Markdown documents. Its retriever searches document sections on every turn and passes the best matches to the agent with their source file and heading.

## Run

Create the example project:

```bash
npm create voltagent-app@latest -- --example with-rag-chatbot
```

In the generated project, set `OPENAI_API_KEY` in `.env`, then run:

```bash
npm run dev
```

Ask a question such as **“How do workflows suspend for human approval?”**. The answer should cite `documents/overview.md > Workflows`. Questions with no matching document content should be answered as unsupported by the documents.

## Add your documents

Add `.md` files to `documents/`. The retriever reads them when a question arrives, splits them by Markdown heading, and returns up to three sections ranked by keyword overlap. It stores matched `{ source, section }` entries in the operation context under `references` and includes the same source labels in the model's context.

This is a local keyword search example. It does not generate embeddings or use a vector database; for semantic search, see the [VoltAgent RAG integrations](https://voltagent.dev/docs/rag/overview/).
