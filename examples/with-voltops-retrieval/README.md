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
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
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

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent: VoltOps Knowledge Base Retrieval (RAG)

This example shows how to use a **VoltOps Knowledge Base** as a retriever.

It uses:

- `VoltAgentRagRetriever` to call `POST /rag/project/search`
- `VoltAgentRagRetriever` auto-creates a `VoltOpsClient` when `VOLTAGENT_PUBLIC_KEY` / `VOLTAGENT_SECRET_KEY` are set (optionally `VOLTAGENT_API_BASE_URL`)
- `Agent.retriever` for automatic context injection
- `retriever.tool` for tool-based retrieval (optional)

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Fill:

- `OPENAI_API_KEY`
- `VOLTAGENT_PUBLIC_KEY` / `VOLTAGENT_SECRET_KEY`
- `src/retriever/index.ts` içinde `knowledgeBaseName` değerini kendi Knowledge Base adınla değiştir

3. Run:

```bash
pnpm dev
```

## Try Example

```bash
npm create voltagent-app@latest -- --example with-voltops-retrieval
```
