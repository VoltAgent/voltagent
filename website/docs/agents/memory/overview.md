---
title: Overview
slug: /agents/memory/overview
---

# Memory Overview

Conversational AI agents often need to remember past interactions to maintain context, understand user preferences, and provide more coherent and personalized responses. Without memory, each interaction would be treated in isolation, leading to repetitive questions and unnatural conversations.

VoltAgent provides a unified `Memory` class with pluggable storage adapters. It stores and retrieves conversation history, and optionally supports embedding-powered semantic search and structured working memory.

## Why Use Memory?

- **Context Preservation:** Enables agents to recall previous messages in a conversation, understanding follow-up questions and references.
- **Personalization:** Allows agents to remember user-specific details (like name, preferences, past requests) for a tailored experience.
- **Coherence:** Ensures conversations flow naturally without the agent constantly losing track of the topic.
- **Long-Term State:** Can be used to store summaries or key information extracted from conversations over extended periods.

## Default Memory Behavior

By default, agents use in-memory storage (no persistence) with zero configuration. If you don't provide a `memory` option, VoltAgent falls back to an in-memory adapter that:

1.  Stores conversation history in application memory.
2.  Maintains context during the application runtime.
3.  Loses data when the application restarts (suitable for development and stateless deployments).

For persistent storage across restarts, configure `Memory` with a storage adapter such as `LibSQLMemoryAdapter`, `PostgreSQLMemoryAdapter`, or `SupabaseMemoryAdapter`. See the specific adapter docs for details.

## Disabling Memory

You can completely disable memory persistence and retrieval by setting the `memory` property to `false` in the `Agent` constructor:

```ts
const agent = new Agent({
  name: "Stateless Assistant",
  instructions: "This agent has no memory.",
  model: openai("gpt-4o"),
  memory: false, // disable memory entirely
});
```

When memory is disabled, the agent won't store or retrieve any conversation history, making it stateless for each interaction.

## Separate Conversation and History Memory

VoltAgent manages conversation memory via the `memory` option. Observability (execution logs) is handled via OpenTelemetry and VoltOps integrations, and is not tied to conversation storage.

## Working Memory

Working memory lets the agent persist concise, important context across turns (conversation-scoped by default, optionally user-scoped). Configuration is part of the `Memory` constructor via `workingMemory`.

Supported modes:

- Template (Markdown): `workingMemory: { enabled: true, template: string }`
- JSON schema (Zod): `workingMemory: { enabled: true, schema: z.object({...}) }`
- Free-form: `workingMemory: { enabled: true }`

Scope:

- `scope?: 'conversation' | 'user'` (defaults to `conversation`)

Example (template-based, conversation-scoped):

```ts
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    template: `
# Profile
- Name:
- Role:

# Goals
-

# Preferences
-
`,
    // scope: 'conversation' // default
  },
});

const agent = new Agent({
  name: "Assistant",
  instructions: "Use working memory to maintain key facts.",
  model: openai("gpt-4o-mini"),
  memory,
});

// When the agent runs with user/conversation IDs, it appends
// working-memory instructions to the system prompt before the LLM call
const res = await agent.generateText("Let's plan this week", {
  userId: "u1",
  conversationId: "c1",
});
```

Example (JSON schema, user-scoped):

```ts
import { z } from "zod";
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const workingSchema = z.object({
  userProfile: z
    .object({
      name: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  tasks: z.array(z.string()).optional(),
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  workingMemory: {
    enabled: true,
    scope: "user",
    schema: workingSchema,
  },
});

const agent = new Agent({ name: "Planner", model: openai("gpt-4o-mini"), memory });
```

Programmatic API:

- `memory.getWorkingMemory({ conversationId?, userId? }) → Promise<string | null>`
- `memory.updateWorkingMemory({ conversationId?, userId?, content })` where `content` is a string or an object matching the schema when configured (validated internally). Stores as string (Markdown or JSON) under the hood.
- `memory.clearWorkingMemory({ conversationId?, userId? })`
- `memory.getWorkingMemoryFormat() → 'markdown' | 'json' | null`
- `memory.getWorkingMemoryTemplate() → string | null`
- `memory.getWorkingMemorySchema() → z.ZodObject | null`

Tools registered when working memory is configured:

