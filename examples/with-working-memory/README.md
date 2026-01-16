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

## VoltAgent: Working Memory Example

This example shows how to enable and use Working Memory in a VoltAgent. Working Memory lets agents persist important facts either per-conversation or per-user, and includes built‑in tools so models can read/update this context during a chat.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-working-memory
```

## Highlights

- Structured context with Zod schema (JSON), or Markdown template
- Auto‑injected system instructions guiding the model to use context
- Built‑in tools: `get_working_memory`, `update_working_memory`, `clear_working_memory`
- LibSQL storage with optional semantic search via embeddings

## Snippet

```ts
import { openai } from "@ai-sdk/openai";
import { Agent, AiSdkEmbeddingAdapter, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const workingMemorySchema = z.object({
  userProfile: z.object({ preferredTone: z.enum(["casual", "formal", "technical"]).optional() }),
  preferences: z.object({ likes: z.array(z.string()).optional() }),
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter(),
  workingMemory: { enabled: true, scope: "conversation", schema: workingMemorySchema },
});

const agent = new Agent({ name: "Working Memory Agent", model: "openai/gpt-4o-mini", memory });

new VoltAgent({ agents: { agent }, server: honoServer({ port: 3141 }) });
```

## Run Locally

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install deps and start:

```bash
pnpm i
pnpm dev
```

Then POST messages to `http://localhost:3141/api/agent/generateText` with `userId` and `conversationId` to see the model use the working‑memory tools.
