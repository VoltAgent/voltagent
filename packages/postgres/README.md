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
<img width="896" alt="flow" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## What is VoltAgent?

> An **AI Agent Framework** provides the foundational structure and tools needed to build applications powered by autonomous agents. These agents, often driven by Large Language Models (LLMs), can perceive their environment, make decisions, and take actions to achieve specific goals. Building such agents from scratch involves managing complex interactions with LLMs, handling state, connecting to external tools and data, and orchestrating workflows.

**VoltAgent** is an open-source TypeScript framework that acts as this essential toolkit. It simplifies the development of AI agent applications by providing modular building blocks, standardized patterns, and abstractions. Whether you're creating chatbots, virtual assistants, automated workflows, or complex multi-agent systems, VoltAgent handles the underlying complexity, allowing you to focus on defining your agents' capabilities and logic.

Instead of building everything from scratch, VoltAgent provides ready-made, modular building blocks:

- **Core Engine (`@voltagent/core`)**: The heart of VoltAgent, providing fundamental capabilities for your AI agents Define individual agents with specific roles, tools, and memory.
- **Multi-Agent Systems**: Architect complex applications by coordinating multiple specialized agents using Supervisors.
- **Extensible Packages**: Enhance functionality with packages like `@voltagent/voice` for voice interactions.
- **Tooling & Integrations**: Equip agents with tools to connect to external APIs, databases, and services, enabling them to perform real-world tasks. **Supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for standardized tool interactions.**
- **Data Retrieval & RAG**: Implement specialized retriever agents for efficient information fetching and **Retrieval-Augmented Generation (RAG)**.
- **Memory**: Enable agents to remember past interactions for more natural and context-aware conversations.
- **LLM Compatibility**: Works with popular AI models from OpenAI, Google, Anthropic, and more, allowing easy switching.
- **Developer Ecosystem**: Includes helpers like `create-voltagent-app`, `@voltagent/cli`, and the visual [VoltOps LLM Observability Platform](https://console.voltagent.dev) for quick setup, monitoring, and debugging.

In essence, VoltAgent helps developers build sophisticated AI applications faster and more reliably, avoiding repetitive setup and the limitations of simpler tools.

## Why VoltAgent?

Building AI applications often involves a trade-off:

1.  **DIY Approach:** Using basic AI provider tools offers control but leads to complex, hard-to-manage code and repeated effort.
2.  **No-Code Builders:** Simpler initially but often restrictive, limiting customization, provider choice, and complexity.

VoltAgent provides a middle ground, offering structure and components without sacrificing flexibility:

- **Build Faster:** Accelerate development with pre-built components compared to starting from scratch.
- **Maintainable Code:** Encourages organization for easier updates and debugging.
- **Scalability:** Start simple and easily scale to complex, multi-agent systems handling intricate workflows.
- **Flexibility:** Full control over agent behavior, LLM choice, tool integrations, and UI connections.
- **Avoid Lock-in:** Freedom to switch AI providers and models as needed.
- **Cost Efficiency:** Features designed to optimize AI service usage and reduce redundant calls.
- **Visual Monitoring:** Use the [VoltOps LLM Observability Platform](https://console.voltagent.dev) to track agent performance, inspect state, and debug visually.

VoltAgent empowers developers to build their envisioned AI applications efficiently, from simple helpers to complex systems.

## ⚡ Quick Start

Create a new VoltAgent project in seconds using the `create-voltagent-app` CLI tool:

```bash
npm create voltagent-app@latest
```

This command guides you through setup.

You'll see the starter code in `src/index.ts` to get you started with the VoltAgent framework.

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // Example provider
import { openai } from "@ai-sdk/openai"; // Example model

// Define a simple agent
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  // Note: You can swap VercelAIProvider and openai with other supported providers/models
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: {
    agent,
  },
});
```

Afterwards, navigate to your project and run:

```bash
npm run dev
```

When you run the dev command, tsx will compile and run your code. You should see the VoltAgent server startup message in your terminal:

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

VoltOps Platform: https://console.voltagent.dev
══════════════════════════════════════════════════
```