- `get_working_memory()` → returns the current content string
- `update_working_memory(content)` → updates content (typed to schema if configured)
- `clear_working_memory()` → clears content

Agent prompt integration:

- On each call with `userId` and `conversationId`, the agent appends a working-memory instruction block to the system prompt (including template/schema and current content if present).

## Semantic Search (Embeddings + Vectors)

To enable semantic retrieval of past messages, configure both an embedding adapter and a vector adapter. Memory embeds text parts of messages and stores vectors with metadata.

## Message Persistence Pipeline

VoltAgent batches every step into a single assistant response (tool call, tool result, follow-up text) before writing to memory. Saves are debounced for performance, and the agent flushes the queue when a request finishes—even on errors. The most recent step stays recorded if the loop stops midway, so conversation history remains consistent across restarts.

Adapters:

- `AiSdkEmbeddingAdapter` (wraps ai-sdk embedding models)
- `InMemoryVectorAdapter` (lightweight dev vector store)
- `LibSQLVectorAdapter` from `@voltagent/libsql` (persistent vectors via LibSQL/Turso/SQLite)

Example (dev vector store):

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
  enableCache: true, // optional embedding cache
});

const agent = new Agent({ name: "Helper", model: openai("gpt-4o-mini"), memory });

// Enable semantic search per-call (defaults shown; enabled auto when vectors present)
const out = await agent.generateText("What did I say about pricing last week?", {
  userId: "u1",
  conversationId: "c1",
  semanticMemory: {
    enabled: true,
    semanticLimit: 5,
    semanticThreshold: 0.7,
    mergeStrategy: "append", // default ('prepend' | 'append' | 'interleave')
  },
});
```

Example (persistent vectors with LibSQL):

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new LibSQLVectorAdapter({ url: "file:./.voltagent/memory.db" }),
});

// For ephemeral tests, use in‑memory DB:
// new LibSQLVectorAdapter({ url: ":memory:" }) // or "file::memory:"
```

How it works:

- On save, Memory embeds text parts of messages and stores vectors with metadata `{ messageId, conversationId, userId, role, createdAt }` and ID pattern `msg_${conversationId}_${message.id}`.
- On read with semantic search enabled, Memory searches similar messages and merges them with recent messages using the configured strategy.

Programmatic search:

- `memory.hasVectorSupport()` → boolean
- `memory.searchSimilar(query, { limit?, threshold?, filter? }) → Promise<SearchResult[]>`

## Memory Providers

VoltAgent achieves persistence via swappable storage adapters you pass to `new Memory({ storage: ... })`:

- **[`LibSQLMemoryAdapter`](./libsql.md):** From `@voltagent/libsql` (LibSQL/Turso/SQLite)
- **[`PostgreSQLMemoryAdapter`](./postgres.md):** From `@voltagent/postgres`
- **[`SupabaseMemoryAdapter`](./supabase.md):** From `@voltagent/supabase`
- **[`InMemoryStorageAdapter`](./in-memory.md):** Default in-memory adapter (no persistence)

Optional components:

- Embeddings via `AiSdkEmbeddingAdapter` (choose any ai-sdk embedding model)
- Vector store via `InMemoryVectorAdapter` (or custom)

## How Memory Works with Agents

When you configure an `Agent` with a memory provider instance (or use the default), VoltAgent's internal `MemoryManager` performs the following steps:

1.  **Retrieval:** Before generating a response (e.g., during `agent.generateText()`), the manager fetches relevant conversation history or state from the memory provider based on the provided `userId` and `conversationId`.
2.  **Injection:** This retrieved context is typically formatted and added to the prompt sent to the LLM, giving it the necessary background information.
3.  **Saving:** After an interaction completes, the new messages (user input and agent response) are saved back to the memory provider, associated with the same `userId` and `conversationId`.

These steps run whenever you call the agent's core interaction methods (`generateText`, `streamText`, `generateObject`, `streamObject`).

## User and Conversation Identification

