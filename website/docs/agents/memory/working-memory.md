---
title: Working Memory
slug: /agents/memory/working-memory
---

# Working Memory

Working memory stores compact context across turns. It can be conversation‑scoped or user‑scoped. It is configured on the `Memory` instance.

## Configuration

Use one of three modes:

- Template (Markdown): `template: string`
- JSON schema (Zod): `schema: z.object({ ... })`
- Free‑form: no template or schema

Scope defaults to `conversation`. Set `scope: 'user'` to store context at the user level.

```ts
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Template (Markdown), conversation scope
const memoryWithTemplate = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    template: `
# Profile
- Name:
- Role:

# Goals
-
`,
  },
});

// JSON schema, user scope
const workingSchema = z.object({
  userProfile: z
    .object({ name: z.string().optional(), timezone: z.string().optional() })
    .optional(),
  tasks: z.array(z.string()).optional(),
});

const memoryWithSchema = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: { enabled: true, scope: "user", schema: workingSchema },
});

const agent = new Agent({
  name: "assistant",
  model: openai("gpt-4o-mini"),
  memory: memoryWithTemplate,
});
```

## Built‑in Tools

When working memory is enabled, the agent exposes three tools:

- `get_working_memory()` → returns the current content string
- `update_working_memory(content)` → updates content; when a schema is configured, `content` is validated
- `clear_working_memory()` → clears content

## Prompt Integration

When you call the agent with `userId` and `conversationId`, the agent appends a working‑memory instruction block to the system prompt. The block includes:

- Usage guidelines
- The template or a note about the JSON schema
- The current working memory content (if any)

This logic is implemented in `Memory.getWorkingMemoryInstructions()` and used by the agent before generation.

## Programmatic API

Methods on `Memory`:

- `getWorkingMemory({ conversationId?, userId? }) → Promise<string | null>`
- `updateWorkingMemory({ conversationId?, userId?, content }) → Promise<void>`
- `clearWorkingMemory({ conversationId?, userId? }) → Promise<void>`
- `getWorkingMemoryFormat() → 'markdown' | 'json' | null`
- `getWorkingMemoryTemplate() → string | null`
- `getWorkingMemorySchema() → z.ZodObject | null`

## Storage Notes

The adapter decides where to store working memory. The official adapters use metadata fields:

- Conversation scope: `conversations.metadata.workingMemory`
- User scope: `${tablePrefix}_users.metadata.workingMemory`

See the provider pages for details.
