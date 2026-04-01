---
id: memory
title: Memory
slug: memory
description: Add conversation memory and working memory to your agents.
---

# Memory

Memory enables agents to remember past conversations and maintain context across sessions.

## Basic Memory Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
  }),
});

const agent = new Agent({
  name: "Memory Agent",
  instructions: "A helpful assistant that remembers conversations",
  model: openai("gpt-4o-mini"),
  memory,
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Working Memory (Structured Context)

Working memory lets agents maintain structured information across conversations.

### JSON Schema Format

```typescript
import { z } from "zod";

const workingMemorySchema = z.object({
  userProfile: z.object({
    name: z.string().optional(),
    preferences: z.array(z.string()).optional(),
  }),
  context: z.object({
    currentGoal: z.string().optional(),
    importantNotes: z.array(z.string()).optional(),
  }),
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  workingMemory: {
    enabled: true,
    scope: "user", // or "conversation"
    schema: workingMemorySchema,
  },
});
```

### Markdown Template Format

```typescript
const template = `
## User Profile
- Name: {name}
- Preferences: {preferences}

## Context
{context}
`;

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  workingMemory: {
    enabled: true,
    scope: "conversation",
    template,
  },
});
```

## With Vector Search

```typescript
import { InMemoryVectorAdapter } from "@voltagent/core";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: "openai/text-embedding-3-small",
  vector: new InMemoryVectorAdapter(),
});
```

## Full Example

See the complete examples:

- [with-working-memory on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-working-memory)
- [with-memory-rest-api on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-memory-rest-api)