To separate conversations for different users or different chat sessions within the same application, you **must** provide `userId` and `conversationId` in the options when calling agent methods directly in your code. If you are interacting with the agent via the [Core API](../../api/overview.md), you can pass these same identifiers within the `options` object in your request body. See the [API examples](../../api/endpoints/agents.md#generate-text) for details on the API usage.

When calling agent methods directly:

```ts
const response = await agent.generateText("Hello, how can you help me?", {
  userId: "user-123", // Identifies the specific user
  conversationId: "chat-session-xyz", // Identifies this specific conversation thread
});
```

These identifiers work consistently across all agent generation methods (`generateText`, `streamText`, `generateObject`, `streamObject`).

## Examples

### Default (in-memory)

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "My Assistant",
  instructions: "Uses default in-memory storage.",
  model: openai("gpt-4o-mini"),
});
```

### Persistent (LibSQL)

```ts
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Persistent Assistant",
  instructions: "Uses LibSQL for memory.",
  model: openai("gpt-4o-mini"),
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  }),
});
```

### Semantic Search + Working Memory

```ts
import { Agent, Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new InMemoryVectorAdapter(),
  workingMemory: { enabled: true },
});

const agent = new Agent({
  name: "Smart Memory Assistant",
  instructions: "Retrieves with semantic search and tracks working memory.",
  model: openai("gpt-4o-mini"),
  memory,
});
```

### How User and Conversation IDs Work

- **`userId`**: A unique string identifying the end-user. Memory entries are segregated per user. If omitted, it defaults to the string `"default"`.
- **`conversationId`**: A unique string identifying a specific conversation thread for a user. This allows a single user to have multiple parallel conversations.
  - **If provided:** The agent retrieves and saves messages associated with this specific thread.
  - **If omitted:** A **new random UUID is generated for each request**, effectively starting a new, separate conversation every time. This is useful for one-off tasks or ensuring a clean slate for each interaction when context isn't needed.

**Key Behaviors:**

1.  **Context Retrieval**: Before calling the LLM, the `MemoryManager` retrieves previous messages associated with the given `userId` and `conversationId` from the memory provider.
2.  **Message Storage**: After the interaction, new user input and agent responses are stored using the same `userId` and `conversationId`.
3.  **Continuity**: Providing the same `userId` and `conversationId` across multiple requests keeps the context of that specific thread.
4.  **New Conversations**: Omitting `conversationId` guarantees a fresh conversation context for each request.

```ts
// To start a NEW conversation each time (or for single-turn interactions):
// Omit conversationId; VoltAgent generates a new one for each call.
const response1 = await agent.generateText("Help with account setup", { userId: "user-123" });
const response2 = await agent.generateText("Question about billing issue", { userId: "user-123" }); // Starts another new conversation

