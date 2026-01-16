---
title: Working Memory
slug: /agents/memory/working-memory
---

# Working Memory

Working memory stores compact context across conversation turns. Unlike full message history, it tracks key facts, preferences, or goals that persist throughout interactions.

## Configuration

Three formats supported:

1. **Markdown template** - Structured text with sections
2. **JSON schema** - Validated structured data using Zod
3. **Free-form** - Unstructured text

Scope options:

- **`conversation`** (default) - Context per conversation thread
- **`user`** - Context shared across all user conversations

### Markdown Template

```ts
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    scope: "conversation", // default
    template: `
# User Profile
- Name:
- Role:
- Timezone:

# Current Goals
-

# Preferences
-
`,
  },
});

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory,
});
```

### JSON Schema

```ts
import { z } from "zod";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    scope: "user", // persist across conversations
    schema: z.object({
      profile: z
        .object({
          name: z.string().optional(),
          role: z.string().optional(),
          timezone: z.string().optional(),
        })
        .optional(),
      preferences: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional(),
    }),
  },
});
```

### Free-Form

```ts
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true, // no template or schema
  },
});
```

## Agent Integration

When working memory is enabled, the agent:

1. **Adds instructions to system prompt** - Includes current working memory content and usage guidelines
2. **Exposes tools automatically**:
   - `get_working_memory()` - Retrieve current content
   - `update_working_memory(content)` - Update content (validated against schema if configured)
   - `clear_working_memory()` - Clear content

The agent manages working memory proactively based on conversation flow.

## Update Modes

Two modes available:

### Append Mode (Default)

Safely merges new information with existing content:

```ts
// Existing working memory:
// { profile: { name: "Alice" }, goals: ["Learn TypeScript"] }

// Agent calls update_working_memory with:
// { goals: ["Build an API"] }

// Result (merged):
// { profile: { name: "Alice" }, goals: ["Learn TypeScript", "Build an API"] }
```

**For JSON schemas:**

- Objects: Deep merge
- Arrays: Deduplicated concatenation
- Primitives: Overwrite

**For Markdown:**

- New content appended with separator

### Replace Mode

Overwrites all existing content:

```ts
await memory.updateWorkingMemory({
  conversationId: "thread-123",
  userId: "user-456",
  content: { profile: { name: "Bob" } }, // existing data lost
  options: { mode: "replace" },
});
```

Use replace mode only when intentionally resetting all context.

## Programmatic API

Direct memory access without agent tools:

```ts
// Get current working memory
const content = await memory.getWorkingMemory({
  conversationId: "thread-123",
  userId: "user-456",
});
console.log(content); // string (JSON or Markdown)

// Update (default: append mode)
await memory.updateWorkingMemory({
  conversationId: "thread-123",
  userId: "user-456",
  content: { goals: ["Complete onboarding"] }, // object or string
});

// Update (replace mode)
await memory.updateWorkingMemory({
  conversationId: "thread-123",
  userId: "user-456",
  content: "Fresh context",
  options: { mode: "replace" },
});

// Clear
await memory.clearWorkingMemory({
  conversationId: "thread-123",
  userId: "user-456",
});

// Introspect configuration
const format = memory.getWorkingMemoryFormat(); // "markdown" | "json" | null
const template = memory.getWorkingMemoryTemplate(); // string | null
const schema = memory.getWorkingMemorySchema(); // ZodObject | null
```

## Storage Implementation

Working memory is stored differently per scope:

**Conversation scope:**

- Stored in `conversations.metadata.workingMemory` field
- Isolated per conversation thread

**User scope:**

- Stored in `${tablePrefix}_users.metadata.workingMemory` field (adapter-specific)
- Shared across all user conversations

All official adapters (LibSQL, Postgres, Supabase, Managed Memory) support both scopes.

## Example: User-Scoped Preferences

```ts
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { z } from "zod";

const userPreferencesSchema = z.object({
  name: z.string().optional(),
  timezone: z.string().optional(),
  communicationStyle: z.enum(["formal", "casual"]).optional(),
  interests: z.array(z.string()).optional(),
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    scope: "user", // persist across all conversations
    schema: userPreferencesSchema,
  },
});

const agent = new Agent({
  name: "Personal Assistant",
  instructions: "Adapt responses based on user preferences stored in working memory.",
  model: "openai/gpt-4o-mini",
  memory,
});

// First conversation
await agent.generateText("I prefer casual communication and I'm into AI and music.", {
  userId: "user-123",
  conversationId: "conv-1",
});

// Different conversation - agent remembers user preferences
await agent.generateText("What should I learn next?", {
  userId: "user-123",
  conversationId: "conv-2", // different thread
});
```

## Example: Conversation-Scoped Goals

```ts
const projectMemory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    scope: "conversation", // isolated per project
    template: `
# Project Context
- Name:
- Deadline:
- Tech Stack:

# Current Sprint
- Goals:
- Blockers:
`,
  },
});

const agent = new Agent({
  name: "Project Manager",
  instructions: "Track project context and help with sprint planning.",
  model: "openai/gpt-4o-mini",
  memory: projectMemory,
});

// Each project gets its own working memory
await agent.generateText("Let's plan the e-commerce project using Next.js.", {
  userId: "user-123",
  conversationId: "project-ecommerce",
});

await agent.generateText("For the analytics dashboard, we'll use React and D3.", {
  userId: "user-123",
  conversationId: "project-analytics",
});
```

## Best Practices

1. **Use JSON schemas for structured data** - Ensures type safety and validation
2. **Use Markdown templates for narrative context** - Better for summaries, notes, observations
3. **Default to append mode** - Safer than replace; preserves existing data
4. **User scope for preferences** - Name, timezone, communication style
5. **Conversation scope for session data** - Goals, tasks, project details
6. **Keep it compact** - Working memory supplements message history, not replaces it

## Learn More

- **[Semantic Search](./semantic-search.md)** - Retrieve relevant past messages
- **[Managed Memory](./managed-memory.md)** - Zero-setup working memory storage
- **[LibSQL / Turso](./libsql.md)** - Self-hosted working memory storage