Your agent is now running! To interact with it:

1. Open the Console: Click the [VoltOps LLM Observability Platform](https://console.voltagent.dev) link in your terminal output (or copy-paste it into your browser).
2. Find Your Agent: On the VoltOps LLM Observability Platform page, you should see your agent listed (e.g., "my-agent").
3. Open Agent Details: Click on your agent's name.
4. Start Chatting: On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5. Send a Message: Type a message like "Hello" and press Enter.

![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)

## Key Features

- **Agent Core:** Define agents with descriptions, LLM providers, tools, and memory management.
- **Multi-Agent Systems:** Build complex workflows using Supervisor Agents coordinating multiple specialized Sub-Agents.
- **Tool Usage & Lifecycle:** Equip agents with custom or pre-built tools (functions) with type-safety (Zod), lifecycle hooks, and cancellation support to interact with external systems.
- **Flexible LLM Support:** Integrate seamlessly with various LLM providers (OpenAI, Anthropic, Google, etc.) and easily switch between models.
- **Memory Management:** Enable agents to retain context across interactions using different configurable memory providers.
- **Observability & Debugging:** Visually monitor agent states, interactions, logs, and performance via the [VoltOps LLM Observability Platform](https://console.voltagent.dev).
- **Voice Interaction:** Build voice-enabled agents capable of speech recognition and synthesis using the `@voltagent/voice` package.
- **Data Retrieval & RAG:** Integrate specialized retriever agents for efficient information fetching and **Retrieval-Augmented Generation (RAG)** from various sources.
- **Model Context Protocol (MCP) Support:** Connect to external tool servers (HTTP/stdio) adhering to the [MCP standard](https://modelcontextprotocol.io/) for extended capabilities.
- **Prompt Engineering Tools:** Leverage utilities like `createPrompt` for crafting and managing effective prompts for your agents.
- **Framework Compatibility:** Designed for easy integration into existing Node.js applications and popular frameworks.

## Use Cases

VoltAgent is versatile and can power a wide range of AI-driven applications:

- **Complex Workflow Automation:** Orchestrate multi-step processes involving various tools, APIs, and decision points using coordinated agents.
- **Intelligent Data Pipelines:** Build agents that fetch, process, analyze, and transform data from diverse sources.
- **AI-Powered Internal Tools & Dashboards:** Create interactive internal applications that leverage AI for analysis, reporting, or task automation, often integrated with UIs using hooks.
- **Automated Customer Support Agents:** Develop sophisticated chatbots that can understand context (memory), use tools (e.g., check order status), and escalate complex issues.
- **Repository Analysis & Codebase Automation:** Analyze code repositories, automate refactoring tasks, generate documentation, or manage CI/CD processes.
- **Retrieval-Augmented Generation (RAG) Systems:** Build agents that retrieve relevant information from knowledge bases (using retriever agents) before generating informed responses.
- **Voice-Controlled Interfaces & Applications:** Utilize the `@voltagent/voice` package to create applications that respond to and generate spoken language.
- **Personalized User Experiences:** Develop agents that adapt responses and actions based on user history and preferences stored in memory.
- **Real-time Monitoring & Alerting:** Design agents that continuously monitor data streams or systems and trigger actions or notifications based on defined conditions.
- **And Virtually Anything Else...**: If you can imagine an AI agent doing it, VoltAgent can likely help you build it! ⚡

## Learning VoltAgent

- **[Documentation](https://voltagent.dev/docs/)**: Dive into guides, concepts, and tutorials.
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)**: Explore practical implementations.
- **[Blog](https://voltagent.dev/blog/)**: Read more about technical insights, and best practices.

## Contribution

We welcome contributions! Please refer to the contribution guidelines (link needed if available). Join our [Discord](https://s.voltagent.dev/discord) server for questions and discussions.

## Community ♥️ Thanks

Your stars help us reach more developers! If you find VoltAgent useful, please consider giving us a star on GitHub to support the project and help others discover it.

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.

# VoltAgent PostgreSQL Memory Storage

A high-performance PostgreSQL storage implementation for VoltAgent's memory system with enhanced user-centric conversation management.

## Features

- **User-Centric Conversations**: Associate conversations with specific users for multi-tenant applications
- **Automatic Schema Migration**: Seamlessly migrate from old schema to new user-based schema
- **Query Builder Pattern**: Fluent interface for complex conversation queries
- **Pagination Support**: Built-in pagination for large conversation lists
- **PostgreSQL Optimized**: Takes advantage of PostgreSQL's advanced features and indexing
- **Transaction Safety**: All operations are wrapped in transactions for data consistency
- **Backup & Restore**: Built-in backup functionality during migrations

## Installation

```bash
npm install @voltagent/postgres
```

## Basic Usage

```typescript
import { PostgresStorage } from "@voltagent/postgres";

// Initialize with connection details
const storage = new PostgresStorage({
  connection: {
    host: "localhost",
    port: 5432,
    database: "voltagent",
    user: "postgres",
    password: "password",
  },
  storageLimit: 100,
  debug: true,
});

// Add a message to a conversation
await storage.addMessage(
  {
    id: "msg-123",
    role: "user",
    content: "Hello!",
    type: "text",
    createdAt: new Date().toISOString(),
  },
  "user-123",
  "conversation-456"
);

// Create a conversation
const conversation = await storage.createConversation({
  id: "conv-123",
  resourceId: "agent-456",
  userId: "user-123",
  title: "Customer Support Chat",
  metadata: { priority: "high" },
});
```

## User-Centric Conversation Management

### Get User's Conversations (ChatGPT-style)

```typescript
// Get recent conversations for a user
const conversations = await storage.getConversationsByUserId("user-123", {
  limit: 50,
  orderBy: "updated_at",
  orderDirection: "DESC",
});

// Display in sidebar like ChatGPT
conversations.forEach((conv) => {
  console.log(`${conv.title} - ${conv.updatedAt}`);
});
```

### Advanced Query Builder

```typescript
import { ExtendedPostgresStorage } from "@voltagent/postgres";

const storage = new ExtendedPostgresStorage({
  connection: process.env.DATABASE_URL,
});

// Fluent query interface
const recentChats = await storage
  .getUserConversations("user-123")
  .limit(20)
  .orderBy("updated_at", "DESC")
  .execute();

// Get paginated conversations
const page1 = await storage.getPaginatedUserConversations("user-123", 1, 10);
console.log(`Page 1 of ${page1.hasMore ? "many" : page1.conversations.length}`);
```

### Complex Queries

```typescript
// Query with multiple filters
const workConversations = await storage.queryConversations({
  userId: "user-123",
  resourceId: "work-agent",
  limit: 25,
  offset: 0,
  orderBy: "created_at",
  orderDirection: "DESC",
});

// Get all messages for a conversation
const messages = await storage.getConversationMessages("conversation-456", {
  limit: 100,
  offset: 0,
});
```

## Schema Migration

The storage automatically handles migration from the old schema to the new user-centric schema:

### Automatic Migration

```typescript
// Migration happens automatically on initialization
const storage = new PostgresStorage({
  connection: process.env.DATABASE_URL,
});

// Check migration status
const result = await storage.migrateConversationSchema({
  createBackup: true,
  deleteBackupAfterSuccess: false,
});

if (result.success) {
  console.log(`Migrated ${result.migratedCount} conversations`);
} else {
  console.error("Migration failed:", result.error);
}
```

### Manual Migration Control

```typescript
// Restore from backup if needed
await storage.migrateConversationSchema({
  restoreFromBackup: true,
});

// Migration with custom options
await storage.migrateConversationSchema({
  createBackup: true,
  deleteBackupAfterSuccess: true,
});
```

## Schema Changes

### New Schema (After Migration)

**Conversations Table:**

```sql
CREATE TABLE voltagent_memory_conversations (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  user_id TEXT NOT NULL,  -- NEW: Associates conversation with user
  title TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Messages Table:**

```sql
CREATE TABLE voltagent_memory_messages (
  conversation_id TEXT NOT NULL REFERENCES voltagent_memory_conversations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  -- user_id REMOVED: Now derived through conversation relationship
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, message_id)
);
```

### Indexes

```sql
-- Optimized indexes for user-centric queries
CREATE INDEX idx_conversations_user ON voltagent_memory_conversations(user_id);
CREATE INDEX idx_conversations_resource ON voltagent_memory_conversations(resource_id);
CREATE INDEX idx_messages_lookup ON voltagent_memory_messages(conversation_id, created_at);
```

## Configuration Options

```typescript
interface PostgresStorageOptions {
  connection:
    | string
    | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl?: boolean;
      };
  maxConnections?: number; // Default: 10
  tablePrefix?: string; // Default: "voltagent_memory"
  debug?: boolean; // Default: false
  storageLimit?: number; // Default: 100
}
```

## Examples

### Multi-Tenant Application

```typescript
// Different users can have separate conversation histories
const userAConversations = await storage.getConversationsByUserId("user-a");
const userBConversations = await storage.getConversationsByUserId("user-b");

// Each user only sees their own conversations
assert(userAConversations.every((c) => c.userId === "user-a"));
assert(userBConversations.every((c) => c.userId === "user-b"));
```

### Conversation Management UI

```typescript
// Build a ChatGPT-style conversation list
async function getConversationList(userId: string, page: number = 1) {
  const result = await storage.getPaginatedUserConversations(userId, page, 20);

  return {
    conversations: result.conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || "Untitled Conversation",
      lastMessage: conv.updatedAt,
      preview: conv.metadata?.preview || "",
    })),
    hasMore: result.hasMore,
    currentPage: page,
  };
}

