# VoltAgent Qdrant Example

This example demonstrates how to use VoltAgent with [Qdrant](https://qdrant.tech/) as the vector database for retrieval-augmented generation (RAG).

## Features

- Two agents:
  - **Assistant with Retriever**: Uses semantic search on every interaction.
  - **Assistant with Tools**: LLM decides when to search autonomously.
- Tracks sources and references for each answer.

## Usage

1. Install dependencies:

   ```bash
   $ docker run -p 6333:6333 qdrant/qdrant
   $ pnpm install
   ```

2. Set up environment variables in `.env` (see `.env.example` for reference):

   - `QDRANT_URL`
   - `OPENAI_API_KEY` (required for embeddings)

3. Start the example:

   ```bash
   pnpm run dev
   ```

You can manage your vectors from the Qdrant [dashboard](http://localhost:6333/dashboard).

## Example Questions

Try asking questions like:

- What is VoltAgent?
- Tell me about vector databases
- How does Qdrant work?
- What is RAG?
- What is TypeScript?

## Notes

- The retriever will automatically populate the Qdrant collection with sample documents if empty.
- Both agents track which documents were used for answers. Check `userContext.get('references')` for source IDs and scores.
