<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent with Chroma Vector Database Integration</strong><br>
This example demonstrates how to integrate VoltAgent with Chroma vector database for advanced knowledge management and retrieval.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

## VoltAgent with Chroma

This example demonstrates VoltAgent integration with Chroma vector database for RAG (Retrieval-Augmented Generation) capabilities. It includes two different agent configurations showcasing automatic and tool-based retrieval patterns.

## Quick Start

**Option 1: Local Development**

Start Chroma server:

```bash
npm run chroma run
```

Run the example:

```bash
npm create voltagent-app@latest -- --example with-chroma
cd with-chroma
cp .env.example .env  # Add your OPENAI_API_KEY
npm run dev
```

**Option 2: [Chroma Cloud](https://www.trychroma.com/)**

No server setup needed! Just configure your environment:

```bash
npm create voltagent-app@latest -- --example with-chroma
cd with-chroma
cp .env.example .env  # Add OPENAI_API_KEY, CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE
npm run dev
```

## What's Included

- **Two Agent Types**: Automatic retrieval vs. tool-based retrieval
- **Pre-loaded Knowledge Base**: Sample documents ready to query
- **Vector Search**: Semantic search capabilities with Chroma
- **Source Tracking**: References to used documents in responses

## Full Documentation

For complete setup instructions, usage examples, customization options, and troubleshooting, see the [VoltAgent Chroma Integration Guide](https://voltagent.dev/docs/rag/chroma/).

## Learn More

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Chroma Documentation](https://docs.trychroma.com/)