// Get conversation details when user clicks
async function openConversation(conversationId: string, userId: string) {
  // Verify user owns this conversation
  const conversation = await storage.getUserConversation(conversationId, userId);
  if (!conversation) {
    throw new Error("Conversation not found or access denied");
  }

  // Load conversation messages
  const messages = await storage.getConversationMessages(conversationId);

  return { conversation, messages };
}
```

### Analytics and Reporting

```typescript
// Get conversation statistics per user
async function getUserStats(userId: string) {
  const conversations = await storage.getConversationsByUserId(userId);

  const stats = {
    totalConversations: conversations.length,
    thisWeek: conversations.filter(
      (c) => new Date(c.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
    averageMessagesPerConversation: 0,
  };

  // Calculate average messages per conversation
  let totalMessages = 0;
  for (const conv of conversations) {
    const messages = await storage.getConversationMessages(conv.id);
    totalMessages += messages.length;
  }

  stats.averageMessagesPerConversation = totalMessages / conversations.length || 0;
  return stats;
}
```

## Performance Considerations

- **Indexing**: The storage creates optimized indexes for user-based queries
- **Connection Pooling**: Uses PostgreSQL connection pooling for better performance
- **Pagination**: Always use pagination for large conversation lists
- **Transactions**: All write operations are wrapped in transactions

## Error Handling

```typescript
try {
  await storage.addMessage(message, userId, conversationId);
} catch (error) {
  if (error.message.includes("foreign key constraint")) {
    console.error("Conversation does not exist");
  } else {
    console.error("Database error:", error);
  }
}
```

## Migration Notes

1. **Backup Recommended**: Always backup your database before running migrations
2. **Downtime**: Migration may require brief downtime for large datasets
3. **Default User**: Existing conversations are assigned `userId = "default"` during migration
4. **Reversible**: Migration includes backup/restore functionality for rollback

## Contributing

This storage implementation is part of the VoltAgent project. See the main repository for contribution guidelines.

## License

Same as the main VoltAgent project.
