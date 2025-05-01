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

## Default Memory Behavior (Zero-Config Persistence)

By default, VoltAgent agents use **`LibSQLStorage`** for **zero-configuration local persistence**. If you don't explicitly provide a `memory` option when creating an `Agent`, VoltAgent automatically does the following:

1.  Creates a `.voltagent` folder in your project root (if it doesn't exist).
2.  Initializes `LibSQLStorage` pointing to a SQLite database file at `.voltagent/memory.db`.
3.  Uses this local database to store and retrieve conversation history.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "My Assistant",
  description: "This agent automatically uses local file memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  // No memory provider specified - uses default LibSQLStorage to .voltagent/memory.db
});
```

This makes it easy to get started with stateful agents locally without any manual memory setup.

## Disabling Memory

You can completely disable memory persistence and retrieval by setting the `memory` property to `false` in the `Agent` constructor:

```ts
const agent = new Agent({
  name: "Stateless Assistant",
  description: "This agent has no memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: false, // Memory completely disabled
});
```

When memory is disabled, the agent won't store or retrieve any conversation history, making it stateless for each interaction.

## Memory Providers

VoltAgent achieves memory persistence through swappable **Memory Providers**. These are classes that implement the `Memory` interface defined in `@voltagent/core`. They handle the actual storage and retrieval logic, allowing you to choose the backend that best suits your needs.

VoltAgent includes built-in providers and supports custom implementations:

- **[`LibSQLStorage`](./libsql.md):** (Default Provider) Uses LibSQL (including Turso and local SQLite files) for persistence. Ideal for easy setup, local development, and serverless deployments compatible with SQLite.
- **[`@voltagent/supabase`](./supabase.md):** Uses Supabase (PostgreSQL) for persistence. Suitable for applications already using Supabase or requiring a robust, scalable PostgreSQL backend.
- **[`InMemoryStorage`](./in-memory.md):** Stores conversation history only in the application's memory. Useful for testing, development, or stateless scenarios. Data is lost on application restart.
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

- `addMessage(...)`: Stores a new message.
- `getMessages(...)`: Retrieves messages for a conversation.
- `clearMessages(...)`: Deletes messages for a specific conversation.
- `createConversation(...)`, `getConversation(...)`, `getConversations(...)`, `updateConversation(...)`, `deleteConversation(...)`: Manage conversation metadata.
- `addHistoryEntry(...)`, `updateHistoryEntry(...)`, `getHistoryEntry(...)`, `getAllHistoryEntriesByAgent(...)`: Manage agent run history entries.
- `addHistoryEvent(...)`, `updateHistoryEvent(...)`, `getHistoryEvent(...)`: Manage events within a history entry.
- `addHistoryStep(...)`, `updateHistoryStep(...)`, `getHistoryStep(...)`: Manage steps within a history entry.

```ts
import type {
  Memory,
  MemoryMessage,
  Conversation,
  CreateConversationInput,
  MessageFilterOptions /*...other types*/,
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
  async addHistoryEvent(
    key: string,
    value: any,
    historyId: string,
    agentId: string
  ): Promise<void> {
    /* ... */ throw new Error("Not implemented");
  }
  async updateHistoryEvent(
    key: string,
    value: any,
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
  async getHistoryEvent(key: string): Promise<any> {
    /* ... */ throw new Error("Not implemented");
  }
  async getHistoryStep(key: string): Promise<any> {
    /* ... */ throw new Error("Not implemented");
  }
  async getAllHistoryEntriesByAgent(agentId: string): Promise<any[]> {
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

1.  **Choose the Right Provider**: Use `InMemoryStorage` for development/testing. Use `LibSQLStorage` (local/Turso) or a database-backed provider (like `@voltagent/supabase` or custom) for production persistence.
2.  **User Privacy**: Be mindful of storing conversation data. Implement clear data retention policies and provide mechanisms for users to manage or delete their history (e.g., using `deleteConversation` or custom logic) if required by privacy regulations.
3.  **Context Management**: While `contextLimit` is less directly used now, be aware of the `storageLimit` on your memory provider, as this often dictates the maximum history retrieved.
4.  **Memory Efficiency**: For high-volume applications using persistent storage, monitor database size and performance. Consider setting appropriate `storageLimit` values on your memory provider to prevent unbounded growth and ensure efficient retrieval.
5.  **Error Handling**: Wrap agent interactions in `try...catch` blocks, as memory operations (especially with external databases) can potentially fail.
6.  **Use `userId` and `conversationId`**: Always provide these identifiers in production applications to correctly scope memory and maintain context for individual users and conversation threads.

Explore the specific documentation for each provider to learn more:

- **[LibSQL / Turso / SQLite](./libsql.md)**
- **[In-Memory Storage](./in-memory.md)**
- **[Supabase](./supabase.md)**
