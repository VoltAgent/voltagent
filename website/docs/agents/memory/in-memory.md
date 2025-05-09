---
title: In-Memory Storage
slug: /agents/memory/in-memory
---

# In-Memory Storage

VoltAgent's core package (`@voltagent/core`) includes `InMemoryStorage`, a simple memory provider that stores conversation history directly in the application's memory.

## Overview

- **Use Case:** Development, testing, demos, or any scenario where persistent memory across application restarts is not required.
- **Pros:** Zero external dependencies, extremely fast, easy to use.
- **Cons:** All stored data (conversation history, agent state) is **lost** when the application stops or restarts.
- **Availability:** Included directly in `@voltagent/core`.

## Configuration

Initialize `InMemoryStorage` and pass it to your `Agent` configuration. It accepts optional configuration for limiting storage and enabling debugging.

```typescript
import { Agent, InMemoryStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Initialize InMemoryStorage
const memory = new InMemoryStorage({
  // Optional: Limit the number of messages stored per conversation thread
  storageLimit: 100, // Defaults to no limit if not specified

  // Optional: Enable verbose debug logging from the memory provider
  debug: true, // Defaults to false
});

const agent = new Agent({
  name: "Ephemeral Agent",
  instructions: "An agent using in-memory storage (history resets on restart).",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: memory, // Assign the InMemoryStorage instance
});

// Interactions with this agent will use the in-memory store.
// await agent.generateText("Remember this info.", { userId: "user1", conversationId: "conv1" });
// // If the app restarts here, the above message is lost.
// await agent.generateText("Do you remember?", { userId: "user1", conversationId: "conv1" });
```

**Configuration Options:**

- `storageLimit` (number, optional): The maximum number of messages to retain per unique `userId`/`conversationId` pair. When the limit is reached, the oldest messages are discarded to make room for new ones. Defaults to `Infinity` (no limit).
- `debug` (boolean, optional): Enables detailed logging from the `InMemoryStorage` provider to the console, useful for understanding memory operations during development. Defaults to `false`.

## When to Use

- **Development & Testing:** Quickly test agent logic without setting up a database.
- **Stateless Use Cases:** When conversation history is not needed between sessions or application runs.
- **Demos & Examples:** Simple setup for showcasing agent capabilities.
- **Caching Layers:** Could potentially be used as a short-term cache in more complex memory strategies (though not its primary design).

Avoid using `InMemoryStorage` in production environments where conversation history needs to be persistent.
