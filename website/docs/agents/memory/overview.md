---
title: Overview
slug: /agents/memory/overview
---

# Memory Overview

Conversational AI agents often need to remember past interactions to maintain context, understand user preferences, and provide more coherent and personalized responses. Without memory, each interaction would be treated in isolation, leading to repetitive questions and unnatural conversations.

VoltAgent incorporates a flexible memory management system that allows agents to store and retrieve information from past interactions using **Memory Providers**.

## Why Use Memory?

- **Context Preservation:** Enables agents to recall previous messages in a conversation, understanding follow-up questions and references.
- **Personalization:** Allows agents to remember user-specific details (like name, preferences, past requests) for a tailored experience.
- **Coherence:** Ensures conversations flow naturally without the agent constantly losing track of the topic.
- **Long-Term State:** Can be used to store summaries or key information extracted from conversations over extended periods.

## Default Memory Behavior

By default, VoltAgent agents use **`InMemoryStorage`** for **zero-configuration operation**. If you don't explicitly provide a `memory` option when creating an `Agent`, VoltAgent automatically uses in-memory storage that:

1.  Stores conversation history in application memory.
2.  Maintains context during the application runtime.
3.  Loses data when the application restarts (suitable for development and stateless deployments).

For persistent storage, you can explicitly configure `LibSQLStorage` from the `@voltagent/libsql` package (see [LibSQL documentation](./libsql.md)).

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "My Assistant",
  instructions: "This agent automatically uses in-memory storage.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // No memory provider specified - uses default InMemoryStorage
});
```

This makes it easy to get started with agents without any manual memory setup. For persistent storage across restarts, configure `LibSQLStorage` from the `@voltagent/libsql` package.

## Disabling Memory

You can completely disable memory persistence and retrieval by setting the `memory` property to `false` in the `Agent` constructor:

```ts
const agent = new Agent({
  name: "Stateless Assistant",
  instructions: "This agent has no memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: false, // Memory completely disabled
});
```

When memory is disabled, the agent won't store or retrieve any conversation history, making it stateless for each interaction.

## Separate Conversation and History Memory

_Available as of version `0.1.56`_

VoltAgent uses two types of memory internally:

- **Conversation Memory**: Stores chat messages for conversation continuity (configured via the `memory` option)
- **History Memory**: Stores execution telemetry, timeline events, and debugging information (configured via the `historyMemory` option)

By default, history memory uses the same storage instance as conversation memory. This means if you configure `InMemoryStorage` for conversations, history will also use `InMemoryStorage` automatically:

```ts
import { Agent, InMemoryStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Explicitly using InMemoryStorage (same as default)
const agent = new Agent({
  name: "Serverless Assistant",
  instructions: "Assistant that works in read-only environments",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: new InMemoryStorage({ storageLimit: 100 }), // Both conversation and history use this
  // historyMemory not specified - automatically uses same as memory
});
```

**When to use separate memory configurations:**

- **Serverless/Read-only environments**: Use `InMemoryStorage` for both when filesystem access is restricted
- **Different storage requirements**: Use `InMemoryStorage` for conversation memory and `LibSQLStorage` for persistent history
- **Compliance**: Separate user data (conversations) from system data (execution logs) for regulatory requirements

```ts
// Example: In-memory for conversations, persistent for history
import { InMemoryStorage } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";

const agent = new Agent({
  name: "Hybrid Memory Assistant",
  // ... other config ...
  memory: new InMemoryStorage({ storageLimit: 50 }), // Fast access for conversations
  historyMemory: new LibSQLStorage({
    url: "file:history.db",
    logger: logger.child({ component: "libsql" }),
  }), // Persistent execution logs
});
```

**Default behavior**: If you don't specify `historyMemory`, it uses the same storage instance as `memory`. If conversation memory is disabled (`memory: false`), history memory defaults to `InMemoryStorage`.

## Memory Providers

VoltAgent achieves memory persistence through swappable **Memory Providers**. These are classes that implement the `Memory` interface defined in `@voltagent/core`. They handle the actual storage and retrieval logic, allowing you to choose the backend that best suits your needs.

VoltAgent includes built-in providers and supports custom implementations:

- **[`LibSQLStorage`](./libsql.md):** (Separate Package: `@voltagent/libsql`) Uses LibSQL (including Turso and local SQLite files) for persistence. Ideal for persistent storage, local development, and serverless deployments compatible with SQLite.
- **[`@voltagent/postgres`](./postgres.md):** Uses PostgreSQL for persistence. Ideal for production applications requiring enterprise-grade database storage, complex queries, or integration with existing PostgreSQL infrastructure.
- **[`@voltagent/supabase`](./supabase.md):** Uses Supabase (PostgreSQL) for persistence. Suitable for applications already using Supabase or requiring a robust, scalable PostgreSQL backend.
- **[`InMemoryStorage`](./in-memory.md):** (Default Provider) Stores conversation history only in the application's memory. Useful for testing, development, or stateless scenarios. Data is lost on application restart.
- **[Custom Providers](#implementing-custom-memory-providers):** You can implement the `Memory` interface to connect to any database or storage system (e.g., Redis, MongoDB, DynamoDB, etc.).

## How Memory Works with Agents

When you configure an `Agent` with a memory provider instance (or use the default), VoltAgent's internal `MemoryManager` automatically handles:

1.  **Retrieval:** Before generating a response (e.g., during `agent.generateText()`), the manager fetches relevant conversation history or state from the memory provider based on the provided `userId` and `conversationId`.
2.  **Injection:** This retrieved context is typically formatted and added to the prompt sent to the LLM, giving it the necessary background information.
3.  **Saving:** After an interaction completes, the new messages (user input and agent response) are saved back to the memory provider, associated with the same `userId` and `conversationId`.

This process happens seamlessly behind the scenes when using the agent's core interaction methods (`generateText`, `streamText`, `generateObject`, `streamObject`).

## User and Conversation Identification

To separate conversations for different users or different chat sessions within the same application, you **must** provide `userId` and `conversationId` in the options when calling agent methods directly in your code. If you are interacting with the agent via the [Core API](../../api/overview.md), you can pass these same identifiers within the `options` object in your request body. See the [API examples](../../api/overview.md#basic-example-using-curl) for details on the API usage.

When calling agent methods directly:

```ts
const response = await agent.generateText("Hello, how can you help me?", {
  userId: "user-123", // Identifies the specific user
  conversationId: "chat-session-xyz", // Identifies this specific conversation thread
});
```

These identifiers work consistently across all agent generation methods (`generateText`, `streamText`, `generateObject`, `streamObject`).

### How User and Conversation IDs Work

- **`userId`**: A unique string identifying the end-user. This ensures memory isolation between different users. If omitted, it defaults to the string `"default"`.
- **`conversationId`**: A unique string identifying a specific conversation thread for a user. This allows a single user to have multiple parallel conversations.
  - **If provided:** The agent retrieves and saves messages associated with this specific thread.
  - **If omitted:** A **new random UUID is generated for each request**, effectively starting a new, separate conversation every time. This is useful for one-off tasks or ensuring a clean slate for each interaction when context isn't needed.

**Key Behaviors:**

1.  **Context Retrieval**: Before calling the LLM, the `MemoryManager` retrieves previous messages associated with the given `userId` and `conversationId` from the memory provider.
2.  **Message Storage**: After the interaction, new user input and agent responses are stored using the same `userId` and `conversationId`.
3.  **Continuity**: Providing the same `userId` and `conversationId` across multiple requests ensures the agent remembers the context of that specific thread.
4.  **New Conversations**: Omitting `conversationId` guarantees a fresh conversation context for each request.

```ts
// To start a NEW conversation each time (or for single-turn interactions):
// Omit conversationId; a new one is generated automatically.
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

When interacting with an agent that has memory enabled, the `MemoryManager` automatically retrieves recent messages for the given `userId` and `conversationId` and includes them as context in the prompt sent to the LLM.

```ts
// The agent automatically retrieves history for user-123/chat-session-xyz
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

For specialized storage needs (e.g., using Redis, MongoDB, a different SQL database, or applying custom logic like summarization before storage), you can implement a custom memory provider.

Your custom class must implement the `Memory` interface defined in `@voltagent/core`. This typically involves providing implementations for methods handling messages, conversations, and agent history entries (like runs, events, steps).

Refer to the `Memory` type definition in `@voltagent/core/memory` for the full interface details. Key methods include:

**Message Management:**

- `addMessage(...)`: Stores a new message.
- `getMessages(...)`: Retrieves messages for a conversation.
- `clearMessages(...)`: Deletes messages for a specific conversation.

**Conversation Management:**

- `createConversation(...)`, `getConversation(...)`, `getConversations(...)`: Basic conversation operations.
- `getConversationsByUserId(...)`: Get conversations for a specific user with query options.
- `queryConversations(...)`: Advanced conversation querying with filtering and pagination.
- `getConversationMessages(...)`: Get messages for a specific conversation with pagination.
- `updateConversation(...)`, `deleteConversation(...)`: Update and delete conversations.

**Agent History Management:**

- `addHistoryEntry(...)`, `updateHistoryEntry(...)`, `getHistoryEntry(...)`: Manage agent run history entries.
- `getAllHistoryEntriesByAgent(...)`: Get all history entries for an agent.
- `addHistoryStep(...)`, `updateHistoryStep(...)`, `getHistoryStep(...)`: Manage steps within a history entry.
- `addTimelineEvent(...)`: Add immutable timeline events for detailed execution tracking.

**Workflow History Management:**

- `storeWorkflowHistory(...)`: Stores a record of a complete workflow execution.
- `getWorkflowHistory(...)`, `getWorkflowHistoryByWorkflowId(...)`: Retrieves workflow history records.
- `updateWorkflowHistory(...)`, `deleteWorkflowHistory(...)`: Updates and deletes workflow history records.
- `storeWorkflowStep(...)`, `getWorkflowSteps(...)`: Stores and retrieves the individual steps of a workflow run.
- `updateWorkflowStep(...)`, `deleteWorkflowStep(...)`: Updates and deletes individual steps.
- `storeWorkflowTimelineEvent(...)`, `getWorkflowTimelineEvents(...)`: Stores and retrieves fine-grained timeline events for detailed workflow observability.

```ts
import type {
  Memory,
  MemoryMessage,
  Conversation,
  CreateConversationInput,
  MessageFilterOptions,
  NewTimelineEvent,
  WorkflowHistoryEntry,
  WorkflowStepHistoryEntry,
  ConversationQueryOptions /*...other types*/,
} from "@voltagent/core";

// Example Structure
export class MyCustomStorage implements Memory {
  private dbClient: any; // Your database client instance

  constructor(/* connection options */) {
    // Initialize client
  }

  async addMessage(message: MemoryMessage, userId: string, conversationId: string): Promise<void> {
    const key = `memory:${userId}:${conversationId}`;
    // Logic to store message in your DB
  }

  async getMessages(options: MessageFilterOptions): Promise<MemoryMessage[]> {
    const key = `memory:${options.userId}:${options.conversationId}`;
    // Logic to retrieve messages from your DB, applying limit
    return []; // Return retrieved messages
  }

  // ... implement all other methods from the Memory interface ...

  async createConversation(conversation: CreateConversationInput): Promise<Conversation> {
    /* ... */ throw new Error("Not implemented");
  }
  async getConversation(id: string): Promise<Conversation | null> {
    /* ... */ throw new Error("Not implemented");
  }
  async getConversations(resourceId: string): Promise<Conversation[]> {
    /* ... */ throw new Error("Not implemented");
  }
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>
  ): Promise<Conversation> {
    /* ... */ throw new Error("Not implemented");
  }
  async deleteConversation(id: string): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async clearMessages(options: {
    userId: string;
    conversationId?: string | undefined;
  }): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async addHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async updateHistoryEntry(key: string, value: any, agentId: string): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async addTimelineEvent(
    key: string,
    value: NewTimelineEvent,
    historyId: string,
    agentId: string
  ): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async updateHistoryStep(
    key: string,
    value: any,
    historyId: string,
    agentId: string
  ): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async getHistoryEntry(key: string): Promise<any> {
    /* ... */ throw new Error("Not implemented");
  }
  async getHistoryStep(key: string): Promise<any> {
    /* ... */ throw new Error("Not implemented");
  }
  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
    /* ... */ throw new Error("Not implemented");
  }
  async getConversationsByUserId(
    userId: string,
    options?: Omit<ConversationQueryOptions, "userId">
  ): Promise<Conversation[]> {
    /* ... */ throw new Error("Not implemented");
  }
  async queryConversations(options: ConversationQueryOptions): Promise<Conversation[]> {
    /* ... */ throw new Error("Not implemented");
  }
  async getConversationMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<MemoryMessage[]> {
    /* ... */ throw new Error("Not implemented");
  }

  // --- Workflow Methods ---
  async storeWorkflowHistory(entry: WorkflowHistoryEntry): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async getWorkflowHistory(id: string): Promise<WorkflowHistoryEntry | null> {
    /* ... */ throw new Error("Not implemented");
  }
  async getWorkflowHistoryByWorkflowId(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    /* ... */ throw new Error("Not implemented");
  }
  async updateWorkflowHistory(id: string, updates: Partial<WorkflowHistoryEntry>): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async deleteWorkflowHistory(id: string): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async storeWorkflowStep(step: WorkflowStepHistoryEntry): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async getWorkflowSteps(workflowHistoryId: string): Promise<WorkflowStepHistoryEntry[]> {
    /* ... */ throw new Error("Not implemented");
  }
  async updateWorkflowStep(id: string, updates: Partial<WorkflowStepHistoryEntry>): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async deleteWorkflowStep(id: string): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async storeWorkflowTimelineEvent(event: any): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async getWorkflowTimelineEvents(workflowHistoryId: string): Promise<any[]> {
    /* ... */ throw new Error("Not implemented");
  }
}

