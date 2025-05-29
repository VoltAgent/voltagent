---
title: PostgreSQL Memory
slug: /agents/memory/postgres
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# PostgreSQL Memory

The `PostgresStorage` provider in VoltAgent's PostgreSQL package (`@voltagent/postgres`) implements persistent memory storage using PostgreSQL. This provider is ideal for production environments requiring robust, scalable database storage with full SQL capabilities.

## Overview

- **Use Case:** Production applications requiring enterprise-grade database storage, complex queries, or integration with existing PostgreSQL infrastructure.
- **Pros:**
  - Scalable and production-ready
  - Automatic table creation and indexing
  - Connection pooling for performance
  - Support for SSL connections
  - Timeline events support for detailed agent tracking
- **Cons:** Requires PostgreSQL server setup and management
- **Availability:** Available as separate package `@voltagent/postgres`

## Setup

### Prerequisites

1. A PostgreSQL server (version 12 or higher recommended)

### Install Dependencies

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm install @voltagent/postgres @voltagent/core
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @voltagent/postgres @voltagent/core
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm add @voltagent/postgres @voltagent/core
```

  </TabItem>
</Tabs>

## Configuration

Initialize `PostgresStorage` and pass it to your `Agent` configuration. The provider supports both connection string and individual parameter configurations:

```typescript
import { Agent } from "@voltagent/core";
import { PostgresStorage } from "@voltagent/postgres";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Using a connection string (recommended for simple setups)
const memory = new PostgresStorage({
  connection: "postgresql://postgres:password@host:port",
  maxConnections: 10,
  tablePrefix: "voltagent_memory",
  debug: true,
  storageLimit: 100,
});

// Alternative: Using individual parameters
const memory = new PostgresStorage({
  connection: {
    host: "localhost",
    port: 5432,
    database: "mydb",
    user: "myuser",
    password: "mypassword",
    ssl: true, // Enable SSL connection
  },
  // Optional configuration as above
});

const agent = new Agent({
  name: "PostgreSQL Memory Agent",
  instructions: "An agent using PostgreSQL for persistent memory storage.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: memory,
});
```

### Connection String Format

The connection string format is:

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

For example:

- `postgresql://postgres:password@localhost:5432/mydb`
- `postgresql://postgres:password@host:port` (database name optional)
- `postgresql://user:pass@host:5432/dbname?ssl=true` (with SSL)

### Configuration Options

- `connection` (required): Either a connection string or an object with connection parameters:
  - Connection string: `"postgresql://user:password@host:port/database"`
  - Connection object:
    ```typescript
    {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      ssl?: boolean;
    }
    ```
- `maxConnections` (optional): Maximum number of connections in the pool. Default: `10`
- `tablePrefix` (optional): Prefix for database table names. Default: `"voltagent_memory"`
- `storageLimit` (optional): Maximum number of messages to retain per conversation. Default: `100`
- `debug` (optional): Enable debug logging. Default: `false`

## Automatic Database Setup

`PostgresStorage` automatically creates and manages the necessary database tables and indexes when initialized. This includes:

- `{prefix}_conversations`: Stores conversation metadata
- `{prefix}_messages`: Stores conversation messages
- `{prefix}_agent_history`: Stores agent history entries with structured format (id, agent_id, timestamp, status, input, output, usage, metadata)
- `{prefix}_agent_history_steps`: Stores agent history steps
- `{prefix}_agent_history_timeline_events`: Stores detailed timeline events for agent operations

The provider also creates appropriate indexes for optimal query performance:

- Indexes on `resource_id` for conversations
- Composite indexes on `(user_id, conversation_id, created_at)` for messages
- Indexes on `agent_id` and `history_id` for history tables

## Features

### Connection Pooling

The provider uses `node-postgres` connection pooling for efficient database connections. This helps manage concurrent requests and improves performance.

### Transaction Support

All database operations are performed within transactions, ensuring data consistency and integrity.

### JSONB Storage

The provider uses PostgreSQL's `JSONB` type for storing metadata and complex objects, enabling efficient querying and indexing of JSON data.

### Automatic Cleanup

When the `storageLimit` is reached for a conversation, older messages are automatically pruned to maintain the specified limit.

### SSL Support

SSL connections can be enabled for secure database communication, especially important for production environments.

## Best Practices

1. **Connection Management:**

   - Use environment variables for database credentials
   - Adjust `maxConnections` based on your application's needs
   - Consider using a connection string for simpler configuration

2. **Performance:**

   - Monitor connection pool usage
   - Adjust `storageLimit` based on your memory requirements
   - Use appropriate indexes for your query patterns

3. **Security:**

   - Enable SSL for production environments
   - Use strong passwords and restrict database access
   - Consider using connection pooling with a service like PgBouncer for high-traffic applications

4. **Monitoring:**
   - Enable `debug` mode during development for detailed logging
   - Monitor database size and performance
   - Set up appropriate database backups

## Use Cases

- **Production Applications:** Enterprise-grade applications requiring robust, scalable database storage
- **Existing PostgreSQL Infrastructure:** Applications already using PostgreSQL for other data
- **Complex Queries:** Scenarios requiring advanced SQL capabilities or complex data relationships
- **High Availability:** Applications requiring database replication and failover capabilities
- **Data Analytics:** Cases where conversation data needs to be analyzed or queried using SQL

## Example: Advanced Usage

```typescript
import { Agent } from "@voltagent/core";
import { PostgresStorage } from "@voltagent/postgres";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Configure with connection pooling and SSL
const memory = new PostgresStorage({
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === "production",
  },
  maxConnections: 20,
  storageLimit: 1000,
  debug: process.env.NODE_ENV !== "production",
});

// Create agent with PostgreSQL memory
const agent = new Agent({
  name: "Enterprise Agent",
  instructions: "A production-ready agent with PostgreSQL memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: memory,
});

// Example: Using the agent with conversation management
async function handleConversation(userId: string, conversationId: string) {
  // Start a new conversation
  await memory.createConversation({
    id: conversationId,
    resourceId: userId,
    title: "Support Session",
    metadata: { priority: "high" },
  });

  // Generate response with memory context
  const response = await agent.generateText("How can I help you?", {
    userId,
    conversationId,
  });

  // Later: Retrieve conversation history
  const messages = await memory.getMessages({
    userId,
    conversationId,
    limit: 50,
  });

  // Clean up when done
  await memory.deleteConversation(conversationId);
}
```

## Troubleshooting

### Common Issues

1. **Connection Errors:**

   - Verify database credentials and connection string
   - Check if the database server is running and accessible
   - Ensure SSL configuration is correct for your environment

2. **Performance Issues:**

   - Monitor connection pool usage
   - Check database indexes
   - Consider increasing `maxConnections` if needed

3. **Memory Growth:**
   - Monitor database size
   - Adjust `storageLimit` if needed
   - Implement periodic cleanup of old conversations

### Debug Mode

Enable debug mode during development to see detailed logging:

```typescript
const memory = new PostgresStorage({
  connection: process.env.DATABASE_URL,
  debug: true,
});
```

This will log all database operations, helping identify issues during development.
