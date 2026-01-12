# VoltAgent with LanceDB Example

This example demonstrates how to use [LanceDB](https://lancedb.github.io/lancedb/) as a vector database/retriever within a VoltAgent application.

## Features

- **Local & Serverless**: Uses [LanceDB](https://lancedb.github.io/lancedb/) which runs embedded locally—no Docker or API keys required (unless using LanceDB Cloud).
- **Multimodal Ready**: LanceDB is optimized for multimodal data (text, images, video), making this a future-proof foundation.
- **Automatic Initialization**: Automatically creates the knowledge base table and populates it with sample data on first run.
- **Semantic Search**: Uses OpenAI embeddings to retrieve relevant documents based on user queries.
- **Two Agent Patterns**:
  1.  **Assistant with Retriever**: Automatically uses retrieved context for every message.
  2.  **Assistant with Tools**: Autonomously decides when to use the retrieval tool.

## Prerequisites

- Node.js 20+
- OpenAI API Key (for embeddings and LLM)

## Getting Started

1.  **Install dependencies**:

    ```bash
    npm install
    ```

2.  **Configure Environment**:
    Copy `.env.example` to `.env` and add your OpenAI API Key:

    ```bash
    cp .env.example .env
    ```

    Edit `.env`:

    ```env
    OPENAI_API_KEY=sk-...
    ```

3.  **Run the Agent**:
    ```bash
    npm run dev
    ```

## How It Works

- The database is stored locally in `.voltagent/lancedb`.
- On startup, `src/retriever/index.ts` checks if the table exists.
- If not, it creates it and indexes the sample documents defined in the code.
- Agents can then query this local database with low latency.