// Use your custom memory provider
const agent = new Agent({
  // ... other options
  memory: new MyCustomStorage(/* ... */),
});
```

## Best Practices

1.  **Choose the Right Provider**: Use `InMemoryStorage` for development/testing or stateless deployments. Use `LibSQLStorage` from `@voltagent/libsql` (local/Turso) or a database-backed provider (like `@voltagent/supabase` or custom) for production persistence.
2.  **User Privacy**: Be mindful of storing conversation data. Implement clear data retention policies and provide mechanisms for users to manage or delete their history (e.g., using `deleteConversation` or custom logic) if required by privacy regulations.
3.  **Context Management**: While `contextLimit` is less directly used now, be aware of the `storageLimit` on your memory provider, as this often dictates the maximum history retrieved.
4.  **Memory Efficiency**: For high-volume applications using persistent storage, monitor database size and performance. Consider setting appropriate `storageLimit` values on your memory provider to prevent unbounded growth and ensure efficient retrieval.
5.  **Error Handling**: Wrap agent interactions in `try...catch` blocks, as memory operations (especially with external databases) can potentially fail.
6.  **Use `userId` and `conversationId`**: Always provide these identifiers in production applications to correctly scope memory and maintain context for individual users and conversation threads.

Explore the specific documentation for each provider to learn more:

- **[LibSQL / Turso / SQLite](./libsql.md)**
- **[In-Memory Storage](./in-memory.md)**
- **[Supabase](./supabase.md)**