// To MAINTAIN a continuous conversation across requests:
// Always provide the SAME conversationId.
const SUPPORT_THREAD_ID = "case-987-abc";
const responseA = await agent.generateText("My router is not working.", {
  userId: "user-456",
  conversationId: SUPPORT_THREAD_ID,
});
// Agent remembers the router issue for the next call with the same ID
const responseB = await agent.generateText("I tried restarting it, still no luck.", {
  userId: "user-456",
  conversationId: SUPPORT_THREAD_ID,
});
```

## Context Management

When interacting with an agent that has memory enabled, the `MemoryManager` retrieves recent messages for the given `userId` and `conversationId` and includes them as context in the prompt sent to the LLM.

```ts
// The agent retrieves history for user-123/chat-session-xyz
// and includes up to N recent messages (determined by the provider/manager) in the LLM prompt.
const response = await agent.generateText("What was the first thing I asked you?", {
  userId: "user-123",
  conversationId: "chat-session-xyz",
  // contextLimit: 10, // Note: contextLimit is typically managed by MemoryOptions now
});
```

How many messages are retrieved is often determined by the `storageLimit` configured on the Memory Provider or internal logic within the `MemoryManager`. This is crucial for:

1.  **Coherence**: Providing the LLM with enough history to understand the ongoing conversation.
2.  **Cost/Performance**: Limiting the context size to manage LLM token usage (cost) and potentially reduce latency.
3.  **Relevance**: Ensuring the context is relevant without overwhelming the LLM with excessive or old information.

## Implementing Custom Memory Providers

To use a custom database or storage system, implement the `StorageAdapter` interface (`@voltagent/core` → `memory/types`). Observability is separate. The adapter only persists conversation messages, working memory, and workflow state for suspension/resume. Embedding and vector search are separate adapters.

Required methods (summary):

- Messages: `addMessage`, `addMessages`, `getMessages`, `clearMessages`
- Conversations: `createConversation`, `getConversation`, `getConversations`, `getConversationsByUserId`, `queryConversations`, `updateConversation`, `deleteConversation`
- Working memory: `getWorkingMemory`, `setWorkingMemory`, `deleteWorkingMemory`
- Workflow state: `getWorkflowState`, `setWorkflowState`, `updateWorkflowState`, `getSuspendedWorkflowStates`

Implementation notes:

- Store `UIMessage` values as data. Return messages in chronological order (oldest first).
- Support `storageLimit`. When the limit is exceeded, prune the oldest messages.
- Working memory content is a string. When a schema is configured, `Memory` converts the provided object to a JSON string before calling the adapter.

Skeleton:

```ts
import type {
  StorageAdapter,
  UIMessage,
  Conversation,
  CreateConversationInput,
  ConversationQueryOptions,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "@voltagent/core";

export class MyStorageAdapter implements StorageAdapter {
  // Messages
  async addMessage(msg: UIMessage, userId: string, conversationId: string): Promise<void> {}
  async addMessages(msgs: UIMessage[], userId: string, conversationId: string): Promise<void> {}
  async getMessages(
    userId: string,
    conversationId: string,
    options?: { limit?: number; before?: Date; after?: Date; roles?: string[] }
  ): Promise<UIMessage[]> {
    return [];
  }
  async clearMessages(userId: string, conversationId?: string): Promise<void> {}

  // Conversations
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    throw new Error("Not implemented");
  }
  async getConversation(id: string): Promise<Conversation | null> {
    return null;
  }
  async getConversations(resourceId: string): Promise<Conversation[]> {
    return [];
  }
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">
  ): Promise<Conversation[]> {
    return [];
  }
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    return [];
  }
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>
  ): Promise<Conversation> {
    throw new Error("Not implemented");
  }
  async deleteConversation(id: string): Promise<void> {}

  // Working memory
  async getWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<string | null> {
    return null;
  }
  async setWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    content: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {}
  async deleteWorkingMemory(params: {
    conversationId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<void> {}

  // Workflow state
  async getWorkflowState(id: string): Promise<WorkflowStateEntry | null> {
    return null;
  }
  async setWorkflowState(id: string, state: WorkflowStateEntry): Promise<void> {}
  async updateWorkflowState(id: string, updates: Partial<WorkflowStateEntry>): Promise<void> {}
  async getSuspendedWorkflowStates(workflowId: string): Promise<WorkflowStateEntry[]> {
    return [];
  }
}

// Usage example
import { Agent, Memory } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new MyStorageAdapter(),
});

const agent = new Agent({
  name: "Helper",
  model: openai("gpt-4o-mini"),
  memory,
});
```

## Best Practices

1.  **Choose the Right Adapter**: Use `InMemoryStorageAdapter` for development/testing or stateless deployments. Use `LibSQLMemoryAdapter` from `@voltagent/libsql` (local/Turso) or a database-backed adapter (like `PostgreSQLMemoryAdapter` in `@voltagent/postgres` or `SupabaseMemoryAdapter` in `@voltagent/supabase`) for production persistence.
2.  **User Privacy**: Be mindful of storing conversation data. Implement clear data retention policies and provide mechanisms for users to manage or delete their history (e.g., using `deleteConversation` or custom logic) if required by privacy regulations.
3.  **Context Management**: While `contextLimit` is less directly used now, be aware of the `storageLimit` on your memory provider, as this often dictates the maximum history retrieved.
4.  **Memory Efficiency**: For high-volume applications using persistent storage, monitor database size and performance. Consider setting appropriate `storageLimit` values on your memory provider to prevent unbounded growth and ensure efficient retrieval.
5.  **Error Handling**: Wrap agent interactions in `try...catch` blocks, as memory operations (especially with external databases) can potentially fail.
6.  **Use `userId` and `conversationId`**: Always provide these identifiers in production applications to correctly scope memory and maintain context for individual users and conversation threads.

Explore the specific documentation for each provider to learn more:

- **[LibSQL / Turso / SQLite](./libsql.md)**
- **[In-Memory Storage](./in-memory.md)**
- **[Supabase](./supabase.md)**
